# Naruto Watchlist Tracker

A full-stack MERN app for tracking every **Naruto**, **Naruto: Shippuden** and **Boruto** episode and keeping
a private "ninja journal" of recaps, characters and jutsu.

- **Catalog from your PDFs**: 3 series, 33 seasons, 1,013 episodes and 23 movies/OVAs, in the original watch order
  ([how it was extracted](docs/catalog-extraction.md)).
- **Auth**: sign up, sign in and log out. JWT lives in an httpOnly cookie, bcrypt hashes passwords and a double-submit CSRF token protects writes.
- **Dashboard**: live stats, completion ring, Continue Watching, recently watched, per-series progress.
- **Browse**: series and season picker with progress, episodes grouped by arc, search, watched/unwatched filter, bulk season actions.
- **Tracker**: per-series and per-season progress, plus paginated watched and unwatched lists.
- **Episode notes ("What Did You Learn?")**: story notes, any number of characters and jutsu, lore, open questions and a 1–5 star rating.
- **My Notes**: search by episode, character or jutsu name.
- **Profile**: edit username and email, a Continue Watching preference, change password (signs out other sessions), delete account.

```
Naruto Watchlist Tracker/
├── client/               React 19 + Vite + Tailwind v4 + React Router + Axios
│   └── src/{components,context,hooks,layouts,pages,services,utils}
├── server/               Express 5 + Mongoose 9
│   ├── config/ controllers/ middleware/ models/ routes/ services/
│   ├── scripts/          extract-catalog.js · validate-catalog.js · seed.js
│   ├── data/catalog.json generated from the PDFs (catalog only, no user data)
│   └── tests/            node:test + supertest + in-memory MongoDB
├── docs/
│   ├── source-pdfs/      copies of the three source PDFs
│   └── catalog-extraction.md
├── .env.example
└── package.json          convenience scripts for both apps
```

## Prerequisites

- **Node.js 20.11+** (developed on Node 24)
- **MongoDB 6+**: a local install, Docker, or a free MongoDB Atlas cluster

## 1. Install

```bash
npm run install:all
```

This installs dependencies for the root (only `concurrently`), `server/` and `client/`.

## 2. Configure environment

Copy the example file into `server/` and fill it in:

```bash
cp .env.example server/.env
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | e.g. `mongodb://127.0.0.1:27017/naruto_watchlist` or your Atlas URI |
| `JWT_SECRET` | yes | at least 32 random characters (see the command below) |
| `JWT_EXPIRES_IN` | no | session length, default `7d` |
| `PORT` | no | API port, default `5000` |
| `CLIENT_URL` | no | allowed CORS origin, default `http://localhost:5173` |
| `NODE_ENV` | no | `development` / `production` / `test` |
| `BCRYPT_ROUNDS` | no | default `12` |
| `COOKIE_SECURE` | no | defaults to `true` in production (HTTPS required) |
| `VITE_API_PROXY_TARGET` | no | where the Vite dev server proxies `/api`, default `http://localhost:5000` |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The real `.env` is git-ignored. Never commit it.

## 3. MongoDB setup

Pick one:

- **Local install (Windows)**: install MongoDB Community Server and make sure the `MongoDB` service is running
  (`services.msc`, or run `net start MongoDB` in an Administrator terminal).
- **Docker**: `docker run -d --name naruto-mongo -p 27017:27017 mongo:7`
- **Atlas**: create a free cluster, add a database user and your IP, and paste the `mongodb+srv://…` URI into `MONGODB_URI`.

## 4. Seed the catalog

```bash
npm run seed
```

This imports `server/data/catalog.json` into the `series`, `seasons` and `episodes` collections and prints how many
entries were inserted, updated and left unchanged. The script is **idempotent**: every entry is upserted on a
stable key (`naruto-s01`, `shippuden-e121`, …), so you can re-run it safely. It never touches user progress or notes.
It also refuses to import if the catalog fails validation.

Other catalog commands:

```bash
npm run validate:catalog
```

```bash
npm run extract:catalog
```

```bash
npm run seed -- --prune
```

`validate:catalog` checks the JSON for duplicate or missing episode numbers, inconsistent seasons and count mismatches against the PDFs.
`extract:catalog` regenerates the JSON from `docs/source-pdfs/*.pdf`. `seed -- --prune` also removes catalog entries that are no longer in the JSON.

## 5. Run in development

Start the API (port 5000) and the web app (port 5173) together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the API, so the auth cookie is first-party.
If port 5173 is taken, Vite picks the next free port. That still works, because the proxy keeps requests same-origin.

## 6. Run tests

```bash
npm test
```

The 26 API tests use `mongodb-memory-server`, which downloads a MongoDB binary on first run, so no database setup is needed.
They cover:

- sign-up/sign-in validation, cookies, never returning password hashes
- protected routes, CSRF rejection, tampered/expired/revoked tokens
- season and episode retrieval, ordering, search, pagination
- watched/unwatched toggles, no duplicate progress records, stats, Continue Watching, bulk season updates
- note create/read/update/delete, validation errors, search
- **user data isolation** (one user can never read or change another's progress or notes)
- catalog validation and **repeatable seeding** without duplicates

Lint the client with `npm run lint`.

## Production build

```bash
npm run build
```

Then set `NODE_ENV=production` in `server/.env` and start the API:

```bash
npm start
```

In production, Express serves `client/dist` and the API from the same origin. Cookies are marked `Secure`, so serve it over HTTPS
(or set `COOKIE_SECURE=false` for a local trial). Stack traces are never sent to clients.

## API overview

All routes except `/api/health` and `/api/auth/{csrf,signup,signin,logout}` require authentication.
Every `POST/PUT/PATCH/DELETE` request must send the `X-CSRF-Token` header (get one from `GET /api/auth/csrf`).
Errors look like `{ "error": { "message", "code", "details?" } }`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Issue CSRF token |
| POST | `/api/auth/signup` | `{ username, email, password, confirmPassword }` |
| POST | `/api/auth/signin` | `{ email, password }` |
| POST | `/api/auth/logout` | Clear session cookie |
| GET / PATCH / DELETE | `/api/auth/me` | Current user / update profile & preferences / delete account (`{ password }`) |
| PATCH | `/api/auth/password` | `{ currentPassword, newPassword, confirmPassword }` |
| GET | `/api/series` | Series with counts and your progress |
| GET | `/api/seasons?series=` | Seasons in PDF order with counts and your progress |
| GET | `/api/seasons/:seasonId` | Season details, arcs, neighbours |
| GET | `/api/seasons/:seasonId/episodes?status=&q=&kind=` | Episodes in watch order |
| GET | `/api/episodes?series=&season=&status=&q=&kind=&page=&limit=` | Paginated catalog |
| GET | `/api/episodes/:episodeId` | Episode, your note, previous/next |
| GET | `/api/progress?status=&series=&sort=order\|recent&page=&limit=` | Tracker lists |
| PATCH | `/api/progress/:episodeId` | `{ watched: boolean }` |
| PATCH | `/api/progress/seasons/:seasonId` | `{ watched, includeSpecials? }` bulk update |
| GET | `/api/progress/stats` | Totals, per-series/season progress, continue watching, recent |
| GET / POST / PUT / DELETE | `/api/episodes/:episodeId/notes` | Your notes for one episode |
| GET | `/api/notes?q=&sort=updated\|order\|rating&page=&limit=` | All your notes, searchable |

IDs in URLs are the stable catalog keys, e.g. `naruto-s01` or `shippuden-e121`.

### Data model

- `User`: username (case-insensitive unique), email (unique), passwordHash (never selected by default), tokenVersion, preferences
- `Series`, `Season`, `Episode`: catalog only, each with a unique `key` and an `orderIndex`.
  `Episode.kind` is `episode` or `special`, plus `specialType` (`movie`/`ova`/`special`), `episodeNumber`, `title` (null when absent from the PDFs), `arc`
- `UserEpisodeProgress`: `{ userId, episodeId, watched, watchedAt }` with a **unique index on (userId, episodeId)**
- `EpisodeNote`: one per user and episode (**unique (userId, episodeId)**), with story fields, `characters[]`
  (`name`, `status: introduced|revealed|development`, `affiliation`, `description`), `jutsu[]` (`name`, `category`,
  `usedBy`, `description`, `status: new|new-use`), learning fields and `rating` 1–5

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid configuration: MONGODB_URI is not set` | Create `server/.env` from `.env.example`. |
| `JWT_SECRET must be at least 32 characters` | Generate one with the command in step 2. |
| API logs `MongoDB connection attempt … failed: ECONNREFUSED` | MongoDB isn't running or the URI is wrong. The API keeps retrying every 5 s and answers `503` until it connects. |
| Windows: `MongoDB` service exists but won't start | Start it from an Administrator terminal (`net start MongoDB`). If it fails, `mongod.exe` may be missing, so reinstall MongoDB Community Server or use Docker or Atlas. |
| Every page says "Cannot reach the server" | The API isn't running on port 5000, or `VITE_API_PROXY_TARGET` points somewhere else. |
| Signed out immediately / `Security token missing or invalid` | Clear the site's cookies and reload. The client fetches a fresh CSRF token automatically. |
| Browse shows no seasons | Run `npm run seed`. |
| Login works locally over HTTP in production mode but the cookie isn't kept | Production cookies are `Secure`. Use HTTPS or set `COOKIE_SECURE=false` for local trials. |
| Tests hang on first run | `mongodb-memory-server` is downloading MongoDB (about 100 MB). Let it finish once. |

---

Fan-made project for personal use. Not affiliated with the creators or publishers of *Naruto*.
