import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js';
import connectDB from '../../backend-core/src/config/db.js';

// Initialize the serverless wrapper
const handler = serverless(app);

export default {
  async fetch(request, env, ctx) {
    // 1. Map Cloudflare environment variables to Node's process.env
    // This allows the Express app to seamlessly read secrets like MONGO_URI
    if (!process.env) {
      globalThis.process = { env: {} };
    }
    for (const key in env) {
      process.env[key] = env[key];
    }

    // 2. Ensure database is connected before processing the request
    // connectDB handles connection caching internally
    await connectDB();

    // 3. Pass the standard Web Request into the serverless wrapper
    return handler(request, ctx);
  },
};
