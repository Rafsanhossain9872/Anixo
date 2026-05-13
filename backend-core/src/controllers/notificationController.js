import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import axios from 'axios';

// Helper to auto-generate notifications for newly aired episodes
const syncAiringNotifications = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Get IDs from Watchlist (Watching / Planning)
    const activeWatchlist = (user.watchlist || []).filter(w => w.status === 'Watching' || w.status === 'Planning');
    const watchlistIds = activeWatchlist.map(w => parseInt(w.animeId)).filter(id => !isNaN(id));

    // Get IDs from Continue Watching (Progress)
    const progressDocs = await Progress.find({ user: userId });
    const progressIds = progressDocs.map(p => parseInt(p.animeId)).filter(id => !isNaN(id));

    // Combine and deduplicate IDs
    const combinedIds = [...new Set([...watchlistIds, ...progressIds])];
    
    if (combinedIds.length === 0) return;

    // Process up to 50 items to respect rate limits
    const chunk = combinedIds.slice(0, 50);
    
    const query = `
      query ($idIn: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $idIn, type: ANIME, status: RELEASING) {
            id
            title { english romaji }
            nextAiringEpisode { episode }
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', { query, variables: { idIn: chunk } });
    const mediaList = response.data?.data?.Page?.media || [];
    
    for (const media of mediaList) {
      if (!media.nextAiringEpisode) continue;
      
      const latestAvailableEp = media.nextAiringEpisode.episode - 1;
      if (latestAvailableEp > 0) {
        const titleStr = media.title.english || media.title.romaji || 'Anime';
        const msg = `Episode ${latestAvailableEp} of ${titleStr} is now available to watch!`;
        
        // Check if user has already watched it
        const watchItem = activeWatchlist.find(w => w.animeId === String(media.id));
        const progressItem = progressDocs.find(p => p.animeId === String(media.id));
        
        let userProgress = 0;
        if (watchItem && watchItem.progress > userProgress) userProgress = watchItem.progress;
        if (progressItem && progressItem.episode > userProgress) userProgress = progressItem.episode;
        
        if (userProgress >= latestAvailableEp) continue;

        // Check if we already notified them
        const exists = await Notification.findOne({
          user: userId,
          animeId: String(media.id),
          message: msg
        });

        if (!exists) {
          await Notification.create({
            user: userId,
            animeId: String(media.id),
            title: 'New Episode Aired 🚀',
            message: msg,
            type: 'NEW_EPISODE'
          });
        }
      }
    }
  } catch (err) {
    console.error("[Smart Notifications] Error:", err.message);
  }
};

// @desc    Get all notifications for a user
export const getNotifications = async (req, res) => {
  try {
    // Await the sync so new notifications are instantly visible to the user
    await syncAiringNotifications(req.user._id);

    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark a notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all as read
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Clear all notifications
export const clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Notifications cleared'
    });
  } catch (error) {
    console.error("Clear notifications error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
