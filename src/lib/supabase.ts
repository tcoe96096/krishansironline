import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public project configuration supplied by the owner. Environment variables override
// these defaults for staging/production. Publishable keys are designed for browser use;
// all database access must remain protected by Row Level Security.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://vsqwlkqqsxcehvdsdbna.supabase.co';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1x1F4HuNZoudMKydMr0XEQ_qB-sOijs';

/**
 * Browser client: use only the Supabase publishable key.
 * Database access must still be protected by PostgreSQL Row Level Security.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const requireSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment.',
    );
  }
  return supabase;
};

/** Accept a 10-digit Indian mobile number or an international +91 number. */
export const normalizeIndianMobile = (mobile: string): string => {
  const value = mobile.trim().replace(/[\s()-]/g, '');
  const normalized = /^\d{10}$/.test(value)
    ? `+91${value}`
    : value.startsWith('0091')
      ? `+${value.slice(2)}`
      : value;

  if (!/^\+91[6-9]\d{9}$/.test(normalized)) {
    throw new Error('कृपया 10 अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें।');
  }
  return normalized;
};

/** Stable internal Auth identifier for password-only Indian mobile login. */
export const studentLoginEmail = (mobile: string): string => {
  const normalized = normalizeIndianMobile(mobile);
  const digits = normalized.replace(/\D/g, '');
  return `student.${digits}@login.krishansir.online`;
};
