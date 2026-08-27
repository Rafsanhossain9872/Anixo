import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
  initAllBots, 
  getAllActiveBots, 
  createBotPost, 
  createBotReply, 
  shouldReplyToPost,
  addRandomBotLikes,
  createBotEpisodeComment
} from '../services/aiBotService.js';
import CommunityPost from '../models/CommunityPost.js';
import CommunityComment from '../models/CommunityComment.js';
import User from '../models/User.js';

dotenv.config();

// Initialize bots (call this before running tasks)
export const initializeBots = async () => {
  try {
    await initAllBots();
  } catch (error) {
    console.error('[AI Bots] Failed to initialize bots:', error);
  }
};

// Check if any bot should post
export const checkAndPost = async () => {
  try {
    const bots = await getAllActiveBots();
    const now = new Date();

    for (const bot of bots) {
      if (!bot.isActive || !bot.configuration.enablePosting) continue;

      const lastPost = bot.lastPostAt;
      const hoursSinceLastPost = lastPost 
        ? (now - new Date(lastPost)) / (1000 * 60 * 60)
        : bot.postFrequency + 1;

      if (hoursSinceLastPost >= bot.postFrequency) {
        console.log(`[AI Bots] ${bot.displayName} is posting...`);
        await createBotPost(bot);
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (error) {
    console.error('[AI Bots] Check and post error:', error);
  }
};

// Check for new posts and have multiple bots reply (for bot-bot interaction!
export const checkAndReply = async () => {
  try {
    const bots = await getAllActiveBots();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Get recent posts
    const recentPosts = await CommunityPost.find({
      createdAt: { $gte: oneDayAgo },
      isDeleted: { $ne: true },
      isLocked: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username displayName profileId avatar role')
      .limit(15);

    // For each recent post
    for (const post of recentPosts) {
      // 30% chance to add random likes to this existing post too!
      if (Math.random() < 0.3 && post.likes.length < 25) {
        await addRandomBotLikes(post._id);
        await new Promise(r => setTimeout(r, 1000));
      }
      // Get existing comments
      const existingComments = await CommunityComment.find({ post: post._id })
        .populate('author', 'username displayName profileId avatar role');
      
      const commentAuthorIds = existingComments.map(c => c.author?._id?.toString()).filter(Boolean);
      const commentAuthors = await User.find({ _id: { $in: commentAuthorIds } });
      const commentUsernames = commentAuthors.map(u => u.username);

      // Random number of replies (3-8) for much more active discussions
      const maxReplies = Math.floor(Math.random() * 6) + 3;
      let repliesThisPost = 0;
      const shuffledBots = [...bots].sort(() => 0.5 - Math.random());
      
      for (const bot of shuffledBots) {
        if (repliesThisPost >= maxReplies) break;
        if (!bot.isActive || !bot.configuration.enableReplying) continue;
        // Don't skip if they've already replied, let shouldReplyToPost handle the logic 
        // to allow them to engage in active discussions on their own posts!
        if (shouldReplyToPost(bot, post, commentUsernames)) {
          try {
            // 70% chance to reply to a comment instead of the post directly. 
            // 100% chance if the bot is the author of the post!
            let parentCommentId = null;
            const isBotPostAuthor = post.author?.username === bot.username;
            
            if (existingComments.length > 0 && (isBotPostAuthor || Math.random() < 0.70)) {
              // Find a comment that is NOT from this bot
              const validComments = existingComments.filter(c => c.author?.username !== bot.username);
              if (validComments.length > 0) {
                const randomComment = validComments[Math.floor(Math.random() * validComments.length)];
                parentCommentId = randomComment._id;
              }
            }
            
            // If it's their own post and no valid comments to reply to, skip.
            if (isBotPostAuthor && !parentCommentId) {
              continue;
            }
            
            await createBotReply(bot, post._id, parentCommentId);
            repliesThisPost++;
            commentUsernames.push(bot.username);
            // Delay between replies for natural conversation and rate limits
            await new Promise(r => setTimeout(r, 6000));
          } catch (err) {
            if (err.status === 429 || err.response?.status === 429) {
              console.warn(`[AI Bots] Rate limit hit (429) for ${bot.displayName}. Skipping for now.`);
            } else {
              console.error(`[AI Bots] ${bot.displayName} reply failed:`, err.message || err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[AI Bots] Check and reply error:', error);
  }
};

// Check and have random bots comment on anime episodes
export const checkAndCommentEpisode = async () => {
  try {
    const bots = await getAllActiveBots();
    if (bots.length === 0) {
      console.log('[AI Bots] No active bots for episode comments');
      return;
    }

    // Pick 1-3 random bots to comment this cycle
    const numComments = Math.floor(Math.random() * 3) + 1;
    const shuffledBots = [...bots].sort(() => 0.5 - Math.random());

    for (let i = 0; i < Math.min(numComments, shuffledBots.length); i++) {
      try {
        await createBotEpisodeComment(shuffledBots[i]);
        // Delay between comments to avoid rate limits
        if (i < numComments - 1) {
          await new Promise(r => setTimeout(r, 4000));
        }
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn(`[AI Bots] Rate limit hit for episode comment. Stopping this cycle.`);
          break;
        }
        console.error(`[AI Bots] Episode comment failed for ${shuffledBots[i].username}:`, err.message);
      }
    }
  } catch (error) {
    console.error('[AI Bots] Check and comment episode error:', error);
  }
};
