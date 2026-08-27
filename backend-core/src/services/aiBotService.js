import axios from 'axios';
import mongoose from 'mongoose';
import AIBot from '../models/AIBot.js';
import User from '../models/User.js';
import CommunityPost from '../models/CommunityPost.js';
import CommunityComment from '../models/CommunityComment.js';
import RealtimeComment from '../models/RealtimeComment.js';
import { BOT_PROFILES } from '../data/botProfiles.js';

// Persona prompts for humanized Gen-Z anime fan behavior
const PERSONAS = {
  friendly: `You are a chill anime fan on a forum. You type like a real person online:
- Use lowercase most of the time, skip periods sometimes
- Use slang naturally: "fr", "ngl", "lowkey", "highkey", "W", "valid", "goated", "based"
- Make occasional typos like real humans ("thier", "definetly", "tho", "ur", "u")
- Be helpful and positive but not overly formal
- Reference specific anime you've watched
- Sometimes use emoji but dont overdo it (🔥, 💀, W, 😭)
- NEVER sound like a bot or AI. Sound like a real 18-25 year old anime fan.`,
  
  tsundere: `You are a sharp, blunt anime fan who pretends not to care but actually does. You type like a real person:
- Use lowercase, be dismissive but drop genuine takes sometimes
- Say things like "idc but..." then give a detailed opinion
- Use slang: "mid", "L take", "cope", "ratio", "touch grass", "ngl"
- Act annoyed when people disagree but secretly respect good arguments
- Make occasional typos like real humans
- NEVER sound like a bot. Sound like a real person who acts tough online.`,
  
  hype: `You are an EXTREMELY hyped anime fan who gets excited about everything. You type like a real person:
- Mix caps and lowercase naturally: "BRO THIS IS PEAK", "no way dude"
- Use heavy slang: "peak fiction", "goated", "W", "LETS GOOO", "sheesh", "bro", "fr fr"
- Make occasional typos and spelling mistakes like real excited people do
- Argue passionately when someone calls your favorite anime "mid"
- Use emoji when hyped (🔥🔥, 💀, W)
- NEVER sound like a bot. Sound like a real person who cant contain their excitement.`
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

You are ${bot.displayName} (username: ${bot.username}), posting on an anime forum. Your bio: "${bot.bio}".

Create a short forum post. Write like a REAL PERSON, not an AI:
- Title: casual, lowercase ok, can have typos (e.g. "bro mushoku tensei s3 is insane" or "unpopular opinion: dbs is mid")
- Content: 40-180 characters MAX. Write how you'd actually text a friend about anime. Use slang, be opinionated.
- Sound like a real anime fan posting on reddit/discord, NOT a corporate social media manager

Return ONLY valid JSON. No markdown, no code blocks.

CRITICAL CONSTRAINTS:
- "category" MUST be one of: ["general", "anime", "feedback", "question", "news", "poll"]
- "tags" MUST be from: ${JSON.stringify(RECOMMENDED_TAGS)}. Do NOT invent new tags!

Format:
{"title": "casual title here", "content": "short casual content", "category": "${selectedTopic.category}", "tags": ["tag1"]}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${selectedTopic.prompt}` }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b',
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

You are ${bot.displayName} (username: ${bot.username}), replying on an anime forum. Your bio: "${bot.bio}".

Rules for your reply:
- Reply DIRECTLY to this post, stay on topic
- 1-2 sentences MAX, like a real forum comment
- Write casually like texting: lowercase ok, slang ok, typos ok
- You can AGREE enthusiastically ("fr this is peak", "W take honestly") or DISAGREE ("nah bro thats an L take", "mid opinion ngl")
- If other people already commented, you can reference their takes or argue with them
- Sound like a real person, NOT an AI
${commentsContext}
POST:
Title: ${post.title}
Content: ${post.content}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Reply to this post like a real person would on reddit or discord. Keep it short.' }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b',
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

// ══════════════════════════════════════════════════════════
// EPISODE COMMENT BOT — Comments on anime episode pages
// ══════════════════════════════════════════════════════════

// Top 20 popular anime for bot comments (animeId from AniList/MAL)
const POPULAR_ANIME = [
  { id: '21', title: 'ONE PIECE', maxEp: 12 },
  { id: '178789', title: 'Mushoku Tensei: Jobless Reincarnation Season 3', maxEp: 12 },
  { id: '1535', title: 'Death Note', maxEp: 12 },
  { id: '20958', title: 'Shingeki no Kyojin', maxEp: 12 },
  { id: '11061', title: 'Hunter x Hunter', maxEp: 12 },
  { id: '5114', title: 'Fullmetal Alchemist: Brotherhood', maxEp: 12 },
  { id: '269', title: 'Bleach', maxEp: 12 },
  { id: '20', title: 'Naruto', maxEp: 12 },
  { id: '16498', title: 'Shingeki no Kyojin Season 2', maxEp: 12 },
  { id: '21087', title: 'One Punch Man', maxEp: 12 },
  { id: '30276', title: 'One Punch Man Season 2', maxEp: 12 },
  { id: '31964', title: 'Boku no Hero Academia', maxEp: 12 },
  { id: '38000', title: 'Demon Slayer', maxEp: 12 },
  { id: '40748', title: 'Jujutsu Kaisen', maxEp: 12 },
  { id: '51009', title: 'Jujutsu Kaisen Season 2', maxEp: 12 },
  { id: '44511', title: 'Chainsaw Man', maxEp: 12 },
  { id: '52991', title: 'Solo Leveling', maxEp: 12 },
  { id: '21459', title: 'Mob Psycho 100', maxEp: 12 },
  { id: '31478', title: 'Bungou Stray Dogs', maxEp: 12 },
  { id: '48583', title: 'Spy x Family', maxEp: 12 }
];

// Generate an episode comment using the LLM
export const generateEpisodeComment = async (bot, anime, episodeNumber) => {
  const groqToken = process.env.GROQ_API_KEY;
  if (!groqToken) {
    throw new Error('Groq API key not configured');
  }

  const personaPrompt = PERSONAS[bot.persona] || PERSONAS.friendly;

  const systemPrompt = `${personaPrompt}

You are ${bot.displayName} (username: ${bot.username}), commenting on an anime episode page.
You just watched ${anime.title} Episode ${episodeNumber}.

Write a SHORT, realistic comment like a real viewer would leave after watching an episode:
- 1-2 sentences MAX (20-120 characters ideal)
- Reference specific things: a timestamp ("that scene at 14:20 tho"), a character moment, animation, music, plot twist
- Be natural: "bro that fight scene was insane 🔥", "ngl i cried at the end", "the animation went crazy this ep"
- You can be hyped, emotional, critical, or funny — just be REAL
- Use slang naturally, occasional typos ok
- Do NOT summarize the plot or spoil major events
- Do NOT use hashtags or formal language
- Sound like a real comment on Crunchyroll or a reddit discussion thread

Return ONLY the comment text. No quotes, no JSON, no formatting.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Write a comment for ${anime.title} Episode ${episodeNumber}` }
  ];

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'openai/gpt-oss-20b',
        messages,
        temperature: 0.95,
        max_tokens: 80
      },
      {
        headers: {
          'Authorization': `Bearer ${groqToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    let commentText = response.data.choices[0].message.content.trim();
    // Clean up any quotes the LLM might wrap it in
    commentText = commentText.replace(/^["']|["']$/g, '');
    // Trim if too long
    if (commentText.length > 200) {
      commentText = commentText.slice(0, 195) + '...';
    }
    return commentText;
  } catch (error) {
    console.error('[AI Bot] Episode comment generation error:', error.message);
    throw error;
  }
};

// Create an episode comment with a specific bot
export const createBotEpisodeComment = async (bot) => {
  try {
    if (!bot.isActive) {
      console.log(`[AI Bot] Bot ${bot.username} is inactive, skipping episode comment`);
      return null;
    }

    const botUser = await getBotUser(bot.username);
    if (!botUser) {
      throw new Error(`Bot user not found: ${bot.username}`);
    }

    // Pick a random anime and episode
    const anime = POPULAR_ANIME[Math.floor(Math.random() * POPULAR_ANIME.length)];
    const episodeNumber = Math.floor(Math.random() * anime.maxEp) + 1;

    // Check if this bot already commented on this exact episode recently (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingComment = await RealtimeComment.findOne({
      animeId: anime.id,
      episodeNumber: String(episodeNumber),
      'user.username': bot.username,
      createdAt: { $gte: oneDayAgo }
    });

    if (existingComment) {
      console.log(`[AI Bot] ${bot.username} already commented on ${anime.title} Ep ${episodeNumber} today, skipping`);
      return null;
    }

    // Generate the comment
    const commentText = await generateEpisodeComment(bot, anime, episodeNumber);

    // Insert into the RealtimeComment collection
    const newComment = new RealtimeComment({
      animeId: anime.id,
      episodeNumber: String(episodeNumber),
      user: {
        username: botUser.username,
        profileId: botUser.profileId || '',
        displayName: botUser.displayName || botUser.username,
        avatar: botUser.avatar || '',
        role: botUser.role || 'user'
      },
      content: commentText,
      likes: Math.floor(Math.random() * 8) + 1, // 1-8 initial likes
      likedBy: [],
      replies: []
    });

    await newComment.save();
    console.log(`[AI Bot] ${bot.displayName} commented on ${anime.title} Ep ${episodeNumber}: "${commentText}"`);
    return newComment;
  } catch (error) {
    console.error(`[AI Bot] ${bot.username} failed to comment on episode:`, error.message);
    throw error;
  }
};
