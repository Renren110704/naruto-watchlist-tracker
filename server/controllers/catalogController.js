import { ApiError } from '../utils/ApiError.js';
import { getCatalog, matchesQuery, serializeEpisode, serializeSeason, serializeSeries } from '../services/catalogService.js';
import { getUserState } from '../services/progressService.js';
import { EpisodeNote } from '../models/EpisodeNote.js';
import { serializeNote } from './notesController.js';

function tallyFor(list, progress) {
  const eps = list.filter((e) => e.kind === 'episode');
  const specials = list.filter((e) => e.kind === 'special');
  const watched = eps.filter((e) => progress.has(e._id.toString())).length;
  return {
    episodeCount: eps.length,
    specialCount: specials.length,
    watchedCount: watched,
    specialsWatched: specials.filter((e) => progress.has(e._id.toString())).length,
    percent: eps.length ? Math.round((watched / eps.length) * 1000) / 10 : 0,
  };
}

/**
 * Applies the shared list filters (status, kind, q, series, season) and optional
 * pagination. Order is always the original PDF watch order unless sort=recent.
 */
export function filterEpisodes(list, query, { progress }) {
  const { status = 'all', kind = 'all', q } = query;
  let out = list;
  if (kind !== 'all') out = out.filter((e) => e.kind === kind);
  if (status === 'watched') out = out.filter((e) => progress.has(e._id.toString()));
  if (status === 'unwatched') out = out.filter((e) => !progress.has(e._id.toString()));
  if (q) out = out.filter((e) => matchesQuery(e, q));
  return out;
}

export function paginate(list, { page, limit }) {
  const total = list.length;
  if (!limit) return { items: list, pagination: { page: 1, limit: total, total, totalPages: 1 } };
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(Math.max(1, page || 1), totalPages);
  return { items: list.slice((p - 1) * limit, p * limit), pagination: { page: p, limit, total, totalPages } };
}

async function findSeason(id) {
  const catalog = await getCatalog();
  const season = catalog.seasonByKey.get(id);
  if (!season) throw ApiError.notFound('Season not found');
  return { catalog, season };
}

export async function findEpisodeOr404(id) {
  const catalog = await getCatalog();
  const episode = catalog.episodeByKey.get(id);
  if (!episode) throw ApiError.notFound('Episode not found');
  return { catalog, episode };
}

export async function listSeries(req, res) {
  const catalog = await getCatalog();
  const { progress } = await getUserState(req.user._id);
  res.json({
    series: catalog.series.map((s) => ({
      ...serializeSeries(s),
      seasonCount: catalog.seasons.filter((x) => x.seriesKey === s.key).length,
      ...tallyFor(catalog.episodes.filter((e) => e.seriesKey === s.key), progress),
    })),
  });
}

export async function listSeasons(req, res) {
  const catalog = await getCatalog();
  const { progress } = await getUserState(req.user._id);
  const { series } = req.query;
  if (series && !catalog.seriesByKey.has(series)) throw ApiError.notFound('Series not found');
  const seasons = catalog.seasons.filter((s) => !series || s.seriesKey === series);
  res.json({
    seasons: seasons.map((s) => ({
      ...serializeSeason(s, catalog),
      ...tallyFor(catalog.episodesBySeason.get(s.key), progress),
    })),
  });
}

export async function getSeason(req, res) {
  const { catalog, season } = await findSeason(req.params.seasonId);
  const { progress } = await getUserState(req.user._id);
  const list = catalog.episodesBySeason.get(season.key);
  const idx = catalog.seasons.indexOf(season);
  const arcs = [...new Set(list.map((e) => e.arc).filter(Boolean))];
  res.json({
    season: {
      ...serializeSeason(season, catalog),
      ...tallyFor(list, progress),
      arcs,
      previous: idx > 0 ? serializeSeason(catalog.seasons[idx - 1], catalog) : null,
      next: idx < catalog.seasons.length - 1 ? serializeSeason(catalog.seasons[idx + 1], catalog) : null,
    },
  });
}

export async function listSeasonEpisodes(req, res) {
  const { catalog, season } = await findSeason(req.params.seasonId);
  const state = await getUserState(req.user._id);
  const filtered = filterEpisodes(catalog.episodesBySeason.get(season.key), req.query, state);
  res.json({
    season: serializeSeason(season, catalog),
    episodes: filtered.map((e) => serializeEpisode(e, catalog, state)),
  });
}

export async function listEpisodes(req, res) {
  const catalog = await getCatalog();
  const state = await getUserState(req.user._id);
  const { series, season } = req.query;
  let list = catalog.episodes;
  if (series) list = list.filter((e) => e.seriesKey === series);
  if (season) list = list.filter((e) => e.seasonKey === season);
  const { items, pagination } = paginate(filterEpisodes(list, req.query, state), req.query);
  res.json({ episodes: items.map((e) => serializeEpisode(e, catalog, state)), pagination });
}

export async function getEpisode(req, res) {
  const { catalog, episode } = await findEpisodeOr404(req.params.episodeId);
  const state = await getUserState(req.user._id);
  const note = await EpisodeNote.findOne({ userId: req.user._id, episodeId: episode._id }).lean();
  const i = catalog.position.get(episode._id.toString());
  const prev = catalog.episodes[i - 1];
  const next = catalog.episodes[i + 1];
  res.json({
    episode: serializeEpisode(episode, catalog, state),
    note: note ? serializeNote(note) : null,
    previous: prev ? serializeEpisode(prev, catalog, state) : null,
    next: next ? serializeEpisode(next, catalog, state) : null,
  });
}
