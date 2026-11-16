# TUZA BIBLE+HYMNAL

Production-ready offline-first PWA for Bible reading and hymn singing, built for REGIS COMMUNITY.
One Node/Express service serves both the API and the built React app, so a single Render web service
(including the free plan) is enough for the whole product.

## Stack

- **Frontend** — React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Dexie 4
- **Backend** — Node.js, Express 5, compression, CORS, dotenv
- **PWA** — `vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'autoUpdate'`), web app manifest,
  custom 192/512/maskable PNG icons
- **Offline data** — precached `data/library.json` + IndexedDB via Dexie (`TuzaBibleHymnalDB`)

## Project layout

```
.
├── render.yaml              # Render blueprint: build + start + health check
├── package.json             # workspace root: dev / build / start scripts
├── backend/
│   └── server.js            # API, static dist/, SPA fallback, PORT || 10000
└── frontend/
    ├── vite.config.ts       # React, Tailwind, PWA manifest + Workbox precache
    ├── scripts/generate-icons.mjs
    ├── public/
    │   ├── data/library.json    # Bible/hymnal payload — precached for offline use
    │   └── icons/               # 192 / 512 / maskable / apple-touch PNG icons
    └── src/
        ├── db.ts            # Dexie schema, JSON sync, offline seeding
        ├── i18n.ts          # Kinyarwanda / English / Kiswahili / French
        ├── data/books.ts    # 66 shared books + 7 Deuterocanonical book records
        ├── pages/           # Home (two-column split), Bible, Hymns
        └── components/      # hero illustration, header controls, fixed footer
```

## Local development

```bash
npm install          # installs both workspaces from the root
npm run dev          # Express API on :10000 + Vite dev server on :5173
```

Open http://localhost:5173. The dev server proxies `/api` to the Express server on port 10000.
The PWA service worker is generated for production builds (`build` / `preview`), not the dev server.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs backend (`nodemon`) and frontend (`vite`) together |
| `npm run dev:client` | Frontend only (port 5173) |
| `npm run dev:server` | Backend only (port 10000) |
| `npm run build` | Type-checks and builds the PWA into `frontend/dist` |
| `npm start` | Starts Express on `PORT` (default 10000), serving `dist/` and the API |
| `npm run preview` | Vite preview of the built PWA (service worker active) |

## Production / Render

The app is a single web service. `render.yaml` defines it:

- **Build**: `npm ci --include=dev && npm run build`
- **Start**: `npm start`
- **Health check**: `/api/health`
- **Port**: Express listens on `process.env.PORT || 10000`, which matches Render's injected port.

Deploying:

1. Push this repository to GitHub/GitLab.
2. In Render choose **New → Blueprint** and select the repo (or create a Web Service manually with the
   build/start commands above and runtime **Node**).
3. Deploy. No environment variables or database are required — `PORT` is provided by Render.
4. Open the `https://<service>.onrender.com` URL. The free plan may sleep after inactivity; the first
   request after a sleep takes a few seconds, then everything is served from the service.

Locally simulate production with:

```bash
npm run build
PORT=10000 npm start     # http://localhost:10000
```

### Production server behaviour

- Serves `frontend/dist` with SPA fallback: every non-`/api` route returns `index.html`.
- Hashed `/assets/*` files are cached for a year (`immutable`); `index.html`, `sw.js` and the manifest
  are always revalidated so updates land immediately.
- Compression, `nosniff`, `X-Frame-Options: SAMEORIGIN` and a `Referrer-Policy` header are enabled.
- Unknown `/api/*` routes return JSON `404`; a missing build returns `503` instead of a blank page.
- Graceful shutdown on `SIGTERM`/`SIGINT` for Render restarts.

## True offline behaviour

On the first online visit, Workbox precaches the app shell plus the whole content payload:

- `index.html`, JS, CSS, fonts, icons and `data/library.json`
- `data/bibles/*.json` and `data/hymnals/*.json` (all four languages)
- `manifest.webmanifest`, favicon and maskable/apple icons

`data/library.json` is fetched by the app on startup and written into IndexedDB (Dexie) with a version
marker. After that first load — or after installing the app — re-opening the URL or the installed app
works with **no network at all**: the service worker serves the shell and JSON from its precache, and
scripture/hymn pages read from IndexedDB.

`registerType: 'autoUpdate'` (plus `clientsClaim`/`skipWaiting`) means a new deployment activates on the
next load without a manual refresh, and old caches are cleaned up.

Install it for free from the browser:

- **Windows** — Chrome/Edge address bar install icon → Install TUZA BIBLE+HYMNAL
- **Android** — Chrome menu → Add to Home screen / Install app
- **iOS** — Safari → Share → Add to Home Screen (uses the apple-touch icon and standalone display)

The language selector (top right) switches Kinyarwanda → English → Kiswahili → French instantly and is
remembered in `localStorage`.

## Updating Bible / hymnal content

Edit `frontend/public/data/library.json` — it is the single source for the app and for `/api/library`:

```json
{
  "version": 2,
  "books":  [{ "id": 1, "name": "Itangiriro", "englishName": "Genesis", "abbreviation": "Int", "chapters": 50, "testament": "old" }],
  "verses": [{ "bookId": 1, "chapter": 1, "verse": 1, "text": "..." }],
  "hymns":  [{ "number": 1, "title": "Imana y'Ubuntu", "lyrics": "...", "chorus": "...", "category": "praise" }]

`category` is `"praise"` or `"salvation"`; `chorus` is optional and is shown under every stanza.
Supported fields on each book: `id`, `name`, `englishName`, `abbreviation`, `chapters`, `testament`.
}
```

- `bookId` is the 1-based canonical position (Genesis = 1, Psalms = 19, John = 43).
- **Bump `version`** whenever content changes; clients replace their IndexedDB verses/hymns when they
  see a newer version. The service worker also refreshes the precached JSON automatically.
- The shipped file contains 73 book records plus sample verses (Genesis 1, Psalm 23, John 3) and
  8 hymns so the app is fully functional out of the box.

### Per-language offline bundles

Complete texts now ship as per-language bundles under `frontend/public/data/`:

- `bibles/{rw,en,sw,fr}.json` — normalized `{ version, language, source, books: [{ id, name, englishName, abbreviation, testament, chapters, chapters_data: [{ chapter, verses: [{ verse, text }] }] }] }`
- `hymnals/{rw,en,sw,fr}.json` — `{ version, language, collections: { praise: [...], salvation: [...] } }`, each hymn `{ number, title, chorus, stanzas, translated }`

Regenerate them with the importer scripts:

```bash
node frontend/scripts/import-bible.mjs --lang=en   # or --all
node frontend/scripts/import-hymnals.mjs
```

`import-bible.mjs` pulls public-domain sources: English (KJV) and Kiswahili (SRUV) from `thiagobodruk/bible`,
Kinyarwanda (Bibiliya Yera, BYSB 2001) from `inezabonte/bysb`, and French (Louis Segond 1910) from
`midvash/bible-data`. The shipped English bundle additionally merges the seven Deuterocanonical books from the
KJV + Apocrypha (`en_kjva`) source. Kinyarwanda, Kiswahili and French show the 73-book Catholic canon but only
have text for the shared 66 books. Review each source's license before redistributing a bundle.

Each bundle carries its own `version`; clients re-sync the affected language into IndexedDB when it changes.

## API

| Route | Description |
| --- | --- |
| `GET /api/health` | Service health / Render check |
| `GET /api/library` | Full books, verses and hymns payload |
| `GET /api/bible/books` | Book metadata only |
| `GET /api/hymns` | Hymns only |
