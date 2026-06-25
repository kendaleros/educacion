// Supabase Configuration
// Load credentials from config.js (which should NOT be committed to version control).
// Copy config.example.js to config.js and fill in your real Supabase project values.

if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
    console.error(
        'Supabase credentials are not configured. ' +
        'Copy config.example.js to config.js and set SUPABASE_URL and SUPABASE_ANON_KEY.'
    );
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
