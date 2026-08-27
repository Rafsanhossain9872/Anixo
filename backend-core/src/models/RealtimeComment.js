import mongoose from 'mongoose';

// Mirror of the comment-service schema — allows backend-core to insert
// episode comments directly into the same MongoDB collection.
const realtimeCommentSchema = new mongoose.Schema({
    animeId: { type: String, required: true },
    episodeNumber: { type: String, required: true },
    user: {
        username: { type: String, required: true },
        profileId: { type: String },
        displayName: { type: String },
        avatar: { type: String },
        role: { type: String, default: 'user' }
    },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy: [{ type: String }],
    dislikedBy: [{ type: String }],
    isPinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    bannedByRole: { type: String, default: null },
    bannedReason: { type: String, default: null },
    isSpoiler: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
    replies: [{
        user: {
            username: { type: String, required: true },
            profileId: { type: String },
            displayName: { type: String },
            avatar: { type: String },
            role: { type: String, default: 'user' }
        },
        content: { type: String, required: true },
        replyToId: { type: String, default: null },
        likes: { type: Number, default: 0 },
        dislikes: { type: Number, default: 0 },
        likedBy: [{ type: String }],
        dislikedBy: [{ type: String }],
        isDeleted: { type: Boolean, default: false },
        bannedByRole: { type: String, default: null },
        bannedReason: { type: String, default: null },
        isSpoiler: { type: Boolean, default: false },
        reportCount: { type: Number, default: 0 },
        reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

realtimeCommentSchema.index({ animeId: 1, episodeNumber: 1, createdAt: -1 });

// Use the same collection name as the comment-service ('realtimecomments')
const RealtimeComment = mongoose.model('RealtimeComment', realtimeCommentSchema);
export default RealtimeComment;
