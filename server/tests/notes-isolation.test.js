import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EpisodeNote } from '../models/EpisodeNote.js';
import { setup, signedInClient, teardown } from './helpers.js';

let app;
let alice;
let bob;
before(async () => {
  app = await setup();
  alice = await signedInClient(app);
  bob = await signedInClient(app);
});
after(teardown);

const note = {
  summary: 'Team 7 takes the bell test.',
  favoriteScene: 'One Thousand Years of Death',
  characters: [
    { name: 'Kakashi Hatake', status: 'introduced', affiliation: 'Leaf / Team 7 leader', description: 'Reads books mid-fight' },
  ],
  jutsu: [
    { name: 'Shadow Clone Jutsu', category: 'Ninjutsu', usedBy: 'Naruto', description: 'Solid clones', status: 'new-use' },
  ],
  openQuestions: 'What is under the mask?',
  rating: 5,
};

describe('episode notes', () => {
  it('validates input', async () => {
    const empty = await alice.post('/api/episodes/naruto-e004/notes').send({});
    assert.equal(empty.status, 422);
    const bad = await alice.post('/api/episodes/naruto-e004/notes').send({
      rating: 9,
      characters: [{ name: '' }],
      jutsu: [{ name: 'Rasengan', status: 'ancient' }],
      summary: 'x'.repeat(5001),
    });
    assert.equal(bad.status, 422);
    const d = bad.body.error.details;
    assert.ok(d.rating && d['characters[0].name'] && d['jutsu[0].status'] && d.summary);
    await alice.post('/api/episodes/naruto-e999/notes').send(note).expect(404);
  });

  it('creates, reads, updates and deletes notes', async () => {
    const created = await alice.post('/api/episodes/naruto-e004/notes').send(note).expect(201);
    assert.equal(created.body.note.characters[0].name, 'Kakashi Hatake');
    assert.equal(created.body.note.jutsu[0].status, 'new-use');
    await alice.post('/api/episodes/naruto-e004/notes').send(note).expect(409);

    const read = (await alice.get('/api/episodes/naruto-e004/notes').expect(200)).body.note;
    assert.equal(read.rating, 5);

    const updated = await alice.put('/api/episodes/naruto-e004/notes').send({
      ...note,
      rating: 4,
      characters: [...note.characters, { name: 'Sakura Haruno', status: 'development' }],
      jutsu: [],
    }).expect(200);
    assert.equal(updated.body.note.rating, 4);
    assert.equal(updated.body.note.characters.length, 2);
    assert.equal(updated.body.note.jutsu.length, 0);

    const details = (await alice.get('/api/episodes/naruto-e004').expect(200)).body;
    assert.equal(details.episode.hasNotes, true);
    assert.equal(details.note.characters[1].name, 'Sakura Haruno');

    await alice.delete('/api/episodes/naruto-e004/notes').expect(200);
    await alice.get('/api/episodes/naruto-e004/notes').expect(404);
    await alice.delete('/api/episodes/naruto-e004/notes').expect(404);
    await alice.put('/api/episodes/naruto-e004/notes').send(note).expect(404);
  });

  it('searches notes by episode, character and jutsu', async () => {
    await alice.post('/api/episodes/naruto-e005/notes').send(note).expect(201);
    await alice.post('/api/episodes/shippuden-e001/notes').send({ summary: 'Two and a half years later', jutsu: [{ name: 'Rasengan' }] }).expect(201);
    const all = (await alice.get('/api/notes').expect(200)).body.notes;
    assert.equal(all.length, 2);
    assert.equal((await alice.get('/api/notes?q=kakashi').expect(200)).body.notes.length, 1);
    assert.equal((await alice.get('/api/notes?q=rasengan').expect(200)).body.notes[0].episode.id, 'shippuden-e001');
    assert.equal((await alice.get('/api/notes?q=episode 5').expect(200)).body.notes.length, 1);
    assert.equal((await alice.get('/api/notes?sort=order').expect(200)).body.notes[0].episode.id, 'naruto-e005');
  });
});

describe('user data isolation', () => {
  it("never exposes or modifies another user's notes or progress", async () => {
    await alice.patch('/api/progress/naruto-e005').send({ watched: true }).expect(200);

    assert.equal((await bob.get('/api/notes').expect(200)).body.notes.length, 0);
    await bob.get('/api/episodes/naruto-e005/notes').expect(404);
    const details = (await bob.get('/api/episodes/naruto-e005').expect(200)).body;
    assert.equal(details.note, null);
    assert.equal(details.episode.watched, false);
    assert.equal(details.episode.hasNotes, false);
    assert.equal((await bob.get('/api/progress/stats').expect(200)).body.overall.watched, 0);

    // Bob's writes only ever touch Bob's documents.
    await bob.delete('/api/episodes/naruto-e005/notes').expect(404);
    await bob.post('/api/episodes/naruto-e005/notes').send({ summary: 'Bob was here' }).expect(201);
    const aliceNote = (await alice.get('/api/episodes/naruto-e005/notes').expect(200)).body.note;
    assert.equal(aliceNote.summary, note.summary);
    assert.equal(await EpisodeNote.countDocuments({ userId: alice.user.id }), 2);
    assert.equal(await EpisodeNote.countDocuments({ userId: bob.user.id }), 1);
    assert.equal((await alice.get('/api/progress/stats').expect(200)).body.overall.watched, 1);
  });

  it('ignores operator-injection attempts in bodies and queries', async () => {
    const res = await alice.post('/api/auth/signin').send({ email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 422);
    const q = await alice.get('/api/notes?q[$ne]=x');
    assert.ok([200, 422].includes(q.status));
  });
});
