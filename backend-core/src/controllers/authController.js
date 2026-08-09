import User from '../models/User.js';
import mongoose from 'mongoose';
import Progress from '../models/Progress.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

import crypto from 'crypto';
import process from 'node:process';
import sendEmail from '../utils/sendEmail.js';
import bcrypt from 'bcryptjs';

// Data API Removed for Standard Mongoose Driver

// Helper function to update user in online server
const updateUserInOnlineServer = async (userData) => {
  try {
    const onlineServerUrl = process.env.ONLINE_SERVER_URL || 'http://localhost:7861';
    await axios.post(`${onlineServerUrl}/update-user`, userData, {
      timeout: 5000 // Don't wait too long for online server
    });
  } catch (error) {
    // Non-blocking error: just log it, don't fail the main request
    console.error('Failed to update user in online server:', error.message);
  }
};



// Generate JWT Token
const generateToken = (id, env = {}) => {
  const secret = env.JWT_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ id }, secret, {
    expiresIn: '7d',
  });
};

// @desc    Register user
export const register = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    if (username) {
      username = username.trim();
    }

    if (!username || !email || !password) {
      res.status(400);
      throw new Error('Please add all fields');
    }

    // Enforce Gmail only
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      res.status(400);
      throw new Error('Only @gmail.com accounts are allowed to register.');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('User with this email already exists');
    }

    // Create new user
    const profileId = crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
      username,
      profileId,
      email,
      password: hashedPassword,
      role: 'user',
      avatar: '',
      displayName: username,
      lastActive: new Date()
    };

    const createdUser = await User.create(newUser);
    if (createdUser) {
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token: generateToken(createdUser._id, req.env),
        user: {
          id: createdUser._id,
          username: createdUser.username,
          profileId: createdUser.profileId,
          email: createdUser.email,
          role: createdUser.role,
          avatar: createdUser.avatar,
          displayName: createdUser.displayName
        }
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please add email and password');
    }

    // Check for user email
    let user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      user.lastActive = new Date();

      // Generate profileId if it's missing
      if (!user.profileId) {
        let generatedId;
        let isUnique = false;
        while (!isUnique) {
          generatedId = crypto.randomBytes(4).toString('hex');
          const checkId = await User.findOne({ profileId: generatedId });
          isUnique = !checkId;
        }
        user.profileId = generatedId;
      }

      await user.save();

      res.json({
        success: true,
        message: 'Login successful',
        token: generateToken(user._id, req.env),
        user: {
          id: user._id,
          username: user.username,
          profileId: user.profileId,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          displayName: user.displayName
        },
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    // Preserve any status code already set (e.g., 401 for invalid credentials)
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

// @desc    Login/Register with Google
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Google token is missing' });
    }

    const clientId = req.env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ success: false, message: 'Google Client ID not configured on server' });
    }

    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    
    if (!googleResponse.ok) {
        return res.status(400).json({ success: false, message: 'Invalid Google token' });
    }

    const payload = await googleResponse.json();
    
    const validAuds = [req.env?.VITE_GOOGLE_CLIENT_ID, req.env?.GOOGLE_CLIENT_ID, process.env.VITE_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_ID].filter(Boolean);
    if (!validAuds.includes(payload.aud)) {
        return res.status(401).json({ success: false, message: 'Token audience mismatch' });
    }

    const { email, name, picture, sub } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      const generatedPassword = crypto.randomBytes(16).toString('hex');
      const profileId = crypto.randomBytes(4).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(generatedPassword, salt);

      const baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      let username = baseUsername;
      let counter = 1;

      while (true) {
        const checkUsername = await User.findOne({ username });
        if (checkUsername) {
          username = `${baseUsername}${counter}`;
          counter++;
        } else {
          break;
        }
      }

      user = await User.create({
        username,
        profileId,
        email,
        password: hashedPassword,
        displayName: name || username,
        avatar: picture || '',
        role: 'user',
        lastActive: new Date()
      });
    } else {
      user.lastActive = new Date();
      
      if (!user.avatar && picture) {
        user.avatar = picture;
      }

      if (!user.profileId) {
        let generatedId;
        let isUnique = false;
        while (!isUnique) {
          generatedId = crypto.randomBytes(4).toString('hex');
          const checkId = await User.findOne({ profileId: generatedId });
          isUnique = !checkId;
        }
        user.profileId = generatedId;
      }

      await user.save();
    }

    res.json({
      success: true,
      message: 'Google Login successful',
      token: generateToken(user._id, req.env),
      user: {
        id: user._id,
        username: user.username,
        profileId: user.profileId,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        displayName: user.displayName
      }
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
export const getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user.id).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Generate profileId if it's missing
    if (!user.profileId) {
      let generatedId;
      let isUnique = false;
      while (!isUnique) {
        generatedId = crypto.randomBytes(4).toString('hex');
        const existing = await User.findOne({ profileId: generatedId });
        isUnique = !existing;
      }
      user.profileId = generatedId;
      await user.save();
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update current user profile and/or password
export const updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    let usernameChanged = false;
    let avatarChanged = false;
    let displayNameChanged = false;
    const oldUsername = user.username;
    // Username editing is disabled for security/identity reasons
    // if (req.body.username && req.body.username !== user.username) {
    //   ...
    // }

    if (req.body.email) user.email = req.body.email;
    if (req.body.displayName && req.body.displayName !== user.displayName) {
      user.displayName = req.body.displayName;
      displayNameChanged = true;
    }
    if (req.body.avatar && req.body.avatar !== user.avatar) {
      user.avatar = req.body.avatar;
      avatarChanged = true;
    }

    if (req.body.password) {
      if (!req.body.currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to change password' });
      }
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      user.password = req.body.password;
    }

    await user.save();

    // Sync denormalized data in comments collection
    if (usernameChanged || avatarChanged || displayNameChanged) {
      try {
        await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'user.username': oldUsername },
          { $set: { 'user.username': user.username, 'user.avatar': user.avatar, 'user.displayName': user.displayName } }
        );

        await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'replies.user.username': oldUsername },
          { $set: { 'replies.$[elem].user.username': user.username, 'replies.$[elem].user.avatar': user.avatar, 'replies.$[elem].user.displayName': user.displayName } },
          { arrayFilters: [{ 'elem.user.username': oldUsername }] }
        );

        // Sync Global Live Chat messages
        await mongoose.connection.db.collection('globalchats').updateMany(
          { userId: String(user._id) },
          { $set: { username: user.username, avatar: user.avatar, displayName: user.displayName } }
        );
      } catch (updateErr) {
        console.error("Failed to sync profile updates to other collections:", updateErr);
      }
    }

    // Update user in online server (non-blocking)
    updateUserInOnlineServer({
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      profileId: user.profileId
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password - Generate Token
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Create reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (1 hour)
    user.resetPasswordExpire = Date.now() + 3600000;

    await user.save();

    // Create reset URL
    // Strict frontend URL resolution to prevent Password Reset Poisoning (Host Header Injection)
    const frontendUrl = process.env.FRONTEND_URL || 'https://tenzora.top';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a put request to: \n\n ${resetUrl}`;

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #0d0d0d;
            border: 1px solid #1a1a1a;
            border-radius: 24px;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
          }
          .header {
            padding: 40px 20px;
            text-align: center;
            background: linear-gradient(to bottom, #1a1a1a, #0d0d0d);
          }
          .logo {
            font-size: 32px;
            font-weight: 900;
            letter-spacing: -1px;
            color: #ffffff;
            text-decoration: none;
          }
          .header {
            padding: 20px 20px 0 20px;
            text-align: center;
          }
          .content {
            padding: 20px 40px 40px 40px;
            text-align: center;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            color: #fff;
            margin: 0 0 15px 0;
            text-align: center;
          }
          .message {
            color: #888;
            font-size: 15px;
            margin-bottom: 25px;
            text-align: center;
          }
          .btn-container {
            text-align: center;
            margin: 40px 0;
          }
          .btn {
            background-color: #E50914;
            color: #ffffff !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 500;
            font-size: 13px;
            letter-spacing: 0.5px;
            display: inline-block;
          }
          .footer {
            padding: 30px;
            background-color: #080808;
            text-align: center;
            border-top: 1px solid #1a1a1a;
          }
          .security-note {
            font-size: 12px;
            color: #444;
            margin-bottom: 20px;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
          }
          .copyright {
            font-size: 11px;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
        </style>
      </head>
      <body style="background-color: #050505; padding: 40px 20px;">
        <div class="email-container">
          <div class="header">
            <img 
              src="${frontendUrl.includes('localhost') ? (process.env.SITE_URL || 'https://tenzora.top') : frontendUrl}/logo.png" 
              alt="TenZora" 
              height="150" 
              style="display: block; height: 150px; width: auto; margin: 0 auto;"
            >
          </div>
          <div class="content">
            <h1 class="title">Password Recovery</h1>
            <p class="message">
              We received a request to reset the password for your TenZora account. 
              If this was you, click the button below to choose a new password.
            </p>
            <div class="btn-container">
              <a href="REPLACE_WITH_RESET_URL" class="btn">Reset Password</a>
            </div>
            <p style="text-align: center; font-size: 13px; color: #555;">
              This link will expire in 60 minutes for security reasons.
            </p>
          </div>
          <div class="footer">
            <p class="security-note">
              If you did not request this email, please ignore it or contact support if you have concerns. 
              Never share this link with anyone.
            </p>
            <p class="copyright">&copy; 2026 TENZORA.ONLINE &bull; PREMIUM STREAMING</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const html = htmlTemplate.replace('REPLACE_WITH_RESET_URL', encodeURI(resetUrl));

    try {
      await sendEmail({
        email: user.email,
        subject: 'TenZora - Password Reset Request',
        message,
        html
      });

      res.json({
        success: true,
        message: 'Email sent successfully! Please check your inbox.'
      });
    } catch (err) {
      console.error("EMAIL SEND ERROR:", err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password - Verify Token & Update
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Connect AniList Account (Redirect)
export const connectAnilist = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(401).send('Unauthorized: No token provided');

    // Verify TenZora Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const clientId = process.env.ANILIST_CLIENT_ID;
    const redirectUri = process.env.ANILIST_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).send('Server Error: AniList configuration missing in environment variables');
    }

    // Redirect to AniList with userId as 'state'
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${userId}`;

    res.redirect(authUrl);
  } catch (error) {
    console.error("CONNECT ANILIST ERROR:", error);
    res.status(500).send('Authentication failed');
  }
};

// @desc    AniList Callback (Receive Code)
export const anilistCallback = async (req, res) => {
  const { code, state: userId } = req.query;
  const clientId = process.env.ANILIST_CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET;
  const redirectUri = process.env.ANILIST_REDIRECT_URI;

  const frontendUrl = process.env.FRONTEND_URL || 'https://tenzora.top';

  if (!code || !userId) {
    return res.redirect(`${frontendUrl}/settings?error=anilist_auth_failed`);
  }

  try {
    // 1. Exchange code for token
    const tokenResponse = await axios.post('https://anilist.co/api/v2/oauth/token', {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });


    const { access_token } = tokenResponse.data;

    // 2. Get AniList user info
    const userResponse = await axios.post('https://graphql.anilist.co', {
      query: `
        query {
          Viewer {
            id
            name
            avatar {
              large
            }
          }
        }
      `
    }, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }
    });

    const anilistUser = userResponse.data.data.Viewer;

    // 3. Get old user to sync comments if avatar changes
    const oldUser = await User.findById(userId);
    const newAvatar = anilistUser.avatar?.large || undefined;

    await User.findByIdAndUpdate(userId, {
      avatar: newAvatar,
      anilist: {
        id: anilistUser.id,
        username: anilistUser.name,
        accessToken: access_token
      }
    });

    // Get updated user data
    const updatedUser = await User.findById(userId);

    if (oldUser && (newAvatar || updatedUser.displayName)) {
      try {
        await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'user.username': oldUser.username },
          { $set: { 'user.avatar': newAvatar || oldUser.avatar, 'user.displayName': updatedUser.displayName || oldUser.displayName } }
        );
        await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'replies.user.username': oldUser.username },
          { $set: { 'replies.$[elem].user.avatar': newAvatar || oldUser.avatar, 'replies.$[elem].user.displayName': updatedUser.displayName || oldUser.displayName } },
          { arrayFilters: [{ 'elem.user.username': oldUser.username }] }
        );
      } catch (err) {
        console.error("Failed to sync comments avatar on AniList connect:", err);
      }
    }





    // Update user in online server (non-blocking)
    updateUserInOnlineServer({
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      avatar: newAvatar || updatedUser.avatar,
      profileId: updatedUser.profileId
    });

    // 4. Redirect back to frontend
    res.redirect(`${frontendUrl}/settings?success=anilist_connected`);
  } catch (error) {
    console.error("ANILIST CALLBACK ERROR:", error.response?.data || error.message);
    res.redirect(`${frontendUrl}/settings?error=anilist_exchange_failed`);
  }
};

// @desc    Disconnect AniList Account
export const disconnectAnilist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.anilist = undefined;
    await user.save();

    res.json({ success: true, message: 'AniList disconnected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync AniList Library (Import Watching list)
export const syncAnilistLibrary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.anilist?.accessToken) {
      return res.status(400).json({ success: false, message: 'AniList account not connected' });
    }

    // 1. Fetch ALL lists from AniList
    const response = await axios.post('https://graphql.anilist.co', {
      query: `
        query ($userId: Int) {
          MediaListCollection (userId: $userId, type: ANIME) {
            lists {
              status
              entries {
                status
                progress
                score (format: POINT_10)
                media {
                  id
                  title {
                    english
                    romaji
                    native
                  }
                  coverImage {
                    extraLarge
                    large
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        userId: parseInt(user.anilist.id)
      }
    }, {
      headers: {
        Authorization: `Bearer ${user.anilist.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    if (!response.data?.data?.MediaListCollection) {
      return res.json({ success: true, message: 'No library found on AniList.', count: 0 });
    }

    const lists = response.data.data.MediaListCollection.lists;
    let syncedProgressCount = 0;
    let syncedWatchlistCount = 0;

    // Status Mapping Helper
    const mapStatus = (anilistStatus) => {
      switch (anilistStatus) {
        case 'CURRENT': return 'Watching';
        case 'PLANNING': return 'Planning';
        case 'COMPLETED': return 'Completed';
        case 'DROPPED': return 'Dropped';
        case 'PAUSED': return 'Paused';
        case 'REWATCHING': return 'Watching';
        default: return 'Planning';
      }
    };

    // 2. Process each entry
    for (const list of lists) {
      for (const entry of list.entries) {
        const { media, progress, score, status: anilistStatus } = entry;
        const animeId = String(media.id);
        const title = media.title.english || media.title.romaji || media.title.native;
        const coverImage = media.coverImage.extraLarge || media.coverImage.large;
        const localStatus = mapStatus(anilistStatus);

        try {
          // A. If CURRENT/REWATCHING, sync to Progress (Continue Watching)
          if (anilistStatus === 'CURRENT' || anilistStatus === 'REWATCHING') {
            await Progress.findOneAndUpdate(
              { user: user._id, animeId },
              {
                episode: progress || 1,
                currentTime: 0,
                duration: 0,
                title,
                coverImage,
                updatedAt: Date.now()
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            syncedProgressCount++;
          }

          // B. Sync to User Watchlist (Bookmarks)
          const existingIdx = user.watchlist.findIndex(w => w.animeId === animeId);
          const watchlistItem = {
            animeId,
            title,
            coverImage,
            status: localStatus,
            progress: progress || 0,
            score: score || 0,
            addedAt: Date.now()
          };

          if (existingIdx > -1) {
            const existing = user.watchlist[existingIdx];
            existing.status = localStatus;
            existing.progress = progress || 0;
            existing.score = score || 0;
            existing.coverImage = coverImage;
            existing.title = title;
          } else {
            user.watchlist.push(watchlistItem);
          }
          syncedWatchlistCount++;

        } catch (err) {
          console.error(`[Sync] Error processing anime ${animeId}:`, err.message);
        }
      }
    }

    await user.save();

    res.json({
      success: true,
      message: `Sync Complete! Imported ${syncedWatchlistCount} items into your Watchlist and ${syncedProgressCount} into Continue Watching.`,
      watchlistCount: syncedWatchlistCount,
      progressCount: syncedProgressCount
    });

  } catch (error) {
    console.error("SYNC ANILIST ERROR:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.errors?.[0]?.message || 'Failed to sync with AniList'
    });
  }
};
