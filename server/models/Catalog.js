/**
 * Catalog models: read-only data imported from the source PDFs by scripts/seed.js.
 * Every document has a stable `key` (e.g. "naruto-s01", "shippuden-e121") that the
 * seed script upserts on, so re-running it never duplicates anything.
 */
import mongoose from 'mongoose';

const airDates = new mongoose.Schema({ start: String, end: String }, { _id: false });

const seriesSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    sourceFile: String,
    airDates,
    statedSeasonCount: Number,
    statedEpisodeCount: Number,
    orderIndex: { type: Number, required: true, index: true },
  },
  { timestamps: true },
);

const seasonSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true, index: true },
    seriesKey: { type: String, required: true },
    seasonNumber: { type: Number, required: true },
    title: { type: String, required: true },
    subtitle: String,
    description: String,
    airDates,
    statedEpisodeCount: Number,
    orderIndex: { type: Number, required: true, index: true },
  },
  { timestamps: true },
);
seasonSchema.index({ seriesId: 1, seasonNumber: 1 }, { unique: true });

const episodeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
    seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    seriesKey: { type: String, required: true },
    seasonKey: { type: String, required: true },
    kind: { type: String, enum: ['episode', 'special'], required: true },
    specialType: { type: String, enum: ['movie', 'ova', 'special', null], default: null },
    episodeNumber: { type: Number, default: null },
    // The source PDFs do not list per-episode titles, so this is null for regular episodes.
    title: { type: String, default: null },
    description: { type: String, default: null },
    arc: { type: String, default: null },
    // Global watch order across all series, exactly as listed in the PDFs.
    orderIndex: { type: Number, required: true, unique: true },
  },
  { timestamps: true },
);
episodeSchema.index({ seasonId: 1, orderIndex: 1 });
episodeSchema.index({ seriesId: 1, kind: 1, episodeNumber: 1 });

export const Series = mongoose.model('Series', seriesSchema, 'series');
export const Season = mongoose.model('Season', seasonSchema);
export const Episode = mongoose.model('Episode', episodeSchema);
