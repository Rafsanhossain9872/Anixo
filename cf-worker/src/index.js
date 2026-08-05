import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js';
import connectDB from '../../backend-core/src/config/db.js';

// Initialize the serverless wrapper
const handler = serverless(app);

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

    // Pass env via context/request extensions allowed by serverless-http, not by mutating standard Request properties.
    ctx.env = env;
    
    return await handler(request, ctx);
  },
};
