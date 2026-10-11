import { ApiError } from '../utils/ApiError.js';
import { getCatalog, serializeEpisode } from '../services/catalogService.js';
import { buildStats, getUserState, setWatched, setWatchedMany } from '../services/progressService.js';
import { filterEpisodes, findEpisodeOr404, paginate } from './catalogController.js';

export async function listProgress(req, res) {
  const catalog = await getCatalog();
  const state = await getUserState(req.user._id);
  const { series, season, sort = 'order' } = req.query;
  let list = catalog.episodes;
  if (series) list = list.filter((e) => e.seriesKey === series);
  if (season) list = list.filter((e) => e.seasonKey === season);
  list = filterEpisodes(list, req.query, state);
  if (sort === 'recent') {
    const at = (e) => new Date(state.progress.get(e._id.toString())?.watchedAt ?? 0).getTime();
    list = [...list].sort((a, b) => at(b) - at(a) || a.orderIndex - b.orderIndex);
  }
  const { items, pagination } = paginate(list, req.query);
  res.json({ episodes: items.map((e) => serializeEpisode(e, catalog, state)), pagination });
}

export async function updateEpisodeProgress(req, res) {
  const { catalog, episode } = await findEpisodeOr404(req.params.episodeId);
  const record = await setWatched(req.user._id, episode, req.body.watched);
  const state = await getUserState(req.user._id);
  res.json({
    episode: serializeEpisode(episode, catalog, state),
    progress: { watched: record.watched, watchedAt: record.watchedAt },
  });
}

export async function updateSeasonProgress(req, res) {
  const catalog = await getCatalog();
  const season = catalog.seasonByKey.get(req.params.seasonId);
  if (!season) throw ApiError.notFound('Season not found');
  const { watched, includeSpecials = true } = req.body;
  const episodes = catalog.episodesBySeason
    .get(season.key)
    .filter((e) => includeSpecials || e.kind === 'episode');
  await setWatchedMany(req.user._id, episodes, watched);
  res.json({ updated: episodes.length, watched });
}

export async function getStats(req, res) {
  res.json(await buildStats(req.user));
}
