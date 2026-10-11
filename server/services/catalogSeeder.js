/**
 * Idempotent catalog import. Every series / season / episode is upserted on its
 * stable `key`, so running the seed repeatedly never creates duplicates and never
 * touches user progress or notes.
 */
import mongoose from 'mongoose';
import { Episode, Season, Series } from '../models/Catalog.js';
import { validateCatalog } from './catalogValidation.js';
import { invalidateCatalogCache } from './catalogService.js';

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

async function upsertAll(Model, docs) {
  if (!docs.length) return { inserted: 0, updated: 0 };
  const now = new Date();
  // timestamps: false so modifiedCount only reflects real content changes.
  const res = await Model.bulkWrite(
    docs.map((d) => ({
      updateOne: { filter: { key: d.key }, update: { $set: d, $setOnInsert: { createdAt: now } }, upsert: true },
    })),
    { ordered: true, timestamps: false },
  );
  return {
    inserted: res.upsertedCount,
    updated: res.modifiedCount,
    unchanged: docs.length - res.upsertedCount - res.modifiedCount,
  };
}

export async function seedCatalog(catalog, { prune = false } = {}) {
  const report = validateCatalog(catalog);
  if (report.errors.length) {
    const err = new Error(`Catalog failed validation:\n  - ${report.errors.join('\n  - ')}`);
    err.report = report;
    throw err;
  }

  await Promise.all([Series.init(), Season.init(), Episode.init()]);

  const seriesRes = await upsertAll(
    Series,
    catalog.series.map((s) => pick(s, ['key', 'title', 'sourceFile', 'airDates', 'statedSeasonCount', 'statedEpisodeCount', 'orderIndex'])),
  );
  const seriesIds = new Map((await Series.find({}, { key: 1 }).lean()).map((s) => [s.key, s._id]));

  const seasonRes = await upsertAll(
    Season,
    catalog.seasons.map((s) => ({
      ...pick(s, ['key', 'seriesKey', 'seasonNumber', 'title', 'subtitle', 'description', 'airDates', 'statedEpisodeCount', 'orderIndex']),
      seriesId: seriesIds.get(s.seriesKey),
    })),
  );
  const seasonIds = new Map((await Season.find({}, { key: 1 }).lean()).map((s) => [s.key, s._id]));

  // orderIndex is unique; if the order ever changes between imports, clear it first so
  // the bulk upsert cannot collide with a stale value on another episode.
  const existing = await Episode.find({}, { key: 1, orderIndex: 1 }).lean();
  const wanted = new Map(catalog.episodes.map((e) => [e.key, e.orderIndex]));
  if (existing.some((e) => wanted.has(e.key) && wanted.get(e.key) !== e.orderIndex)) {
    await Episode.updateMany({}, [{ $set: { orderIndex: { $multiply: ['$orderIndex', -1] } } }]);
  }

  const episodeRes = await upsertAll(
    Episode,
    catalog.episodes.map((e) => ({
      ...pick(e, ['key', 'seriesKey', 'seasonKey', 'kind', 'episodeNumber', 'title', 'description', 'arc', 'orderIndex']),
      specialType: e.specialType ?? null,
      seriesId: seriesIds.get(e.seriesKey),
      seasonId: seasonIds.get(e.seasonKey),
    })),
  );

  let pruned = { series: 0, seasons: 0, episodes: 0 };
  const stale = {
    series: existingKeysNotIn(await Series.find({}, { key: 1 }).lean(), catalog.series),
    seasons: existingKeysNotIn(await Season.find({}, { key: 1 }).lean(), catalog.seasons),
    episodes: existingKeysNotIn(await Episode.find({}, { key: 1 }).lean(), catalog.episodes),
  };
  if (prune) {
    pruned = {
      series: (await Series.deleteMany({ key: mongoose.trusted({ $in: stale.series }) })).deletedCount,
      seasons: (await Season.deleteMany({ key: mongoose.trusted({ $in: stale.seasons }) })).deletedCount,
      episodes: (await Episode.deleteMany({ key: mongoose.trusted({ $in: stale.episodes }) })).deletedCount,
    };
  }

  invalidateCatalogCache();
  const counts = {
    series: await Series.countDocuments(),
    seasons: await Season.countDocuments(),
    episodes: await Episode.countDocuments({ kind: 'episode' }),
    specials: await Episode.countDocuments({ kind: 'special' }),
  };
  return { series: seriesRes, seasons: seasonRes, episodes: episodeRes, stale, pruned, counts, validation: report };
}

function existingKeysNotIn(existing, wanted) {
  const keys = new Set(wanted.map((w) => w.key));
  return existing.map((e) => e.key).filter((k) => !keys.has(k));
}
