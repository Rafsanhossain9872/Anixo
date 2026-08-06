import { Writable } from 'node:stream';
import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Verify path

// Satisfy Cloudflare's strict nodejs_compat stream requirements
if (Writable && Writable.prototype && typeof Writable.prototype._write !== 'function') {
    Writable.prototype._write = function (chunk, encoding, callback) {
        if (typeof callback === 'function') callback();
    };
}

const handler = serverless(app);

export default {
    async fetch(request, env, ctx) {
        request.env = env; // Pass environment variables securely
        return await handler(request, ctx);
    }
};
