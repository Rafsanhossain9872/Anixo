import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js';
import connectDB from '../../backend-core/src/config/db.js';

// Initialize the serverless wrapper
const handler = serverless(app);

export default {
  async fetch(request, env, ctx) {
    // 1. Inject Cloudflare env directly into the request
    // Express routes can access it via req.env
    request.env = env;

    // 2. Pass the standard Web Request into the serverless wrapper
    return handler(request, ctx);
  },
};
