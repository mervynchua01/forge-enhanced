import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache the current access token so callers don't each invoke
// supabase.auth.getSession() — that call serializes on an internal lock and
// can stall when fired concurrently (e.g. several requests on page load),
// adding seconds of latency. We read it once and keep it fresh via auth events.
let cachedAccessToken = null;

supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data?.session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

// Synchronous, non-blocking accessor for the latest access token (or null).
export const getAccessToken = () => cachedAccessToken;
