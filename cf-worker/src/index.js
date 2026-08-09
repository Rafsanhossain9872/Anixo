/**
 * Anixo Cloudflare Worker — Custom Express Adapter
 * 
 * Replaces `serverless-http` entirely because its ServerlessResponse class
 * extends http.ServerResponse which requires _write() in CF's V8 isolate,
 * causing a fatal crash on every request.
 * 
 * This adapter manually bridges Cloudflare Request → Express → Cloudflare Response
 * using only node:http and node:stream primitives that CF's nodejs_compat supports.
 */

import { Readable } from 'node:stream';
import http from 'node:http';

let app;

/**
 * Convert a Cloudflare Worker Request into a Node.js http.IncomingMessage
 * that Express can understand.
 */
function createIncomingMessage(cfRequest, env) {
    const url = new URL(cfRequest.url);

    // Build a minimal socket-like object
    const socket = new Readable({ read() {} });
    socket.remoteAddress = cfRequest.headers.get('cf-connecting-ip') || '127.0.0.1';
    socket.encrypted = url.protocol === 'https:';

    // Create the IncomingMessage
    const req = new http.IncomingMessage(socket);
    req.method = cfRequest.method;
    req.url = url.pathname + url.search;
    req.httpVersion = '1.1';
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;

    // Copy all headers from the CF request
    for (const [key, value] of cfRequest.headers.entries()) {
        req.headers[key.toLowerCase()] = value;
    }

    // Attach the env bindings so Express middleware can access secrets
    req.env = env;

    return req;
}

/**
 * Feed the request body (if any) into the IncomingMessage stream.
 */
async function pipeBody(cfRequest, incomingMessage) {
    if (cfRequest.method === 'GET' || cfRequest.method === 'HEAD' || !cfRequest.body) {
        incomingMessage.push(null); // Signal end-of-stream
        return;
    }

    try {
        const bodyBuffer = await cfRequest.arrayBuffer();
        incomingMessage.push(Buffer.from(bodyBuffer));
    } catch (e) {
        // Body may already be consumed or empty
    }
    incomingMessage.push(null); // Signal end-of-stream
}

/**
 * Run the Express app and collect the full response.
 * Returns { statusCode, headers, body }
 */
function runExpressApp(expressApp, incomingMessage) {
    return new Promise((resolve, reject) => {
        const chunks = [];

        // Create a real ServerResponse but override the socket's write behavior
        // to collect output into our buffer instead of trying to write to a network socket.
        const res = new http.ServerResponse(incomingMessage);

        // Create a fake socket that collects written data
        const fakeSocket = new Readable({ read() {} });
        fakeSocket._writableState = {};
        fakeSocket.writable = true;
        fakeSocket.on = fakeSocket.on || Function.prototype;
        fakeSocket.removeListener = fakeSocket.removeListener || Function.prototype;
        fakeSocket.destroy = fakeSocket.destroy || Function.prototype;
        fakeSocket.cork = Function.prototype;
        fakeSocket.uncork = Function.prototype;
        fakeSocket.write = (data, encoding, cb) => {
            if (typeof encoding === 'function') {
                cb = encoding;
                encoding = null;
            }
            if (data) {
                chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
            }
            if (typeof cb === 'function') cb();
            return true;
        };

        res.assignSocket(fakeSocket);
        res.useChunkedEncodingByDefault = false;
        res.chunkedEncoding = false;

        res.on('finish', () => {
            // Parse the collected chunks to extract the body
            // The chunks contain the full HTTP response including headers written by Node
            const fullOutput = Buffer.concat(chunks).toString();

            // Find where headers end and body begins
            const headerEnd = fullOutput.indexOf('\r\n\r\n');
            let body = '';
            if (headerEnd !== -1) {
                body = fullOutput.slice(headerEnd + 4);
            } else {
                body = fullOutput;
            }

            // Collect headers from the ServerResponse
            const headers = {};
            const rawHeaders = typeof res.getHeaders === 'function' ? res.getHeaders() : {};
            for (const [key, value] of Object.entries(rawHeaders)) {
                headers[key] = String(value);
            }

            resolve({
                statusCode: res.statusCode || 200,
                headers,
                body
            });
        });

        res.on('error', reject);

        // Let Express handle the request
        try {
            expressApp(incomingMessage, res);
        } catch (err) {
            reject(err);
        }
    });
}

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '*';

        // 1. PROCESS.ENV POLYFILL — inject CF secrets into process.env
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        // 2. OPTIONS PREFLIGHT — handle CORS preflight immediately
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                }
            });
        }

        // 3. LAZY LOAD EXPRESS APP
        if (!app) {
            const appModule = await import('../../backend-core/src/app.js');
            app = appModule.default || appModule;
        }

        // 4. CONVERT CF REQUEST → NODE.JS REQUEST
        const incomingMessage = createIncomingMessage(request, env);
        await pipeBody(request, incomingMessage);

        // 5. RUN EXPRESS & COLLECT RESPONSE
        try {
            const result = await runExpressApp(app, incomingMessage);

            const responseHeaders = new Headers(result.headers);
            responseHeaders.set('Access-Control-Allow-Origin', origin);
            responseHeaders.set('Access-Control-Allow-Credentials', 'true');

            return new Response(result.body, {
                status: result.statusCode,
                headers: responseHeaders
            });
        } catch (error) {
            console.error('[CF Worker] Express execution failed:', error);
            return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin
                }
            });
        }
    },

    async scheduled(event, env, ctx) {
        // 1. PROCESS.ENV POLYFILL
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        try {
            // 2. CONNECT DB
            const connectDB = (await import('../../backend-core/src/config/db.js')).default;
            await connectDB(env);

            // 3. LOAD WORKER
            const { initializeBots, checkAndPost, checkAndReply } = await import('../../backend-core/src/workers/aiBotWorker.js');
            await initializeBots();

            // 4. ROUTE CRON
            if (event.cron === "*/30 * * * *") {
                console.log('Running 30m cron: checkAndPost');
                await checkAndPost();
            } else if (event.cron === "*/10 * * * *") {
                console.log('Running 10m cron: checkAndReply');
                await checkAndReply();
            } else {
                console.log(`Unknown cron trigger: ${event.cron}`);
            }
        } catch (error) {
            console.error('Scheduled event failed:', error);
        }
    }
};
