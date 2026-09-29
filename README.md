# Sidharth OS — Command Centre

A personal command centre for GATE 2027 prep, tasks, projects, career tracking, and knowledge
management. This is **Phase 1**: the original single-file app has been modularized into a proper
folder structure. Look and behavior are unchanged — only the file organization changed.

## Tech stack

- Vanilla JavaScript, ES Modules
- Vite (dev server + build)
- IndexedDB for local storage (no backend yet)

No frameworks. No new dependencies beyond Vite.

## Project structure

```
sidharth-os/
├── index.html            tiny shell, loads src/app/app.js
├── src/
│   ├── app/               boot, state, router, constants, event dispatch, errors
│   ├── database/          IndexedDB: schema, migrations, generic queries, export/import
│   ├── data/               GATE syllabus (ME/RA/GA) and the 91-day schedule — data only, no logic
│   ├── services/           one service per domain; the only thing pages are allowed to call
│   ├── pages/               one folder per view (dashboard, today, gate, career, projects, knowledge, calendar)
│   ├── components/         small reusable render/action helpers used by more than one page
│   ├── utils/               esc(), dates, formatting, calculations, dom helper, validation
│   └── styles/              tokens / base / layout / components / pages / responsive
├── package.json
└── vite.config.js
```

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Database architecture

IndexedDB database name is **`sidharthos`**, version **7** — unchanged from the original file, so
existing browser data keeps working with no migration.

```
src/database/
  db.js            opens the database, returns a singleton connection promise
  schema.js        DB_NAME, DB_VERSION, the list of stores and their keyPaths
  migrations.js     onupgradeneeded logic (idempotent: only creates missing stores)
  queries.js        generic get/put/delete/getAll/clear + createRepository(storeName)
  export-import.js  exportAllData() / importAllData() for JSON backups
```

### Stores

`tasks, gateTopics, meta, projects, mistakes, studySessions, pyqRecords, internships,
universities, skills, resumeEntries, events, resources, documents, notes, achievements`

UI code never touches IndexedDB directly. Every store is wrapped by `createRepository()` and
exposed through a **service** (see below). GATE-specific one-off migrations (topic seeding,
`gateSchemaV2`, `scheduleImported`) still live as flag checks in `meta`, exactly as before, and
now live in `src/services/gate-service.js`.

## GATE data

The syllabus and 91-day schedule are moved verbatim (byte-for-byte identical objects/arrays) into:

```
src/data/gate-me-syllabus.js   GATE_ME_SYLLABUS
src/data/gate-ra-syllabus.js   GATE_RA_SYLLABUS
src/data/gate-ga-syllabus.js   GATE_GA_SYLLABUS
src/data/gate-schedule.js      SCHEDULE_91, SCHED_SUBJ
```

`src/app/constants.js` combines the three syllabi into `SYLLABI = { ME, RA, GA }` for pages that
need to look up by paper code — same shape as the original `SYLLABI` global.

## How routing works

`src/app/router.js` keeps a plain `{ view: renderFn }` map. `navigate(view)` sets
`appState.view`, updates the active nav button, and calls `render()`, which finds the matching
`render*()` function in `src/pages/*` and swaps `#view`'s innerHTML. No routing framework —
this mirrors the original app's `setView()`/`render()` pair almost exactly.

## Event handling

The original app used `data-act` attributes and re-wired listeners after every render
(`wireEvents()`). That's replaced with **one delegated listener per event type** on `document`,
registered once at boot (`src/app/actions.js`):

```js
document.addEventListener('click',  ...);
document.addEventListener('change', ...);
document.addEventListener('focusout', ...); // topic notes autosave (was onblur)
```

Each page/component exports an `xActions` object shaped like `{ click: {...}, change: {...} }`
keyed by `data-act` value (or `#elementId` for the handful of buttons that used a raw `id`, like
`addTaskBtn`). `actions.js` merges them all into one registry and dispatches by key. A handler
that returns `false` skips the automatic re-render (used for things like an invalid/empty form
submission, matching the original's early `return`).

## How to add a page

1. Create `src/pages/<name>/<name>.js` exporting `async function render<Name>()` that returns an
   HTML string, plus an `<name>Actions` object for its `data-act` handlers.
2. Add the route to `src/app/router.js`'s `routes` map.
3. Add a nav entry to `NAV_ITEMS` in `src/app/constants.js` (sidebar + bottom nav render from it).
4. Register the actions object in `src/app/actions.js`.

## How to add a component

Add a file under `src/components/` that exports a pure render function (returns an HTML string)
and, if it has interactive elements, an `actions` object with the same `{ click, change }` shape
as pages. Import it from whichever page(s) use it. Only extract something into `components/` if
more than one page needs it — don't create a component for a single page's markup.

## How to add a database entity

1. Add the store name + keyPath to `STORES` in `src/database/schema.js`.
2. Bump `DB_VERSION` in the same file (a version bump is required for IndexedDB to create the
   new store — this is the one case where changing the version is correct).
3. Add `createRepository('yourStore')` inside the relevant file in `src/services/`.
4. Add it to `ALL_STORES` usage automatically — `schema.js`'s `ALL_STORES` derives from `STORES`,
   so backups pick it up for free.

## Future architecture (cloud sync)

```
Page
 ↓
Service        (src/services/*)
 ↓
Repository     (createRepository in src/database/queries.js)
 ↓
IndexedDB  →  later: Sync Adapter  →  Supabase
```

Pages only ever call a service method (`taskService.getTodayTasks()`, `gateService.topics.put(t)`,
etc.) — never `idbGet`/`idbPut`/`transaction` directly. When cloud sync is introduced, only
`src/database/` needs to change; every page, component, and service stays the same.
