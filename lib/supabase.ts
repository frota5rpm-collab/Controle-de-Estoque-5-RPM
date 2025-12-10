import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const SUPABASE_URL = 'https://yaoebstgiagmrvlbozny.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_un9oOHRHEV-3pqQcSfTkUA_4qPNILqW'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to check connection
export const checkConnection = async () => {
  try {
    // Try to fetch a simple count. Using 'head' to minimize data transfer.
    // Using 'vehicles' table as it is independent, or materials.
    const { count, error } = await supabase.from('materials').select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error("Supabase connection error details:", error); // Log full object to console
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase connection check failed:", e);
    return false;
  }
};