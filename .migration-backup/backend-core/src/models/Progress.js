import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  animeId: {
    type: String,
    required: true
  },
  episode: {
    type: Number,
    required: true
  },
  currentTime: {
    type: Number,
    required: true
  },
  duration: {
    type: Number
  },
  title: {
    type: String,
    required: true
  },
  coverImage: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

progressSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

progressSchema.index({ user: 1, animeId: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);
export default Progress;
