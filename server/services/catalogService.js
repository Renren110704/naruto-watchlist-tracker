/**
 * Read-through cache of the (small, read-only) catalog: 3 series, 33 seasons,
 * ~1,000 episodes. Keeping it in memory makes ordering, filtering and joining with a
 * user's progress cheap and keeps the original PDF order authoritative (orderIndex).
 */
import { Episode, Season, Series } from '../models/Catalog.js';

const TTL_MS = 10 * 60 * 1000;
let cache = null;
let loading = null;

export function invalidateCatalogCache() {
  cache = null;
}

async function load() {
  const [series, seasons, episodes] = await Promise.all([
    Series.find().sort({ orderIndex: 1 }).lean(),
    Season.find().sort({ orderIndex: 1 }).lean(),
    Episode.find().sort({ orderIndex: 1 }).lean(),
  ]);
  const seriesByKey = new Map(series.map((s) => [s.key, s]));
  const seasonByKey = new Map(seasons.map((s) => [s.key, s]));
  const episodeByKey = new Map(episodes.map((e) => [e.key, e]));
  const episodeById = new Map(episodes.map((e) => [e._id.toString(), e]));
  const episodesBySeason = new Map(seasons.map((s) => [s.key, []]));
  for (const e of episodes) episodesBySeason.get(e.seasonKey)?.push(e);
  const position = new Map(episodes.map((e, i) => [e._id.toString(), i]));
  return {
    series, seasons, episodes, seriesByKey, seasonByKey, episodeByKey, episodeById, episodesBySeason, position,
    loadedAt: Date.now(),
  };
}

export async function getCatalog() {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  if (!loading) {
    loading = load()
      .then((c) => (cache = c))
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export function episodeLabel(e) {
  if (e.kind === 'special') return e.title;
  // Regular episodes only have a title if one was added to catalog.json by hand.
  return e.title ? `Episode ${e.episodeNumber}: ${e.title}` : `Episode ${e.episodeNumber}`;
}

export function serializeSeries(s) {
  return { id: s.key, title: s.title, airDates: s.airDates ?? null, orderIndex: s.orderIndex };
}

export function serializeSeason(s, catalog) {
  const series = catalog.seriesByKey.get(s.seriesKey);
  return {
    id: s.key,
    seasonNumber: s.seasonNumber,
    title: s.title,
    subtitle: s.subtitle ?? null,
    description: s.description ?? null,
    airDates: s.airDates ?? null,
    orderIndex: s.orderIndex,
    series: { id: series.key, title: series.title },
  };
}

/** Public shape of an episode, optionally merged with the current user's state. */
export function serializeEpisode(e, catalog, { progress, notes } = {}) {
  const season = catalog.seasonByKey.get(e.seasonKey);
  const series = catalog.seriesByKey.get(e.seriesKey);
  const p = progress?.get(e._id.toString());
  return {
    id: e.key,
    kind: e.kind,
    specialType: e.specialType ?? null,
    episodeNumber: e.episodeNumber,
    title: e.title,
    label: episodeLabel(e),
    description: e.description ?? null,
    arc: e.arc,
    orderIndex: e.orderIndex,
    season: { id: season.key, title: season.title, seasonNumber: season.seasonNumber },
    series: { id: series.key, title: series.title },
    watched: Boolean(p?.watched),
    watchedAt: p?.watched ? p.watchedAt : null,
    hasNotes: notes ? notes.has(e._id.toString()) : false,
  };
}

/** Case-insensitive search across label, special titles, arc and episode number. */
export function matchesQuery(e, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const num = needle.replace(/^(ep(isode)?\.?\s*|#)/, '');
  if (/^\d+$/.test(num) && e.episodeNumber === Number(num)) return true;
  return [episodeLabel(e), e.title, e.arc].some((v) => v && v.toLowerCase().includes(needle));
}
