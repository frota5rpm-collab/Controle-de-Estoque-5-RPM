import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const SUPABASE_URL = 'https://yaoebstgiagmrvlbozny.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_un9oOHRHEV-3pqQcSfTkUA_4qPNILqW'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to check connection
export const checkConnection = async () => {
  try {
    // Try to fetch a simple count from 'vehicle_schedules' to ensure the latest schema is applied.
    // If this table is missing (migration not run), this will return an error, triggering the DatabaseSetup screen.
    const { count, error } = await supabase.from('vehicle_schedules').select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error("Supabase connection/schema error details:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase connection check failed:", e);
    return false;
  }
};