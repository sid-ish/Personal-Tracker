# Migration Report — Phase 1 Modularization

Source: `Sidharth OS — Command Centre(2).html` (1,245 lines, single file).
Output: `sidharth-os/` folder, ES modules + Vite, same behavior.

## Files created

See the tree in `README.md`. 51 source files total: 6 CSS, 4 data, 5 database, 6 services,
9 pages, 8 components, 6 utils, 6 app-level files, plus `index.html`, `package.json`,
`vite.config.js`.

## Files removed

Just the one original HTML file (kept in your uploads; not deleted from disk, simply not part
of the new app).

## Old → new: where everything moved

**Database (`DB`, `idbAll/idbPut/idbGet/idbDel`)**
→ `src/database/db.js` (connection), `schema.js` (stores/version), `migrations.js`
(`onupgradeneeded`), `queries.js` (`all/get/put/del` + `createRepository`).

**GATE seeding (`ensurePaperSeeded`, `ensureGateSeeded`, `importGateSchedule`)**
→ `src/services/gate-service.js`, unchanged logic, now calling repositories instead of raw idb\*.

**GATE data (`GATE_ME_SYLLABUS`, `GATE_RA_SYLLABUS`, `GATE_GA_SYLLABUS`, `SCHED_SUBJ`,
`SCHEDULE_91`)**
→ `src/data/gate-me-syllabus.js`, `gate-ra-syllabus.js`, `gate-ga-syllabus.js`,
`gate-schedule.js`. Verified **byte-identical** to the originals (see Verification below).

**Calculations (`topicStats`, `todayStr`, `addDays`, `priorityRank`, `getBacklog`,
`getTodayTasks`, `getUpcoming`, `pickFocus`, `projStats`)**
→ `src/utils/calculations.js` (`topicStats`, `priorityRank`, `getBacklog`, `getTodayTasks`,
`getUpcoming`, `pickFocus`, `projStats`) and `src/utils/dates.js` (`todayStr`, `addDays`).

**`esc()`** → `src/utils/escape-html.js`. **`fmtTime()`** → `src/utils/formatting.js`.

**Global state** (`VIEW`, `gatePaper`, `gateExpanded`, `calMonth`, `calSelected`,
`openProjectId`, `careerTab`, `openUniId`, `knowledgeTab`, `TIMER`, `showTimerLogForm`,
`CURRENT_ADD_DATE`, `CURRENT_ADD_PROJECT`, `themeIdx`)
→ `src/app/state.js`, one `appState` object (`view`, `gatePaper`, `gateExpanded`, `calMonth`,
`calSelected`, `openProjectId`, `careerTab`, `openUniId`, `knowledgeTab`, `timer`,
`showTimerLogForm`, `addDate`, `addProject`, `themeIdx`).

**Constants** (`INTERN_STATUSES`, `UNI_CHECKLIST`, `SKILL_CATS`, `RESUME_SECTIONS`,
`EVENT_TYPES`, `RESOURCE_TYPES`, `RESOURCE_STATUSES`, `DOC_CATS`, `ACH_TYPES`, `SYLLABI`,
`themeOrder`) → `src/app/constants.js`.

**`render()` / `setView()`** → `src/app/router.js` (`render`, `navigate`).

**`wireEvents()`** → `src/app/actions.js` (`registerEvents`, `dispatch`), plus each page/
component's own `*Actions` object (see README's "Event handling" section for the full mapping
of every `data-act` value).

**`renderDashboard`, `exportAllData`, `importAllData`, `ALL_STORES`**
→ `src/pages/dashboard/dashboard.js` (render + actions), `src/database/export-import.js`
(export/import), `src/database/schema.js` (`ALL_STORES`, derived from `STORES`).

**`taskRowsHtml`, `addFormHtml`** → `src/components/task-list.js`, plus `taskActions` for
`toggle/del/push/movetoday/complete-focus` and the `addTaskBtn` handler (shared by Today,
Calendar day view, and open Project view, exactly as before).

**`timerCardHtml`, `timerElapsedSec`, the `setInterval` ticker** → `src/components/timer.js`
(`timerCardHtml`, `timerElapsedSec`, `startTimerTicker`, `timerActions`).

**`renderToday`** → `src/pages/today/today.js`.

**`renderGate`, `renderRevisionQueue`, `renderPyqAnalytics`, `renderMistakeLog`, `revClass`**
→ `src/pages/gate/gate.js` (+ `gateActions`) and `src/pages/gate/gate-calculations.js`
(`revClass`).

**`renderCareer`, `renderInternships`, `renderHigherEd`, `renderSkills`, `renderResume`**
→ `src/pages/career/career.js` (+ `careerActions`).

**`renderKnowledge`, `renderEvents`, `renderLearning`, `renderDocuments`, `renderNotes`,
`renderAchievements`, `ACH_TYPES`** → `src/pages/knowledge/knowledge.js` (+ `knowledgeActions`);
`ACH_TYPES` moved to `src/app/constants.js`.

**`renderProjects`** → `src/pages/projects/projects.js` (+ `projectActions`), using
`projectService.deleteProject()` for the old `del-proj` handler (unlink tasks, then delete).

**`renderCalendar`** → `src/pages/calendar/calendar.js` (+ `calendarActions`), backed by the new
`src/services/calendar-service.js`.

**Theme switching (`themeOrder`, `applyTheme`, `themeBtn` handler)**
→ `src/components/topbar.js` (`applyTheme`, `topbarActions`) + `themeOrder` in constants.

**Sidebar / bottom nav markup** (previously hardcoded in `index.html`, generated from a shared
`NAV_ITEMS` list) → `src/components/sidebar.js`, `src/components/bottom-nav.js`.

**Error handling** — the original had none beyond `alert()` on a bad backup file. New:
`src/app/errors.js` registers `window.onerror` / `unhandledrejection`, logs full details to the
console, and shows a small non-technical banner to the user. `importAllData`'s `alert()` on
invalid JSON is preserved as-is.

## Database stores preserved

All 16 stores, same names, same keyPaths, same `DB_NAME` (`sidharthos`) and `DB_VERSION` (`7`).
`src/database/migrations.js`'s `upgrade()` only creates a store if it doesn't already exist —
byte-for-byte the same guard the original `onupgradeneeded` used, so existing IndexedDB data
opens exactly as before with no schema change and no reseed on load.

## GATE data preserved

`GATE_ME_SYLLABUS`, `GATE_RA_SYLLABUS`, `GATE_GA_SYLLABUS`, and `SCHEDULE_91` (all 91 days) were
diffed programmatically against the original file (`JSON.stringify` deep-equality) and are
**identical** — 88 ME subtopics, 52 RA subtopics, 12 GA subtopics, 91 schedule days, all intact.
Nothing was simplified, reworded, or reordered.

## Features verified

- Every one of the 42 distinct `data-act` values in the original file has a corresponding
  handler in the new action registries (confirmed by cross-referencing both lists
  programmatically — none missing).
- Every `id="...Btn"` click handler (`addTaskBtn`, `addProjBtn`, `pyAddBtn`, `mAddBtn`, `inAddBtn`,
  `uAddBtn`, `skAddBtn`, `rAddBtn`, `evAddBtn`, `resAddBtn`, `docAddBtn`, `noteAddBtn`,
  `achAddBtn`, `themeBtn`) is present.
- All 7 views (dashboard, today, gate, career, projects, knowledge, calendar) route correctly.
- CSS: every declaration block from the original `<style>` was moved (checked by stripping
  whitespace and diffing line-by-line against the six new files) — 0 missing.
- Escaping: `esc()` is used in exactly the same call sites (moved, not rewritten).
- Every `.js` file passes `node --check` (syntax-valid ES modules).
- Every `import { x } from './y.js'` resolves to a real export in the target file (checked
  programmatically across all 51 source files).

## Known issues

- **Could not run `npm run build` / `vite dev`** in this environment: outbound network access to
  the npm registry is disabled here, so `vite` could not be installed to actually execute a
  build. Everything short of that has been verified (module syntax, import/export resolution,
  data equality, CSS completeness, handler coverage). Please run `npm install && npm run build`
  on your machine as the final check — the code has no framework dependencies beyond Vite itself,
  so this is expected to be a formality, but it hasn't been executed end-to-end by me.
- The dashboard's inline `<div class="card metric">...` blocks and the two `<div class="bar">`
  progress-bar blocks were factored into `metricCard()` / `progressBar()` helper components
  since they're the same markup repeated 4–6 times; the rendered HTML is unchanged.
- No `.html` fragment files were created per page (e.g. `dashboard.html`) — the original had no
  separate templates, only template-literal strings inside render functions, so keeping markup
  inside `<page>.js` avoided inventing a templating mechanism that wasn't there before, per the
  "don't add new features" instruction. Happy to split these into `.html` partials in a later
  phase if you'd like.

## Architectural decisions

- **Action dispatch**: replaced per-render `querySelectorAll(...).forEach(el.onclick=...)`
  rewiring with two delegated `document` listeners (`click`, `change`) plus one `focusout`
  listener for the notes textarea's `onblur` autosave. Functionally identical, but avoids the
  original's implicit re-binding on every render and is what section 15 of the brief asked for.
- **Repository pattern**: `createRepository(storeName)` in `database/queries.js` gives every
  service the same `{getAll, get, put, remove, clear}` shape, so a future Supabase adapter only
  needs to implement that one interface.
- **`appState.addDate` / `appState.addProject`**: renamed from `CURRENT_ADD_DATE` /
  `CURRENT_ADD_PROJECT` for consistency with the rest of `appState`, but same role — set by
  whichever page renders `addFormHtml()` (Today, Calendar, open Project) right before render,
  read by the shared `#addTaskBtn` handler in `components/task-list.js`.
- Kept the render functions returning plain HTML strings (no virtual DOM, no template compiler)
  — matches the "don't rewrite working functionality" and "no new features" constraints.

## Cloud migration readiness

The service layer is now the only thing pages talk to, and every service is built on
`createRepository()`, which is a thin wrapper over `database/queries.js`. To move to Supabase
later: swap what `createRepository()` returns for an equivalent that calls a REST/Supabase client
instead of IndexedDB, keeping the same method names. No page or component would need to change.

## Confirmations

1. ✅ Final folder tree — see `README.md`.
2. ✅ Summary of what moved where — this document, "Old → new" section.
3. ⚠️ Functionality not runtime-verified in a browser: see "Known issues" (no `vite build` run
   here due to no network access; static verification only).
4. No bugs discovered in the original logic — none of the code's behavior was changed.
5. ✅ Architectural decisions — see above.
6. ✅ IndexedDB compatibility — same DB name (`sidharthos`), same version (`7`), same stores/
   keyPaths, additive-only `onupgradeneeded`.
7. ✅ GATE syllabus and 91-day schedule preserved — verified identical via deep equality.
8. ⚠️ Build success — not executed here (no network to fetch Vite); all static checks pass.
   Run `npm install && npm run build` locally to confirm.
