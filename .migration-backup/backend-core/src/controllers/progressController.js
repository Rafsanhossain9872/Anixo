import Progress from '../models/Progress.js';
import axios from 'axios';
import User from '../models/User.js';

// Helper to sync progress to AniList
const syncToAnilist = async (user, animeId, anilistId, episode) => {
  if (!user.anilist || !user.anilist.accessToken) return;

  // Use explicit anilistId if provided, otherwise try to parse animeId
  const mediaId = anilistId ? parseInt(anilistId) : parseInt(animeId);
  
  if (isNaN(mediaId)) {
    console.warn(`[AniList] Cannot sync: Invalid numeric ID for anime ${animeId}`);
    return;
  }

  try {
    const query = `
      mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
        SaveMediaListEntry (mediaId: $mediaId, progress: $progress, status: $status) {
          id
          progress
          status
        }
      }
    `;

    const variables = {
      mediaId,
      progress: parseInt(episode),
      status: "CURRENT"
    };

    await axios.post('https://graphql.anilist.co', {
      query,
      variables
    }, {
      headers: {
        Authorization: `Bearer ${user.anilist.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    console.log(`[AniList] Progress synced for ${user.username}: Media ${mediaId}, Ep ${episode}`);
  } catch (error) {
    console.error("[AniList] Sync Error:", error.response?.data || error.message);
  }
};

// @desc    Save or update anime progress
export const saveProgress = async (req, res) => {
  try {
    const { animeId, anilistId, episode, currentTime, duration, title, coverImage } = req.body;

    if (!animeId || episode === undefined || currentTime === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const progress = await Progress.findOneAndUpdate(
      { user: req.user._id, animeId: String(animeId) },
      { 
        episode, 
        currentTime, 
        duration, 
        title, 
        coverImage,
        updatedAt: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync to AniList in background if linked
    if (req.user.anilist?.accessToken) {
      syncToAnilist(req.user, animeId, anilistId, episode);
    }

    res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    console.error("Save progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all progress for a user
export const getProgress = async (req, res) => {
  try {
    const progressList = await Progress.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(100);

    const uniqueProgress = [];
    const seenIds = new Set();
    for (const p of progressList) {
      if (!seenIds.has(String(p.animeId))) {
        seenIds.add(String(p.animeId));
        uniqueProgress.push(p);
      }
    }

    res.status(200).json({
      success: true,
      continueWatching: uniqueProgress
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete progress for a specific anime
export const deleteProgress = async (req, res) => {
  try {
    await Progress.findOneAndDelete({ 
      user: req.user._id, 
      animeId: req.params.animeId 
    });

    res.status(200).json({
      success: true,
      message: 'Progress removed'
    });
  } catch (error) {
    console.error("Delete progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
