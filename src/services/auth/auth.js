import { supabase } from '../supabase.js';

const RETURN_HASH_KEY = 'sos_auth_return_hash';

/**
 * Finish the OAuth (PKCE) redirect.
 *
 * supabase-js is created with detectSessionInUrl: true, so the client itself
 * exchanges ?code=... for a session during initialisation and consumes the
 * stored code verifier. Calling exchangeCodeForSession() a second time fails
 * ("code verifier not found" / "invalid flow state"), so we must NOT do that.
 * We just wait for the client's own init to finish and tidy the URL.
 * Auth problems never block the app from booting (it is local-first).
 */
export async function handleAuthCallback() {
  const url = new URL(window.location.href);
  const hasCode = url.searchParams.has('code');
  const oauthError =
    url.searchParams.get('error_description') ||
    url.searchParams.get('error');

  if (!hasCode && !oauthError) {
    return null;
  }

  let session = null;

  try {
    // Resolves once supabase-js has finished processing the URL.
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    session = data.session;
  } catch (error) {
    console.error('[Auth] Could not complete Google sign-in:', error);
  }

  if (oauthError) {
    console.error('[Auth] Provider returned an error:', oauthError);
  }

  // Remove one-time params from the address bar, keep the hash route.
  ['code', 'error', 'error_code', 'error_description'].forEach(k =>
    url.searchParams.delete(k)
  );
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`
  );

  return session;
}

export async function signInWithGoogle() {
  const currentHash = window.location.hash || '#/dashboard';

  // Keep the current Sidharth OS page so we can restore it
  // after Google redirects back to the app.
  localStorage.setItem(RETURN_HASH_KEY, currentHash);

  const redirectTo =
    `${window.location.origin}${window.location.pathname}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('[Auth] Google sign-in failed:', error);
    throw error;
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return null;
    }

    throw error;
  }

  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    throw error;
  }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export function restoreAuthRoute() {
  const savedHash = localStorage.getItem(RETURN_HASH_KEY);

  if (!savedHash) {
    return;
  }

  localStorage.removeItem(RETURN_HASH_KEY);

  if (savedHash.startsWith('#/')) {
    window.location.hash = savedHash;
  }
}