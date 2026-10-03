import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Running in local-only mode. Set them in Vercel > Settings > Environment Variables and redeploy.'
  );
}

// createClient() throws "supabaseUrl is required." when these are undefined,
// which would crash the whole app at load time. This app is local-first, so
// fall back to inert placeholders instead of taking the UI down.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabasePublishableKey || 'missing-key',
  {
    auth: {
      flowType: 'pkce',
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
);
