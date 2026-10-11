import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
    // Denormalised for fast per-season / per-series aggregation.
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
    kind: { type: String, enum: ['episode', 'special'], required: true },
    watched: { type: Boolean, required: true, default: false },
    watchedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One record per user per episode.
progressSchema.index({ userId: 1, episodeId: 1 }, { unique: true });
progressSchema.index({ userId: 1, watched: 1, watchedAt: -1 });
progressSchema.index({ userId: 1, seasonId: 1, watched: 1 });

export const UserEpisodeProgress = mongoose.model('UserEpisodeProgress', progressSchema);
