# Sidharth OS 2.0

A local-first personal command centre: tasks, calendar, GATE 2027 preparation, projects, career pipeline, knowledge base and a distraction-free focus mode. Vanilla JS + Vite, data in IndexedDB (database `sidharthos`, v8). Nothing leaves the browser.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview
```

Requires Node 18+. The app uses hash routing (`#/today`), so `dist/` can be hosted on any static server.

## Structure

```
src/
  app/          router, state, actions (event registry), shortcuts, error handling, boot
  components/   shell (sidebar, topbar, bottom-nav), modal, toast, dropdown, tooltip, command palette,
                quick add, attention centre, forms, calendar (single reusable), clock (single reusable),
                charts, progress, empty-state, skeleton, icons (Lucide)
  pages/        dashboard, today, focus, calendar, gate, projects, career, knowledge, settings (lazy-loaded)
  services/     database access, settings, theme, background, backup, search, analytics, notifications, focus timer
  styles/       tokens, reset, base, layout, components, utilities, animations, responsive, pages/
  assets/backgrounds/   built-in background images (version-controlled SVGs)
  database/     IndexedDB schema, migrations, repository helpers
  utils/        dates, formatting, validation, fuzzy search, calculations
legacy/         the original v1 single-file prototype, kept for reference only
```

## Keyboard shortcuts

`Ctrl K` palette · `/` search · `N` new task · `D` Command Centre · `T` Today · `C` Calendar · `G` GATE · `P` Projects · `K` Knowledge · `R` Career · `F` Focus · `,` Settings · `[` collapse sidebar · `Esc` close.
Single-key shortcuts are ignored while typing or while a dialog is open.

## Backgrounds

Built-in images live in `src/assets/backgrounds/` (add a file and a line in `services/background/catalog.js`). Uploaded images are validated (JPG/PNG/WebP, ≤10 MB), downscaled to ≤2560 px WebP, and stored with a thumbnail as blobs in the IndexedDB `backgrounds` store, so they survive reloads and are included in backups. Opacity, blur, overlay, position and fit are adjustable; Focus mode (and optionally Dashboard/GATE/Projects) can have its own background.

## Data safety

- Every delete asks for confirmation. Nothing is removed silently.
- Backups (`Settings → Data`) include all stores, settings and custom backgrounds. Imports are validated first; invalid records are skipped and reported.
- "Replace" imports download a safety copy first and run in a single transaction, so a failure leaves current data untouched.
- The DB upgrade from v7 to v8 only adds the `backgrounds` store.
