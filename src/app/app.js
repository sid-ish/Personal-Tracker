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
  startCloudRealtime,
  stopCloudRealtime,
} from '../services/cloud/cloud-realtime.js';

import {
  handleAuthCallback,
  onAuthStateChange,
  restoreAuthRoute,
  getCurrentSession,
} from '../services/auth/auth.js';

import {
  initCloudSync,
  flushPending,
} from '../services/cloud/cloud-sync.js';

import {
  bootstrapFromCloud,
} from '../services/cloud/cloud-pull.js';

import { initialize } from '../database/db.js';
import { run as runMigrations } from '../database/migrations.js';
import { settings } from '../services/settings/settings.js';

import {
  initTheme,
  applyAppearance,
} from '../services/theme/theme.js';

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
import { registerFocusCompletion } from '../components/timer.js';
import { refreshBadge } from '../components/attention-center.js';
import { openPalette } from '../components/command-palette.js';
import { startClocks } from '../components/clock.js';
import { focus } from '../services/focus/focus.js';
import { debounce } from '../utils/dom.js';

registerGlobalErrorHandlers();

/*
 * Prevent duplicate cloud-bootstrap operations if multiple auth
 * events arrive during startup/login.
 */
let cloudBootstrapPromise = null;

function startCloudBootstrap(session) {
  if (!session) {
    return;
  }

  if (cloudBootstrapPromise) {
    return;
  }

  cloudBootstrapPromise = bootstrapFromCloud()
    .then(result => {
      if (!result?.bootstrapped) {
        return;
      }

      console.log(
        '[CloudBootstrap] Cloud data restored:',
        result.stores ?? {}
      );

      /*
       * The application may already have rendered from IndexedDB
       * before the cloud pull completed.
       *
       * Reload so the normal boot process reads the restored
       * IndexedDB data and renders the complete application.
       */
      window.location.reload();
    })
    .catch(error => {
      /*
       * Cloud bootstrap must NEVER prevent the local-first app
       * from working.
       */
      console.error(
        '[CloudBootstrap] Failed:',
        error
      );
    })
    .finally(() => {
      cloudBootstrapPromise = null;
    });
}

/*
 * Start all cloud functionality for an authenticated session.
 *
 * IndexedDB remains the local source of truth.
 * Supabase is the shadow-sync + cross-device layer.
 */
function startCloudForSession(session, shouldBootstrap = false) {
  if (!session) {
    return;
  }

  void initCloudSync();
  void flushPending();
  void startCloudRealtime();

  if (shouldBootstrap) {
    startCloudBootstrap(session);
  }
}

async function boot() {
  // ------------------------------------------------------------
  // LOCAL-FIRST BOOT
  // ------------------------------------------------------------

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

  tablet.addEventListener(
    'change',
    fit
  );

  // ------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // ------------------------------------------------------------

  initShortcuts({
    openPalette,
    newTask: () => openNew('task'),
    toggleSidebar,
  });

  document.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Escape' &&
        document.documentElement.dataset.drawer === 'open'
      ) {
        document.documentElement.dataset.drawer = 'closed';
      }
    }
  );

  // ------------------------------------------------------------
  // AUTH / PKCE CALLBACK
  // ------------------------------------------------------------

  /*
   * Supabase handles the PKCE session exchange.
   * handleAuthCallback() cleans OAuth parameters and preserves
   * the intended route.
   *
   * Authentication failures never prevent local boot.
   */
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
  // AUTH STATE + CLOUD SYNC
  // ------------------------------------------------------------

  onAuthStateChange(
    (event, session) => {
      window.__sosAuth = {
        event,
        session,
        user: session?.user ?? null,
      };

      // --------------------------------------------------------
      // RESTORE PRE-AUTH ROUTE
      // --------------------------------------------------------

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN'
      ) {
        restoreAuthRoute();
      }

      // --------------------------------------------------------
      // AUTHENTICATED CLOUD SERVICES
      // --------------------------------------------------------

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN'
      ) {
        startCloudForSession(
          session,
          true
        );
      }

      if (event === 'TOKEN_REFRESHED') {
        startCloudForSession(
          session,
          false
        );
      }

      // --------------------------------------------------------
      // SIGN OUT
      // --------------------------------------------------------

      if (event === 'SIGNED_OUT') {
        void stopCloudRealtime();
      }

      // --------------------------------------------------------
      // INFORM THE UI
      // --------------------------------------------------------

      document.dispatchEvent(
        new CustomEvent(
          'sos-auth-change',
          {
            detail: {
              event,
              session,
            },
          }
        )
      );
    }
  );

  // ------------------------------------------------------------
  // AUTH SESSION RECOVERY
  // ------------------------------------------------------------

  /*
   * The auth listener can be registered after Supabase has already
   * established the current session during startup.
   *
   * Explicitly inspect the current session so a fresh device still
   * gets cloud bootstrap + Realtime even when INITIAL_SESSION was
   * emitted before the listener existed.
   */
  try {
    const currentSession =
      await getCurrentSession();

    if (currentSession) {
      window.__sosAuth = {
        event: 'CURRENT_SESSION',
        session: currentSession,
        user: currentSession.user ?? null,
      };

      startCloudForSession(
        currentSession,
        true
      );
    }
  } catch (error) {
    console.error(
      '[Auth] Could not restore current session:',
      error
    );
  }

  // ------------------------------------------------------------
  // APPEARANCE
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