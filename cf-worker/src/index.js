import serverless from 'serverless-http';
import app from '../../backend-core/src/app.js'; // Adjust path if necessary!
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- THE V8 PROTOTYPE PATCH ---
const wrappedApp = (req, res) => {
    const proto = Object.getPrototypeOf(res);
    if (proto && !proto.hasOwnProperty('_write')) {
        proto._write = function(chunk, encoding, cb) {
            if (typeof cb === 'function') cb();
        };
    }
    if (proto && !proto.hasOwnProperty('_writev')) {
        proto._writev = function(chunks, cb) {
            if (typeof cb === 'function') cb();
        };
    }
    return app(req, res);
};

const handler = serverless(wrappedApp);

// Native Data API Helper
const dataApiRequest = async (action, env, body) => {
  const response = await fetch(`${env.ATLAS_API_ENDPOINT}/action/${action}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Headers': '*',
        'api-key': env.ATLAS_API_KEY
    },
    body: JSON.stringify({
        dataSource: "Cluster0",
        database: env.ATLAS_DATABASE || "anixo",
        collection: "users",
        ...body
    })
  });
  if (!response.ok) {
     const text = await response.text();
     throw new Error(`Data API Error: ${response.statusText} - ${text}`);
  }
  return response.json();
};

const generateToken = (id, env) => {
  return jwt.sign({ id }, env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-api, Accept, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
        };

        // 1. Perfect CORS Preflight Bypass
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: corsHeaders
            });
        }

        // 2. NATIVE ROUTE: Google Auth Bypass
        // Intercepts the Google auth route natively to permanently avoid serverless-http stream crashes
        if ((url.pathname === '/auth/google' || url.pathname === '/api/auth/google') && request.method === 'POST') {
            try {
                const body = await request.json();
                const token = body.token;

                if (!token) {
                    return new Response(JSON.stringify({ success: false, message: 'Google token is missing' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const clientId = env.GOOGLE_CLIENT_ID;
                if (!clientId) {
                    return new Response(JSON.stringify({ success: false, message: 'Google Client ID not configured on server' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
                if (!googleResponse.ok) {
                    return new Response(JSON.stringify({ success: false, message: 'Invalid Google token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const payload = await googleResponse.json();
                
                if (payload.aud !== env.VITE_GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
                    return new Response(JSON.stringify({ success: false, message: 'Token audience mismatch' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }

                const { email, name, picture } = payload;
                const findRes = await dataApiRequest('findOne', env, { filter: { email } });
                let user = findRes.document;

                const now = { $date: new Date().toISOString() };

                if (!user) {
                    const generatedPassword = crypto.randomBytes(16).toString('hex');
                    const profileId = crypto.randomBytes(4).toString('hex');
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

                    const baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                    let username = baseUsername;
                    let counter = 1;

                    while (true) {
                        const checkUsername = await dataApiRequest('findOne', env, { filter: { username } });
                        if (checkUsername.document) {
                            username = `${baseUsername}${counter}`;
                            counter++;
                        } else {
                            break;
                        }
                    }

                    user = {
                        username,
                        profileId,
                        email,
                        password: hashedPassword,
                        displayName: name || username,
                        avatar: picture || '',
                        role: 'user',
                        lastActive: now,
                        createdAt: now,
                        updatedAt: now
                    };

                    const insertRes = await dataApiRequest('insertOne', env, { document: user });
                    user._id = insertRes.insertedId;
                } else {
                    let updates = { lastActive: now };
                    
                    if (!user.avatar && picture) {
                        updates.avatar = picture;
                        user.avatar = picture;
                    }

                    if (!user.profileId) {
                        let generatedId;
                        let isUnique = false;
                        while (!isUnique) {
                            generatedId = crypto.randomBytes(4).toString('hex');
                            const checkId = await dataApiRequest('findOne', env, { filter: { profileId: generatedId } });
                            isUnique = !checkId.document;
                        }
                        updates.profileId = generatedId;
                        user.profileId = generatedId;
                    }

                    await dataApiRequest('updateOne', env, { 
                        filter: { _id: user._id },
                        update: { $set: updates }
                    });
                }

                const finalData = {
                    success: true,
                    message: 'Google Login successful',
                    token: generateToken(user._id, env),
                    user: {
                        id: user._id,
                        username: user.username,
                        profileId: user.profileId,
                        email: user.email,
                        role: user.role,
                        avatar: user.avatar,
                        displayName: user.displayName
                    }
                };

                return new Response(JSON.stringify(finalData), { 
                    status: 200, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });

            } catch (error) {
                console.error("NATIVE GOOGLE LOGIN ERROR:", error);
                return new Response(JSON.stringify({ success: false, message: error.message }), { 
                    status: 500, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
            }
        }

        // 3. The Proxy Shield (Fixes 'elb' and 'sourceIp' crashes)
        const proxiedRequest = new Proxy(request, {
            get(target, prop) {
                if (prop === 'requestContext') {
                    return { elb: {}, identity: { sourceIp: target.headers.get('cf-connecting-ip') || '127.0.0.1' } };
                }
                if (prop === 'env') return env;
                
                const value = Reflect.get(target, prop);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set() { return true; } 
        });

        // 4. Execute Express App fallback for all other routes
        return await handler(proxiedRequest, ctx);
    }
};
