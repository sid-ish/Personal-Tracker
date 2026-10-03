import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '../styles/reset.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/components.css';
import '../styles/utilities.css';
import '../styles/animations.css';
import '../styles/pages/pages.css';
import '../styles/responsive.css';

import {
  handleAuthCallback,
  onAuthStateChange,
  restoreAuthRoute,
} from '../services/auth/auth.js';

import {
  initCloudSync,
  flushPending,
} from '../services/cloud/cloud-sync.js';

import { initialize } from '../database/db.js';
import { run as runMigrations } from '../database/migrations.js';
import { settings } from '../services/settings/settings.js';
import { initTheme, applyAppearance } from '../services/theme/theme.js';
import {
  apply as applyBackground,
  reapply,
} from '../services/background/background.js';

import {
  registerActions,
  registerEvents,
} from './actions.js';

import { initRouter } from './router.js';

import {
  registerGlobalErrorHandlers,
  handleError,
  showRecovery,
} from './errors.js';

import { initShortcuts } from './shortcuts.js';

import {
  sidebarHtml,
  setSidebarCollapsed,
  toggleSidebar,
} from '../components/sidebar.js';

import { bottomNavHtml } from '../components/bottom-nav.js';

import {
  topbarHtml,
  shellActions,
  updateFocusPill,
} from '../components/topbar.js';

import { taskActions } from '../components/task-list.js';
import { calendarActions } from '../components/calendar.js';

import {
  entityFormActions,
  openNew,
} from '../components/entity-forms.js';

import { initTooltips } from '../components/tooltip.js';

import {
  registerFocusCompletion,
} from '../components/timer.js';

import {
  refreshBadge,
} from '../components/attention-center.js';

import { openPalette } from '../components/command-palette.js';
import { startClocks } from '../components/clock.js';
import { focus } from '../services/focus/focus.js';
import { debounce } from '../utils/dom.js';

registerGlobalErrorHandlers();

async function boot() {
  // ------------------------------------------------------------
  // LOCAL APPLICATION BOOT
  // ------------------------------------------------------------

  // IndexedDB remains the primary/local source of truth.
  await initialize();
  await runMigrations();
  await settings.load();

  initTheme(() => reapply());

  document.getElementById('app').innerHTML = `
    <div id="bg-layer" aria-hidden="true">
      <div id="bg-img"></div>
      <div id="bg-overlay"></div>
    </div>

    <div class="app" data-sidebar="expanded">
      ${sidebarHtml()}

      <div class="main-col">
        ${topbarHtml()}

        <main
          class="view"
          id="view"
          tabindex="-1"
          aria-live="polite"
        ></main>
      </div>
    </div>

    ${bottomNavHtml()}
  `;

  [
    shellActions,
    taskActions,
    calendarActions,
    entityFormActions,
  ].forEach(registerActions);

  registerEvents();
  initTooltips();
  startClocks();
  focus.init();
  registerFocusCompletion();

  // ------------------------------------------------------------
  // SIDEBAR
  // ------------------------------------------------------------

  const tablet = matchMedia(
    '(min-width:761px) and (max-width:1100px)'
  );

  const fit = () => {
    setSidebarCollapsed(
      tablet.matches
        ? true
        : settings.get('sidebarCollapsed'),
      false
    );
  };

  fit();

  tablet.addEventListener('change', fit);

  // ------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ------------------------------------------------------------

  initShortcuts({
    openPalette,
    newTask: () => openNew('task'),
    toggleSidebar,
  });

  document.addEventListener('keydown', e => {
    if (
      e.key === 'Escape' &&
      document.documentElement.dataset.drawer === 'open'
    ) {
      document.documentElement.dataset.drawer = 'closed';
    }
  });

  // ------------------------------------------------------------
  // SUPABASE PKCE CALLBACK
  // ------------------------------------------------------------

  // Supabase Auth handles the PKCE flow.
  // We only clean up the callback URL and recover the
  // original hash route.
  try {
    await handleAuthCallback();
  } catch (e) {
    console.error(
      '[Auth] callback failed',
      e
    );
  }

  // ------------------------------------------------------------
  // ROUTER
  // ------------------------------------------------------------

  await initRouter();

  // ------------------------------------------------------------
  // AUTH STATE
  // ------------------------------------------------------------

  onAuthStateChange((event, session) => {
    window.__sosAuth = {
      event,
      session,
      user: session?.user ?? null,
    };

    // Restore the route that was active before
    // Google OAuth redirected away.
    if (
      event === 'INITIAL_SESSION' ||
      event === 'SIGNED_IN'
    ) {
      restoreAuthRoute();
    }

    // ----------------------------------------------------------
    // CLOUD SHADOW SYNC
    // ----------------------------------------------------------
    //
    // Authenticated sessions enable the cloud mirror.
    // IndexedDB remains authoritative.
    //
    // INITIAL_SESSION:
    //   Start cloud sync when an existing session is restored.
    //
    // SIGNED_IN:
    //   Start cloud sync after Google login.
    //
    // TOKEN_REFRESHED:
    //   Ensure sync still has the current authenticated user.
    //

    if (
      event === 'INITIAL_SESSION' ||
      event === 'SIGNED_IN' ||
      event === 'TOKEN_REFRESHED'
    ) {
      void initCloudSync();
      void flushPending();
    }

    // ----------------------------------------------------------
    // NOTIFY UI
    // ----------------------------------------------------------

    document.dispatchEvent(
      new CustomEvent('sos-auth-change', {
        detail: {
          event,
          session,
        },
      })
    );
  });

  // ------------------------------------------------------------
  // APPEARANCE / BACKGROUND
  // ------------------------------------------------------------

  applyAppearance();

  await applyBackground();

  updateFocusPill();

  // ------------------------------------------------------------
  // ATTENTION BADGE
  // ------------------------------------------------------------

  const bump = debounce(
    () => refreshBadge(),
    400
  );

  bump();

  window.addEventListener(
    'hashchange',
    bump
  );

  document.addEventListener(
    'click',
    bump
  );

  setInterval(
    refreshBadge,
    60000
  );

  // ------------------------------------------------------------
  // APP READY
  // ------------------------------------------------------------

  window.__sos = {
    ready: true,
  };
}

boot().catch(e => {
  handleError(e);
  showRecovery(e);
});