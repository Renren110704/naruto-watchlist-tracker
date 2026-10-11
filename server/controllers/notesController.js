import { EpisodeNote } from '../models/EpisodeNote.js';
import { ApiError } from '../utils/ApiError.js';
import { getCatalog, matchesQuery, serializeEpisode } from '../services/catalogService.js';
import { getUserState } from '../services/progressService.js';
import { findEpisodeOr404, paginate } from './catalogController.js';

const TEXT_FIELDS = [
  'summary', 'importantEvents', 'favoriteScene', 'personalNotes',
  'newAbilities', 'lore', 'relationships', 'openQuestions',
];

export function serializeNote(n) {
  return {
    id: n._id.toString(),
    ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, n[f] ?? ''])),
    characters: (n.characters ?? []).map((c) => ({
      id: c._id.toString(), name: c.name, status: c.status, affiliation: c.affiliation, description: c.description,
    })),
    jutsu: (n.jutsu ?? []).map((j) => ({
      id: j._id.toString(), name: j.name, category: j.category, usedBy: j.usedBy, description: j.description, status: j.status,
    })),
    rating: n.rating ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };
}

/** Whitelists the note payload (validated by the route) into a document update. */
function toNoteFields(body) {
  const fields = Object.fromEntries(TEXT_FIELDS.map((f) => [f, body[f] ?? '']));
  fields.characters = (body.characters ?? []).map(({ name, status, affiliation, description }) => ({
    name, status: status || 'introduced', affiliation: affiliation ?? '', description: description ?? '',
  }));
  fields.jutsu = (body.jutsu ?? []).map(({ name, category, usedBy, description, status }) => ({
    name, category: category ?? '', usedBy: usedBy ?? '', description: description ?? '', status: status || 'new',
  }));
  fields.rating = body.rating ?? null;
  const hasContent =
    TEXT_FIELDS.some((f) => fields[f]) || fields.characters.length || fields.jutsu.length || fields.rating;
  if (!hasContent) throw ApiError.validation({ _form: 'Add at least one note, character, jutsu or rating before saving' }, 'Your notes are empty');
  return fields;
}

export async function getEpisodeNote(req, res) {
  const { episode } = await findEpisodeOr404(req.params.episodeId);
  const note = await EpisodeNote.findOne({ userId: req.user._id, episodeId: episode._id }).lean();
  if (!note) throw ApiError.notFound('You have not written notes for this episode yet', { code: 'NOTE_NOT_FOUND' });
  res.json({ note: serializeNote(note) });
}

export async function createEpisodeNote(req, res) {
  const { episode } = await findEpisodeOr404(req.params.episodeId);
  const fields = toNoteFields(req.body);
  if (await EpisodeNote.exists({ userId: req.user._id, episodeId: episode._id })) {
    throw ApiError.conflict('Notes already exist for this episode. Edit them instead.', { code: 'NOTE_EXISTS' });
  }
  const note = await EpisodeNote.create({ userId: req.user._id, episodeId: episode._id, ...fields });
  res.status(201).json({ note: serializeNote(note), message: 'Notes saved' });
}

export async function updateEpisodeNote(req, res) {
  const { episode } = await findEpisodeOr404(req.params.episodeId);
  const fields = toNoteFields(req.body);
  const note = await EpisodeNote.findOneAndUpdate(
    { userId: req.user._id, episodeId: episode._id },
    { $set: fields },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!note) throw ApiError.notFound('No notes to update for this episode', { code: 'NOTE_NOT_FOUND' });
  res.json({ note: serializeNote(note), message: 'Notes updated' });
}

export async function deleteEpisodeNote(req, res) {
  const { episode } = await findEpisodeOr404(req.params.episodeId);
  const result = await EpisodeNote.deleteOne({ userId: req.user._id, episodeId: episode._id });
  if (!result.deletedCount) throw ApiError.notFound('No notes to delete for this episode', { code: 'NOTE_NOT_FOUND' });
  res.json({ message: 'Notes deleted' });
}

export async function listNotes(req, res) {
  const catalog = await getCatalog();
  const state = await getUserState(req.user._id);
  const { q, series, sort = 'updated' } = req.query;
  const notes = await EpisodeNote.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();

  const needle = q?.trim().toLowerCase();
  let rows = notes
    .map((n) => ({ note: n, episode: catalog.episodeById.get(n.episodeId.toString()) }))
    .filter((r) => r.episode && (!series || r.episode.seriesKey === series));
  if (needle) {
    rows = rows.filter(
      ({ note, episode }) =>
        matchesQuery(episode, needle) ||
        note.characters.some((c) => c.name.toLowerCase().includes(needle)) ||
        note.jutsu.some((j) => j.name.toLowerCase().includes(needle)),
    );
  }
  if (sort === 'order') rows.sort((a, b) => a.episode.orderIndex - b.episode.orderIndex);
  if (sort === 'rating') rows.sort((a, b) => (b.note.rating ?? 0) - (a.note.rating ?? 0));

  const { items, pagination } = paginate(rows, req.query);
  res.json({
    notes: items.map(({ note, episode }) => ({
      ...serializeNote(note),
      episode: serializeEpisode(episode, catalog, state),
    })),
    pagination,
  });
}
