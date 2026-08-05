import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js';
import connectDB from '../../backend-core/src/config/db.js';

// Initialize the serverless wrapper
const handler = serverless(app, {
  request(req, event, context) {
    req.env = context.env;
  }
});

export default {
  async fetch(request, env, ctx) {
    // Immediate bypass for OPTIONS preflight requests to avoid native Request body mutation by serverless-http
    if (request.method === 'OPTIONS') {
       return new Response(null, {
           status: 200,
           headers: {
               'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
               'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
               'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
               'Access-Control-Allow-Credentials': 'true'
           }
       });
    }

    // Pass env via context to prevent mutating the immutable native Request object
    ctx.env = env;

    // Pass the standard Web Request into the serverless wrapper
    return handler(request, ctx);
  },
};
