import { EpisodeNote } from '../models/EpisodeNote.js';
import { UserEpisodeProgress } from '../models/UserEpisodeProgress.js';
import { getCatalog, serializeEpisode } from './catalogService.js';

/** Map of episodeId -> { watched, watchedAt } for the user's watched episodes. */
export async function getProgressMap(userId) {
  const docs = await UserEpisodeProgress.find({ userId, watched: true }, { episodeId: 1, watched: 1, watchedAt: 1 }).lean();
  return new Map(docs.map((d) => [d.episodeId.toString(), d]));
}

export async function getNoteSet(userId) {
  const docs = await EpisodeNote.find({ userId }, { episodeId: 1 }).lean();
  return new Set(docs.map((d) => d.episodeId.toString()));
}

export async function getUserState(userId) {
  const [progress, notes] = await Promise.all([getProgressMap(userId), getNoteSet(userId)]);
  return { progress, notes };
}

export async function setWatched(userId, episode, watched) {
  const now = new Date();
  return UserEpisodeProgress.findOneAndUpdate(
    { userId, episodeId: episode._id },
    {
      $set: { watched, watchedAt: watched ? now : null },
      $setOnInsert: { seasonId: episode.seasonId, seriesId: episode.seriesId, kind: episode.kind },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean();
}

export async function setWatchedMany(userId, episodes, watched) {
  if (!episodes.length) return;
  const now = new Date();
  await UserEpisodeProgress.bulkWrite(
    episodes.map((e, i) => ({
      updateOne: {
        filter: { userId, episodeId: e._id },
        update: {
          // Stagger timestamps so "recently watched" keeps the watch order.
          $set: { watched, watchedAt: watched ? new Date(now.getTime() + i) : null },
          $setOnInsert: { seasonId: e.seasonId, seriesId: e.seriesId, kind: e.kind },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

const pct = (watched, total) => (total ? Math.round((watched / total) * 1000) / 10 : 0);

function tally(list, progress) {
  let total = 0, watched = 0, specialsTotal = 0, specialsWatched = 0;
  for (const e of list) {
    const w = progress.has(e._id.toString());
    if (e.kind === 'episode') { total++; if (w) watched++; }
    else { specialsTotal++; if (w) specialsWatched++; }
  }
  return { total, watched, remaining: total - watched, percent: pct(watched, total), specialsTotal, specialsWatched };
}

/** Next unwatched entry after the furthest point the user has reached in watch order. */
export function findContinueWatching(catalog, progress, { includeSpecials = true, count = 5 } = {}) {
  const eligible = catalog.episodes.filter((e) => includeSpecials || e.kind === 'episode');
  let furthest = -1;
  eligible.forEach((e, i) => {
    if (progress.has(e._id.toString())) furthest = i;
  });
  const after = eligible.slice(furthest + 1).filter((e) => !progress.has(e._id.toString()));
  const before = eligible.slice(0, furthest + 1).filter((e) => !progress.has(e._id.toString()));
  return [...after, ...before].slice(0, count);
}

export async function buildStats(user) {
  const catalog = await getCatalog();
  const { progress, notes } = await getUserState(user._id);
  const state = { progress, notes };

  const overall = tally(catalog.episodes, progress);
  const series = catalog.series.map((s) => ({
    id: s.key,
    title: s.title,
    ...tally(catalog.episodes.filter((e) => e.seriesKey === s.key), progress),
  }));
  const seasons = catalog.seasons.map((s) => ({
    id: s.key,
    seriesId: s.seriesKey,
    title: s.title,
    seasonNumber: s.seasonNumber,
    ...tally(catalog.episodesBySeason.get(s.key), progress),
  }));

  const recent = [...progress.values()]
    .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
    .slice(0, 8)
    .map((p) => catalog.episodeById.get(p.episodeId.toString()))
    .filter(Boolean)
    .map((e) => serializeEpisode(e, catalog, state));

  const upNext = findContinueWatching(catalog, progress, {
    includeSpecials: user.preferences?.includeSpecials ?? true,
  }).map((e) => serializeEpisode(e, catalog, state));

  return {
    overall,
    series,
    seasons,
    continueWatching: upNext[0] ?? null,
    upNext,
    recent,
    notesCount: notes.size,
  };
}
