import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Episode, Season, Series } from '../models/Catalog.js';
import { loadCatalog } from '../services/catalogLoader.js';
import { seedCatalog } from '../services/catalogSeeder.js';
import { validateCatalog } from '../services/catalogValidation.js';
import { setup, teardown } from './helpers.js';

before(() => setup({ seed: false }));
after(teardown);

describe('catalog JSON', () => {
  const catalog = loadCatalog();

  it('matches the episode counts stated in the PDFs', () => {
    const report = validateCatalog(catalog);
    assert.deepEqual(report.errors, []);
    const count = (key) => catalog.episodes.filter((e) => e.seriesKey === key && e.kind === 'episode').length;
    assert.equal(count('naruto'), 220);
    assert.equal(count('shippuden'), 500);
    assert.equal(count('boruto'), 293);
    assert.equal(catalog.seasons.length, 5 + 22 + 6);
  });

  it('flags duplicate numbers, missing titles and inconsistent seasons', () => {
    const broken = structuredClone(catalog);
    broken.episodes.push({ ...broken.episodes[0], key: 'naruto-dup', orderIndex: 99999 });
    broken.episodes.push({ ...broken.episodes[1], key: 'naruto-x', seasonKey: 'shippuden-s01', orderIndex: 99998 });
    broken.episodes.push({ key: 'sp-x', seriesKey: 'naruto', seasonKey: 'naruto-s01', kind: 'special', title: '', orderIndex: 99997 });
    const { errors } = validateCatalog(broken);
    assert.ok(errors.some((e) => /duplicate episode number 1/.test(e)));
    assert.ok(errors.some((e) => /belongs to shippuden/.test(e)));
    assert.ok(errors.some((e) => /Special sp-x has no title/.test(e)));
  });
});

describe('seeding', () => {
  it('is repeatable without creating duplicates', async () => {
    const catalog = loadCatalog();
    const first = await seedCatalog(catalog);
    assert.equal(first.episodes.inserted, 1036);
    const second = await seedCatalog(catalog);
    assert.equal(second.episodes.inserted, 0);
    assert.equal(second.episodes.updated, 0);
    assert.equal(await Series.countDocuments(), 3);
    assert.equal(await Season.countDocuments(), 33);
    assert.equal(await Episode.countDocuments(), 1036);
  });

  it('refuses to import an invalid catalog', async () => {
    const broken = structuredClone(loadCatalog());
    broken.episodes.pop();
    await assert.rejects(() => seedCatalog(broken), /failed validation/);
  });
});
