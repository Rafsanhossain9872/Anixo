import axios from 'axios';
import mongoose from 'mongoose';
import AIBot from '../models/AIBot.js';
import User from '../models/User.js';
import CommunityPost from '../models/CommunityPost.js';
import CommunityComment from '../models/CommunityComment.js';
import { BOT_PROFILES } from '../data/botProfiles.js';

// Persona prompts for the bot
const PERSONAS = {
  friendly: "You are a friendly, caring, and highly supportive anime enthusiast who loves discussing anime. You act as a regular community member - helpful, kind, and always excited about anime! Be natural, conversational, and passionate about anime!",
  tsundere: "You are exactly like Hitagi Senjougahara from Monogatari series. Sharp, blunt, with hidden affection underneath a prickly exterior, but loyal to the community. You often deny caring but then show you do.",
  hype: "You are a HYPE-BRO anime fanatic! INSANE ENERGY, hype up every post, use slang like 'bro', 'peak fiction', 'absolute fire', 'goat', 'sheesh', 'LETS GOOOO!' in your responses."
};

// Allowed categories and tags based on the frontend configuration
const ALLOWED_CATEGORIES = ['general', 'anime', 'feedback', 'question', 'news', 'poll'];
const RECOMMENDED_TAGS = ["recommendation", "discussion", "spoilers", "theory", "review", "meme", "fanart", "amv", "news", "help", "question"];

// Topic ideas for automatic posts
const TOPIC_IDEAS = [
  { category: 'anime', prompt: 'Share an anime recommendation post' },
  { category: 'question', prompt: 'Ask an interesting anime discussion question' },
  { category: 'general', prompt: 'Share a hot take or controversial opinion about anime' },
  { category: 'anime', prompt: 'Share an interesting anime fact or trivia' },
  { category: 'question', prompt: 'Ask the community about their favorite anime moments' },
  { category: 'general', prompt: 'Share a funny or relatable anime meme topic' },
  { category: 'anime', prompt: 'Share an interesting anime theory or speculation' },
  { category: 'news', prompt: 'Share a fake or real hype news about an upcoming anime season' },
  { category: 'news', prompt: 'Share a rumor about a highly anticipated anime adaptation' },
  { category: 'news', prompt: 'Announce a fake breaking news about a famous manga author' },
  { category: 'news', prompt: 'Discuss a recent controversial anime news or announcement' },
  { category: 'news', prompt: 'Share news about a new anime movie coming out soon' },
  { category: 'news', prompt: 'Report on a voice actor casting for a popular upcoming show' },
  { category: 'news', prompt: 'Post an exciting update about a manga finally getting an anime adaptation' },
  { category: 'feedback', prompt: 'Share feedback about the community or website features' },
  { category: 'feedback', prompt: 'Suggest a new feature for this anime community' },
  { category: 'feedback', prompt: 'Praise the community for being so welcoming and active' },
  { category: 'feedback', prompt: 'Ask the admins for a dark mode or specific UI improvement' },
  { category: 'feedback', prompt: 'Share your experience using the site and what you love about it' },
  { category: 'feedback', prompt: 'Suggest some new categories or tags that should be added to the forum' },
  { category: 'poll', prompt: 'Create an engaging text-based poll asking people to choose their favorite anime trope' },
  { category: 'poll', prompt: 'Create a poll asking about the best anime opening song of the year' },
  { category: 'poll', prompt: 'Create a poll asking people to choose between subs and dubs' },
  { category: 'poll', prompt: 'Make a poll comparing two very popular shounen protagonists' },
  { category: 'poll', prompt: 'Create a poll asking people what their favorite genre is' },
  { category: 'poll', prompt: 'Ask people to vote on the best anime studio right now (Mappa, Ufotable, Bones, etc)' },
  { category: 'poll', prompt: 'Make a poll asking if people prefer reading manga or watching anime' },
  { category: 'general', prompt: 'Share a heartfelt story about how anime changed your life' },
  { category: 'question', prompt: 'Ask what everyone is currently watching this season' }
];

// Initialize all bots in database
export const initAllBots = async () => {
  // Clean up old bots without username
  await AIBot.deleteMany({ username: { $exists: false } });
  await AIBot.deleteMany({ username: { $in: [null, ""] } });
  
  for (const profile of BOT_PROFILES) {
    let bot = await AIBot.findOne({ username: profile.username });
    if (!bot) {
      bot = new AIBot({
        username: profile.username,
        displayName: profile.displayName,
        persona: profile.persona,
        avatar: profile.avatar,
        bio: profile.bio,
        favoriteCategories: profile.favoriteCategories,
        postFrequency: 1 + Math.random() * 2 // 1-3 hours stagger (much faster!)
      });
      await bot.save();
      console.log(`[AI Bot] Created bot: ${profile.username}`);
    } else {
      // Update existing bot
      bot.displayName = profile.displayName;
      bot.persona = profile.persona;
      bot.avatar = profile.avatar;
      bot.bio = profile.bio;
      bot.favoriteCategories = profile.favoriteCategories;
      bot.postFrequency = 1 + Math.random() * 2; // Also update existing bots to post faster
      await bot.save();
    }

    // Ensure user exists
    let user = await User.findOne({ username: profile.username });
    if (!user) {
      user = new User({
        username: profile.username,
        displayName: profile.displayName,
        email: `${profile.username}@tenzora-bot.online`,
        password: `bot-${profile.username}-not-used`,
        role: 'user',
        avatar: profile.avatar,
        bio: profile.bio
      });
      await user.save();
      console.log(`[AI Bot] Created user: ${profile.username}`);
    } else {
      // Update existing user
      user.displayName = profile.displayName;
      user.avatar = profile.avatar;
      user.bio = profile.bio;
      await user.save();
    }
  }
  console.log('[AI Bot] All bots initialized');
};

// Get a random active bot
export const getRandomBot = async () => {
  const bots = await AIBot.find({ isActive: true });
  if (bots.length === 0) return null;
  return bots[Math.floor(Math.random() * bots.length)];
};

// Get a bot by username
export const getBotByUsername = async (username) => {
  return await AIBot.findOne({ username });
};

// Get all active bots
export const getAllActiveBots = async () => {
  return await AIBot.find({ isActive: true });
};

// Get bot user account
export const getBotUser = async (botUsername) => {
  return await User.findOne({ username: botUsername });
};

// Generate a community post for a specific bot
export const generatePost = async (bot, topic = null) => {
  const groqToken = process.env.GROQ_API_KEY;
  if (!groqToken) {
    throw new Error('Groq API key not configured');
  }

  const personaPrompt = PERSONAS[bot.persona] || PERSONAS.friendly;
  
  // Pick a topic in bot's favorite categories if possible
  let selectedTopic = topic;
  if (!selectedTopic) {
    // Filter topics by bot's favorite categories
    const favoriteTopics = TOPIC_IDEAS.filter(t => 
      bot.favoriteCategories.includes(t.category)
    );
    const topicsToUse = favoriteTopics.length > 0 ? favoriteTopics : TOPIC_IDEAS;
    selectedTopic = topicsToUse[Math.floor(Math.random() * topicsToUse.length)];
  }

  const systemPrompt = `${personaPrompt}

You are ${bot.displayName}, member of an anime community. Your bio: "${bot.bio}".

Create a short, casual forum post based on the requested topic. Content should be 50-200 characters MAX! 
Return ONLY JSON with title, content, category, and tags. Keep it natural!

CRITICAL CONSTRAINTS:
- "category" MUST be one of these EXACT strings: ["general", "anime", "feedback", "question", "news", "poll"]. 
- "tags" MUST be an array of 1-3 strings selected ONLY from this list: ${JSON.stringify(RECOMMENDED_TAGS)}. Do NOT invent new tags!

Format:
{"title": "Short title", "content": "Short, casual post content", "category": "${selectedTopic.category}", "tags": ["tag1", "tag2"]}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${selectedTopic.prompt}` }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.9,
        max_tokens: 250,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${groqToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    let parsed = JSON.parse(jsonMatch[0]);
    
    // Trim content if too long
    if (parsed.content && parsed.content.length > 220) {
      parsed.content = parsed.content.slice(0, 215) + '...';
    }
    
    return {
      title: parsed.title || 'Anime Discussion',
      content: parsed.content || 'Let\'s talk about anime!',
      category: ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : selectedTopic.category,
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => RECOMMENDED_TAGS.includes(t)) : []
    };
  } catch (error) {
    console.error('[AI Bot] Post generation error:', error);
    throw error;
  }
};

// Generate a reply to a post for a specific bot
export const generateReply = async (bot, post, existingComments = []) => {
  const groqToken = process.env.GROQ_API_KEY;
  if (!groqToken) {
    throw new Error('Groq API key not configured');
  }

  const personaPrompt = PERSONAS[bot.persona] || PERSONAS.friendly;
  
  let commentsContext = '';
  if (existingComments && existingComments.length > 0) {
    commentsContext = `\nExisting comments from other users:\n${existingComments.map(c => `- ${c.content}`).join('\n')}\n(Do not repeat these thoughts)\n`;
  }

  const systemPrompt = `${personaPrompt}

You are ${bot.displayName}, member of an anime community. Your bio: "${bot.bio}".

Reply ONLY DIRECTLY TO THIS POST! NO OFF-TOPIC STUFF! Keep it smart, deeply related, and 1-2 sentences MAX.
${commentsContext}
POST:
Title: ${post.title}
Content: ${post.content}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Give a short, casual reply.' }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.9,
        max_tokens: 120
      },
      {
        headers: {
          'Authorization': `Bearer ${groqToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    let replyText = response.data.choices[0].message.content.trim();
    replyText = replyText.replace(/^["']|["']$/g, '');
    return replyText;
  } catch (error) {
    console.error('[AI Bot] Reply generation error:', error);
    throw error;
  }
};

// Decide if a bot should reply to a post
export const shouldReplyToPost = (bot, post, commentAuthors = []) => {
  // Don't reply to own posts UNLESS someone else has already commented
  if (post.author?.username === bot.username && commentAuthors.length === 0) return false;
  
  // Don't reply if already replied (unless it's their own post and they are engaging with others)
  if (commentAuthors.includes(bot.username) && post.author?.username !== bot.username) return false;
  
  // Don't reply to locked/deleted posts
  if (post.isLocked || post.isDeleted) return false;

  // Higher chance for favorite categories
  const isFavoriteCategory = bot.favoriteCategories.includes(post.category);
  const baseChance = bot.replyChance;
  const finalChance = isFavoriteCategory ? Math.min(baseChance * 1.5, 0.6) : baseChance;
  
  return Math.random() < finalChance;
};

// Create a community post with a specific bot
export const createBotPost = async (bot) => {
  try {
    if (!bot.isActive || !bot.configuration.enablePosting) {
      console.log(`[AI Bot] Posting disabled for ${bot.username}`);
      return null;
    }

    const botUser = await getBotUser(bot.username);
    if (!botUser) {
      throw new Error(`Bot user not found: ${bot.username}`);
    }

    const postData = await generatePost(bot);
    
    const newPost = new CommunityPost({
      ...postData,
      author: botUser._id
    });

    await newPost.save();
    await newPost.populate('author', 'username displayName profileId avatar role');

    // Add random bot likes (7+!)
    await addRandomBotLikes(newPost._id);

    // Update bot stats
    bot.lastPostAt = new Date();
    bot.stats.totalPosts = (bot.stats.totalPosts || 0) + 1;
    await bot.save();

    console.log(`[AI Bot] ${bot.displayName} created post: ${newPost.title}`);
    return newPost;
  } catch (error) {
    console.error(`[AI Bot] ${bot.username} failed to create post:`, error);
    throw error;
  }
};

// Create a reply to a post with a specific bot
export const createBotReply = async (bot, postId, parentCommentId = null) => {
  try {
    if (!bot.isActive || !bot.configuration.enableReplying) {
      console.log(`[AI Bot] Replying disabled for ${bot.username}`);
      return null;
    }

    const botUser = await getBotUser(bot.username);
    if (!botUser) {
      throw new Error(`Bot user not found: ${bot.username}`);
    }

    const post = await CommunityPost.findById(postId)
      .populate('author', 'username displayName profileId avatar role');
    
    if (!post) {
      throw new Error('Post not found');
    }

    // Get existing comments to provide context
    const existingComments = await CommunityComment.find({ post: postId });
    
    // We let shouldReplyToPost handle the logic of whether a bot can reply again
    // (e.g. if it's their own post and someone else commented)

    const replyText = await generateReply(bot, post, existingComments);

    const newComment = new CommunityComment({
      post: post._id,
      author: botUser._id,
      content: replyText,
      parentId: parentCommentId
    });

    await newComment.save();
    await newComment.populate('author', 'username displayName profileId avatar role');

    // Update post comment count
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    // Update bot stats
    bot.lastReplyAt = new Date();
    bot.stats.totalReplies = (bot.stats.totalReplies || 0) + 1;
    await bot.save();

    // Add random likes to the bot's comment too!
    await addRandomBotCommentLikes(newComment._id);

    if (parentCommentId) {
      console.log(`[AI Bot] ${bot.displayName} nested replied in: ${post.title}`);
    } else {
      console.log(`[AI Bot] ${bot.displayName} replied to: ${post.title}`);
    }
    return newComment;
  } catch (error) {
    console.error(`[AI Bot] ${bot.username} failed to reply:`, error);
    throw error;
  }
};

// Add random bot likes to a post (more than 7 likes, e.g., 8-24 likes)
export const addRandomBotLikes = async (postId) => {
  try {
    const allBots = await User.find({ username: { $in: BOT_PROFILES.map(p => p.username) } });
    const post = await CommunityPost.findById(postId);
    if (!post) return;

    const shuffledBots = [...allBots].sort(() => 0.5 - Math.random());
    const numLikes = Math.floor(Math.random() * 17) + 8; // 8 to 24 likes!

    let likesAdded = 0;

    // First add real bots
    for (let i = 0; i < shuffledBots.length && likesAdded < numLikes; i++) {
      const botId = shuffledBots[i]._id.toString();
      if (!post.likes.map(id => id.toString()).includes(botId)) {
        post.likes.push(shuffledBots[i]._id);
        likesAdded++;
      }
    }

    // If we still need more likes to reach the target, use anonymous ghost likes
    while (likesAdded < numLikes) {
      post.likes.push(new mongoose.Types.ObjectId());
      likesAdded++;
    }

    await post.save();
    console.log(`[AI Bot] Added ${numLikes} random likes to post: ${postId}`);
  } catch (error) {
    console.error('[AI Bot] Error adding random bot likes:', error);
  }
};

// Add random bot likes to a comment
export const addRandomBotCommentLikes = async (commentId) => {
  try {
    const allBots = await User.find({ username: { $in: BOT_PROFILES.map(p => p.username) } });
    const comment = await CommunityComment.findById(commentId);
    if (!comment) return;

    const shuffledBots = [...allBots].sort(() => 0.5 - Math.random());
    const numLikes = Math.floor(Math.random() * 8) + 3; // 3 to 10 likes for comments

    let likesAdded = 0;

    for (let i = 0; i < shuffledBots.length && likesAdded < numLikes; i++) {
      const botId = shuffledBots[i]._id.toString();
      if (!comment.likes.map(id => id.toString()).includes(botId)) {
        comment.likes.push(shuffledBots[i]._id);
        likesAdded++;
      }
    }

    while (likesAdded < numLikes) {
      comment.likes.push(new mongoose.Types.ObjectId());
      likesAdded++;
    }

    await comment.save();
    console.log(`[AI Bot] Added ${numLikes} random likes to comment: ${commentId}`);
  } catch (error) {
    console.error('[AI Bot] Error adding random comment likes:', error);
  }
};

// Initialize bot system (legacy support)
export const initBotConfig = async () => {
  await initAllBots();
  return await getRandomBot();
};
