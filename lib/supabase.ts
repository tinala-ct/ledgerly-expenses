import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const rememberKey = 'ledgerly-remember-me';

export function setRememberMe(remember: boolean) {
  if (typeof window !== 'undefined') localStorage.setItem(rememberKey, String(remember));
}

const browserStorage = typeof window === 'undefined' ? undefined : {
  getItem: (storageKey: string) => (localStorage.getItem(rememberKey) === 'true' ? localStorage : sessionStorage).getItem(storageKey),
  setItem: (storageKey: string, value: string) => (localStorage.getItem(rememberKey) === 'true' ? localStorage : sessionStorage).setItem(storageKey, value),
  removeItem: (storageKey: string) => { localStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey); },
};

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = isSupabaseConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: browserStorage },
}) : null;
