import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserEpisodeProgress } from '../models/UserEpisodeProgress.js';
import { setup, signedInClient, teardown } from './helpers.js';

let app;
let c;
before(async () => {
  app = await setup();
  c = await signedInClient(app);
});
after(teardown);

describe('catalog retrieval', () => {
  it('lists series and seasons in PDF order with counts', async () => {
    const { body } = await c.get('/api/series').expect(200);
    assert.deepEqual(body.series.map((s) => s.id), ['naruto', 'shippuden', 'boruto']);
    assert.deepEqual(body.series.map((s) => s.episodeCount), [220, 500, 293]);

    const seasons = (await c.get('/api/seasons').expect(200)).body.seasons;
    assert.equal(seasons.length, 33);
    assert.equal(seasons[0].id, 'naruto-s01');
    assert.equal(seasons[0].title, 'Season 1: 1st Stage');
    assert.equal(seasons[0].episodeCount, 35);
    assert.equal(seasons[0].specialCount, 1);
    const orders = seasons.map((s) => s.orderIndex);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));

    const shippuden = (await c.get('/api/seasons?series=shippuden').expect(200)).body.seasons;
    assert.equal(shippuden.length, 22);
  });

  it('returns season episodes in watch order including specials', async () => {
    const { body } = await c.get('/api/seasons/naruto-s01/episodes').expect(200);
    assert.equal(body.episodes.length, 36);
    const labels = body.episodes.map((e) => e.label);
    // Regular episodes read "Episode N", or "Episode N: Title" once a title is added to the catalog.
    assert.match(labels[0], /^Episode 1(: .+)?$/);
    assert.equal(labels[12], 'Find the Crimson Four-Leaf Clover! (OVA)');
    assert.match(labels[13], /^Episode 13(: .+)?$/);
    assert.equal(body.episodes[5].arc, 'Land of Waves Escort');
  });

  it('searches by number, arc and special title; paginates', async () => {
    const byNum = (await c.get('/api/episodes?series=shippuden&q=121').expect(200)).body.episodes;
    assert.deepEqual(byNum.map((e) => e.id), ['shippuden-e121']);
    const byArc = (await c.get('/api/seasons/naruto-s01/episodes?q=waves').expect(200)).body.episodes;
    assert.equal(byArc.filter((e) => e.kind === 'episode').length, 14);
    const movies = (await c.get('/api/episodes?kind=special&q=movie').expect(200)).body.episodes;
    assert.ok(movies.length >= 10);
    const page = (await c.get('/api/episodes?limit=50&page=2').expect(200)).body;
    assert.equal(page.episodes.length, 50);
    assert.equal(page.pagination.total, 1036);
    assert.equal(page.episodes[0].orderIndex, 51);
  });

  it('returns episode details with neighbours and 404s for unknown ids', async () => {
    const { body } = await c.get('/api/episodes/naruto-e013').expect(200);
    assert.equal(body.episode.season.id, 'naruto-s01');
    assert.equal(body.previous.kind, 'special');
    assert.equal(body.next.id, 'naruto-e014');
    assert.equal(body.note, null);
    await c.get('/api/episodes/naruto-e999').expect(404);
    await c.get('/api/seasons/nope').expect(404);
    await c.get('/api/episodes/%24where').expect(422);
  });

  it('validates list filters', async () => {
    const res = await c.get('/api/episodes?status=sometimes');
    assert.equal(res.status, 422);
  });
});

describe('watch progress', () => {
  it('marks watched / unwatched without duplicate records and updates stats', async () => {
    await c.patch('/api/progress/naruto-e001').send({ watched: true }).expect(200);
    const again = await c.patch('/api/progress/naruto-e001').send({ watched: true }).expect(200);
    assert.equal(again.body.episode.watched, true);
    assert.equal(await UserEpisodeProgress.countDocuments({ userId: c.user.id }), 1);

    let stats = (await c.get('/api/progress/stats').expect(200)).body;
    assert.equal(stats.overall.total, 1013);
    assert.equal(stats.overall.watched, 1);
    assert.equal(stats.overall.remaining, 1012);
    assert.equal(stats.continueWatching.id, 'naruto-e002');
    assert.equal(stats.recent[0].id, 'naruto-e001');

    await c.patch('/api/progress/naruto-e001').send({ watched: false }).expect(200);
    stats = (await c.get('/api/progress/stats').expect(200)).body;
    assert.equal(stats.overall.watched, 0);
    assert.equal(stats.recent.length, 0);
    assert.equal(stats.continueWatching.id, 'naruto-e001');
  });

  it('rejects invalid progress payloads', async () => {
    await c.patch('/api/progress/naruto-e001').send({ watched: 'yes' }).expect(422);
    await c.patch('/api/progress/naruto-e001').send({}).expect(422);
    await c.patch('/api/progress/naruto-e999').send({ watched: true }).expect(404);
  });

  it('tracks per-season progress, bulk updates and continue-watching', async () => {
    await c.patch('/api/progress/seasons/naruto-s01').send({ watched: true }).expect(200);
    const stats = (await c.get('/api/progress/stats').expect(200)).body;
    const s1 = stats.seasons.find((s) => s.id === 'naruto-s01');
    assert.equal(s1.watched, 35);
    assert.equal(s1.percent, 100);
    assert.equal(s1.specialsWatched, 1);
    assert.equal(stats.overall.watched, 35);
    assert.equal(stats.overall.percent, 3.5);
    assert.equal(stats.continueWatching.id, 'naruto-e036');

    const watched = (await c.get('/api/progress?status=watched&limit=10').expect(200)).body;
    assert.equal(watched.pagination.total, 36);
    const unwatched = (await c.get('/api/progress?status=unwatched&series=naruto').expect(200)).body;
    assert.equal(unwatched.episodes[0].id, 'naruto-e036');

    const seasons = (await c.get('/api/seasons?series=naruto').expect(200)).body.seasons;
    assert.equal(seasons[0].watchedCount, 35);
    assert.equal(seasons[1].watchedCount, 0);
  });

  it('skips specials in continue-watching when the preference is off', async () => {
    // Watch up to just before the season-2 OVA (after episode 63).
    for (let n = 36; n <= 63; n++) {
      await c.patch(`/api/progress/naruto-e${String(n).padStart(3, '0')}`).send({ watched: true }).expect(200);
    }
    let stats = (await c.get('/api/progress/stats').expect(200)).body;
    assert.equal(stats.continueWatching.id, 'naruto-s02-sp1');
    await c.patch('/api/auth/me').send({ preferences: { includeSpecials: false } }).expect(200);
    stats = (await c.get('/api/progress/stats').expect(200)).body;
    assert.equal(stats.continueWatching.id, 'naruto-e064');
  });
});
