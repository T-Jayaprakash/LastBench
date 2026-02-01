import { createClient } from '@supabase/supabase-js';
import { CapacitorStorage } from './storageAdapter';

// Hardcoded credentials to prevent "connection string is missing" errors
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is missing. Please check your environment configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Faster load, as we handle auth state manually
        storage: CapacitorStorage,
    },
    // Improve global fetch behavior
    global: {
        headers: { 'x-application-name': 'lastbench-pwa' }
    }
});
