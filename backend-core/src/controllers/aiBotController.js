import AIBot from '../models/AIBot.js';
import {
  initAllBots,
  createBotPost,
  createBotReply,
  generatePost,
  getAllActiveBots,
  getRandomBot
} from '../services/aiBotService.js';
import { checkAndPost, checkAndReply, checkAndCommentEpisode, initializeBots } from '../workers/aiBotWorker.js';

// Get all bot configs (public)

export const getBotConfig = async (req, res) => {
  try {
    await initAllBots();
    const bots = await getAllActiveBots();
    res.status(200).json({ success: true, bots });
  } catch (error) {
    console.error('[AI Bots] Get config error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update a bot config (admin only)
export const updateBotConfig = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { username } = req.params;
    const updates = req.body;

    const bot = await AIBot.findOne({ username });
    if (!bot) {
      return res.status(404).json({ success: false, message: 'Bot not found' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key === 'configuration') {
        bot.configuration = { ...bot.configuration, ...updates[key] };
      } else if (key !== 'username') {
        bot[key] = updates[key];
      }
    });

    await bot.save();
    res.status(200).json({ success: true, bot });
  } catch (error) {
    console.error('[AI Bots] Update config error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manual trigger a random bot to post
export const manualCreatePost = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const bot = await getRandomBot();
    if (!bot) {
      return res.status(500).json({ success: false, message: 'No active bots' });
    }

    const post = await createBotPost(bot);
    res.status(200).json({ success: true, post });
  } catch (error) {
    console.error('[AI Bots] Manual post error:', error);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
};

// Manual trigger a random bot to reply
export const manualCreateReply = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { postId } = req.params;
    const bot = await getRandomBot();
    if (!bot) {
      return res.status(500).json({ success: false, message: 'No active bots' });
    }

    const comment = await createBotReply(bot, postId);
    res.status(200).json({ success: true, comment });
  } catch (error) {
    console.error('[AI Bots] Manual reply error:', error);
    res.status(500).json({ success: false, message: 'Failed to create reply' });
  }
};

// Test post generation with random bot
export const testPostGeneration = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const bot = await getRandomBot();
    const postData = await generatePost(bot);
    res.status(200).json({ success: true, postData, bot: bot.username });
  } catch (error) {
    console.error('[AI Bots] Test post error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate test post' });
  }
};

// ══════════════════════════════════════════════════════════
// CRON ENDPOINTS — Called by Cloudflare Worker scheduled()
// ══════════════════════════════════════════════════════════

// Cron: Check all bots and create posts if due
export const cronPost = async (req, res) => {
  const startTime = Date.now();
  try {
    // Verify Groq API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('[AI Bots CRON] ❌ GROQ_API_KEY is not set! Bots cannot generate content.');
      return res.status(500).json({ 
        success: false, 
        message: 'Groq API Key not configured — bot posting disabled' 
      });
    }

    await initializeBots();
    await checkAndPost();

    const elapsed = Date.now() - startTime;
    console.log(`[AI Bots CRON] ✅ Post cycle completed in ${elapsed}ms`);
    res.status(200).json({ success: true, message: 'Post cycle completed', elapsed });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    // Diagnostic logging
    if (error.response?.status === 401) {
      console.error('[AI Bots CRON] ❌ Groq API Key expired or invalid (401)');
    } else if (error.response?.status === 429) {
      console.error('[AI Bots CRON] ⚠️ Groq rate limit hit (429). Will retry next cycle.');
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      console.error('[AI Bots CRON] ❌ MongoDB connection failed:', error.message);
    } else {
      console.error('[AI Bots CRON] ❌ Post cycle failed:', error.message || error);
    }
    res.status(500).json({ success: false, message: 'Post cycle failed', error: error.message, elapsed });
  }
};

// Cron: Check recent posts and have bots reply
export const cronReply = async (req, res) => {
  const startTime = Date.now();
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('[AI Bots CRON] ❌ GROQ_API_KEY is not set! Bots cannot generate replies.');
      return res.status(500).json({ 
        success: false, 
        message: 'Groq API Key not configured — bot replying disabled' 
      });
    }

    await initializeBots();
    await checkAndReply();

    const elapsed = Date.now() - startTime;
    console.log(`[AI Bots CRON] ✅ Reply cycle completed in ${elapsed}ms`);
    res.status(200).json({ success: true, message: 'Reply cycle completed', elapsed });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    if (error.response?.status === 401) {
      console.error('[AI Bots CRON] ❌ Groq API Key expired or invalid (401)');
    } else if (error.response?.status === 429) {
      console.error('[AI Bots CRON] ⚠️ Groq rate limit hit (429). Will retry next cycle.');
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      console.error('[AI Bots CRON] ❌ MongoDB connection failed:', error.message);
    } else {
      console.error('[AI Bots CRON] ❌ Reply cycle failed:', error.message || error);
    }
    res.status(500).json({ success: false, message: 'Reply cycle failed', error: error.message, elapsed });
  }
};

// Cron: Have bots comment on anime episodes
export const cronEpisodeComment = async (req, res) => {
  const startTime = Date.now();
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error('[AI Bots CRON] ❌ GROQ_API_KEY is not set! Episode commenting disabled.');
      return res.status(500).json({ 
        success: false, 
        message: 'Groq API Key not configured — episode commenting disabled' 
      });
    }

    await initializeBots();
    await checkAndCommentEpisode();

    const elapsed = Date.now() - startTime;
    console.log(`[AI Bots CRON] ✅ Episode comment cycle completed in ${elapsed}ms`);
    res.status(200).json({ success: true, message: 'Episode comment cycle completed', elapsed });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    if (error.response?.status === 401) {
      console.error('[AI Bots CRON] ❌ Groq API Key expired or invalid (401)');
    } else if (error.response?.status === 429) {
      console.error('[AI Bots CRON] ⚠️ Groq rate limit hit (429). Will retry next cycle.');
    } else {
      console.error('[AI Bots CRON] ❌ Episode comment cycle failed:', error.message || error);
    }
    res.status(500).json({ success: false, message: 'Episode comment cycle failed', error: error.message, elapsed });
  }
};
