import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js';
import connectDB from '../../backend-core/src/config/db.js';

// Initialize the serverless wrapper
// Safely inject env into the Express req object without mutating the native Cloudflare Request
const handler = serverless(app, {
  request(req, event, context) {
    req.env = context.env;
  }
});

export default {
  async fetch(request, env, ctx) {
    // Immediate bypass for OPTIONS preflight requests to avoid native Request body mutation by serverless-http
    if (request.method === 'OPTIONS') {
       const requestedHeaders = request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With, Accept, x-api';
       
       return new Response(null, {
           status: 200,
           headers: {
               'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
               'Access-Control-Allow-Headers': requestedHeaders,
               'Access-Control-Allow-Credentials': 'true',
               'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours to reduce latency
           }
       });
    }

    // Pass env safely via the serverless-http context
    ctx.env = env;
    
    // Wrap the native Cloudflare Request in a Proxy.
    // This prevents serverless-http's internal `cleanupEvent` from crashing the isolate
    // when it attempts to illegally assign `event.body = null` (or similar) on completion.
    const safeRequest = new Proxy(request, {
      set(target, prop, value) {
        return true; // Silently discard all illegal assignments
      },
      get(target, prop) {
        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });

    return await handler(safeRequest, ctx);
  },
};
