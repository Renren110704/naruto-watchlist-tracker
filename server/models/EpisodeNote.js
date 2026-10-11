import mongoose from 'mongoose';

export const CHARACTER_STATUSES = ['introduced', 'revealed', 'development'];
export const JUTSU_STATUSES = ['new', 'new-use'];

const characterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // introduced: first appearance; revealed: previously unknown identity revealed;
    // development: new information about an existing character.
    status: { type: String, enum: CHARACTER_STATUSES, default: 'introduced' },
    affiliation: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: true },
);

const jutsuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 100, default: '' },
    usedBy: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    // new: first time the technique appears; new-use: known technique used in a new way.
    status: { type: String, enum: JUTSU_STATUSES, default: 'new' },
  },
  { _id: true },
);

const text = { type: String, trim: true, maxlength: 5000, default: '' };

const episodeNoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
    // Story notes
    summary: text,
    importantEvents: text,
    favoriteScene: text,
    personalNotes: text,
    // Character tracking & jutsu
    characters: { type: [characterSchema], default: [] },
    jutsu: { type: [jutsuSchema], default: [] },
    // Additional learning
    newAbilities: text,
    lore: text,
    relationships: text,
    openQuestions: text,
    rating: { type: Number, min: 1, max: 5, default: null },
  },
  { timestamps: true },
);

episodeNoteSchema.index({ userId: 1, episodeId: 1 }, { unique: true });
episodeNoteSchema.index({ userId: 1, updatedAt: -1 });

export const EpisodeNote = mongoose.model('EpisodeNote', episodeNoteSchema);
