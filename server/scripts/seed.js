/**
 * Imports data/catalog.json into MongoDB. Safe to run any number of times.
 *
 *   npm run seed                 # upsert the catalog
 *   npm run seed -- --prune      # also delete catalog entries no longer in the JSON
 *   npm run seed -- --file=path  # use a different catalog file
 */
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { loadCatalog } from '../services/catalogLoader.js';
import { seedCatalog } from '../services/catalogSeeder.js';

const args = process.argv.slice(2);
const prune = args.includes('--prune');
const file = args.find((a) => a.startsWith('--file='))?.slice('--file='.length);

if (!env.mongoUri) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

try {
  const catalog = loadCatalog(file);
  await connectDB(env.mongoUri, { retries: 1, log: { info: console.log, error: console.error } });
  const r = await seedCatalog(catalog, { prune });

  console.log('\nCatalog import complete');
  console.log(`  Series   : ${r.series.inserted} inserted, ${r.series.updated} updated, ${r.series.unchanged} unchanged`);
  console.log(`  Seasons  : ${r.seasons.inserted} inserted, ${r.seasons.updated} updated, ${r.seasons.unchanged} unchanged`);
  console.log(`  Episodes : ${r.episodes.inserted} inserted, ${r.episodes.updated} updated, ${r.episodes.unchanged} unchanged (incl. movies/OVAs)`);
  console.log(`  In database: ${r.counts.series} series, ${r.counts.seasons} seasons, ${r.counts.episodes} episodes, ${r.counts.specials} movies/OVAs/specials`);
  for (const w of r.validation.warnings) console.log(`  Note: ${w}`);
  const staleTotal = r.stale.series.length + r.stale.seasons.length + r.stale.episodes.length;
  if (staleTotal && !prune) {
    console.warn(`  ${staleTotal} catalog entries in the database are not in the JSON. Re-run with --prune to remove them.`);
  }
  if (prune) console.log(`  Pruned: ${JSON.stringify(r.pruned)}`);
} catch (err) {
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
}
