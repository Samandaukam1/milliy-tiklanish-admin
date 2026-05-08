import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Returns true when both env vars are present and look valid.
 * All pages guard their Supabase calls with this check and fall back
 * to demo data when it returns false, so the app still runs without
 * credentials configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20
  );
}

// Safe to create unconditionally — the client won't make real network
// calls until a method is invoked, and every call site is guarded by
// isSupabaseConfigured() first.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
