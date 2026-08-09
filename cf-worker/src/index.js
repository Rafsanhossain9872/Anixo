/**
 * Anixo Cloudflare Worker — Custom Express Adapter v3
 * 
 * CRITICAL FIX: Cloudflare's nodejs_compat requires _write() on any Writable subclass.
 * http.ServerResponse extends Writable but doesn't implement _write() itself (it delegates
 * to the socket in standard Node). We patch the prototype BEFORE any instance is created.
 */

import http from 'node:http';
import { Readable, PassThrough } from 'node:stream';

// ============================================================
// CRITICAL: Patch _write on ServerResponse prototype IMMEDIATELY
// before Express or any other code creates an instance.
// This is the root cause of the "The _write() method is not implemented" error.
// ============================================================
if (!http.ServerResponse.prototype._write) {
    http.ServerResponse.prototype._write = function(chunk, encoding, callback) {
        // Delegate to the assigned socket's write method if available
        if (this.socket && typeof this.socket.write === 'function') {
            this.socket.write(chunk, encoding, callback);
        } else if (callback) {
            callback();
        }
    };
}

let app;

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get('Origin') || '*';

        // 1. PROCESS.ENV POLYFILL
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        // 2. OPTIONS PREFLIGHT
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
        try {
            const url = new URL(request.url);

            // Build a minimal IncomingMessage
            const socket = new PassThrough();
            socket.remoteAddress = request.headers.get('cf-connecting-ip') || '127.0.0.1';
            socket.encrypted = url.protocol === 'https:';

            const req = new http.IncomingMessage(socket);
            req.method = request.method;
            req.url = url.pathname + url.search;
            req.httpVersion = '1.1';
            req.httpVersionMajor = 1;
            req.httpVersionMinor = 1;
            req.env = env;

            // Copy headers
            for (const [key, value] of request.headers.entries()) {
                req.headers[key.toLowerCase()] = value;
            }

            // Push request body
            if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
                try {
                    const bodyBuffer = await request.arrayBuffer();
                    req.push(Buffer.from(bodyBuffer));
                } catch (e) { /* body empty or consumed */ }
            }
            req.push(null);

            // 5. CREATE RESPONSE COLLECTOR
            const bodyChunks = [];

            const res = new http.ServerResponse(req);

            // Create a writable socket that captures all output
            const outputSocket = new PassThrough();
            outputSocket._writableState = outputSocket._writableState || {};
            outputSocket.writable = true;
            outputSocket.cork = Function.prototype;
            outputSocket.uncork = Function.prototype;

            // Intercept data written to the socket
            outputSocket.on('data', (chunk) => {
                bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            res.assignSocket(outputSocket);
            res.useChunkedEncodingByDefault = false;
            res.chunkedEncoding = false;

            // 6. RUN EXPRESS AND WAIT FOR FINISH
            const result = await new Promise((resolve, reject) => {
                let resolved = false;

                res.on('finish', () => {
                    if (resolved) return;
                    resolved = true;

                    const rawOutput = Buffer.concat(bodyChunks).toString('utf8');

                    // Split HTTP response: headers section + body
                    const headerEndIndex = rawOutput.indexOf('\r\n\r\n');
                    let body = '';
                    if (headerEndIndex !== -1) {
                        body = rawOutput.slice(headerEndIndex + 4);
                    } else {
                        body = rawOutput;
                    }

                    const headers = {};
                    const rawHeaders = typeof res.getHeaders === 'function' ? res.getHeaders() : {};
                    for (const [key, value] of Object.entries(rawHeaders)) {
                        headers[key] = String(value);
                    }

                    resolve({ statusCode: res.statusCode || 200, headers, body });
                });

                res.on('error', (err) => {
                    if (resolved) return;
                    resolved = true;
                    reject(err);
                });

                // Timeout safety net (30 seconds)
                setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    reject(new Error('Express handler timed out after 30s'));
                }, 30000);

                app(req, res);
            });

            // 7. BUILD CLOUDFLARE RESPONSE WITH CORS
            const responseHeaders = new Headers(result.headers);
            responseHeaders.set('Access-Control-Allow-Origin', origin);
            responseHeaders.set('Access-Control-Allow-Credentials', 'true');

            return new Response(result.body, {
                status: result.statusCode,
                headers: responseHeaders
            });

        } catch (error) {
            console.error('[CF Worker] Fatal error:', error);
            return new Response(JSON.stringify({ 
                error: error.message, 
                stack: error.stack 
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Credentials': 'true'
                }
            });
        }
    },

    async scheduled(event, env, ctx) {
        if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
        }
        Object.assign(globalThis.process.env, env);

        try {
            const connectDB = (await import('../../backend-core/src/config/db.js')).default;
            await connectDB(env);

            const { initializeBots, checkAndPost, checkAndReply } = await import('../../backend-core/src/workers/aiBotWorker.js');
            await initializeBots();

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
