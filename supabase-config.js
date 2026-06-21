// ==================== SUPABASE CONFIGURATION ====================
// Designed for Vercel + Supabase integration.
// Vercel injects SUPABASE_URL / SUPABASE_ANON_KEY env vars automatically.
// The anon key is PUBLIC — security is enforced via Row Level Security (RLS).

// Priority: Vercel globals > localStorage > hardcoded defaults
(function() {
    // Vercel injects these at build time for the Supabase integration
    if (typeof __SUPABASE_URL !== 'undefined' && typeof __SUPABASE_ANON_KEY !== 'undefined') {
        localStorage.setItem('supabase_url', __SUPABASE_URL);
        localStorage.setItem('supabase_anon_key', __SUPABASE_ANON_KEY);
    }
    // Also check for process.env (some bundlers replace at build time)
    try {
        if (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) {
            localStorage.setItem('supabase_url', process.env.SUPABASE_URL);
            localStorage.setItem('supabase_anon_key', process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        }
    } catch(e) {}
})();

// ==================== SUPABASE CLIENT ====================

var supabaseClient = null;

function getSupabaseUrl() {
    var url = localStorage.getItem('supabase_url');
    if (!url && window.__supabaseConfig && window.__supabaseConfig.supabaseUrl) {
        url = window.__supabaseConfig.supabaseUrl;
        localStorage.setItem('supabase_url', url);
    }
    return url;
}

function getSupabaseAnonKey() {
    var key = localStorage.getItem('supabase_anon_key');
    if (!key && window.__supabaseConfig && window.__supabaseConfig.supabaseAnonKey) {
        key = window.__supabaseConfig.supabaseAnonKey;
        localStorage.setItem('supabase_anon_key', key);
    }
    return key;
}

function initSupabase() {
    if (supabaseClient) return supabaseClient;
    
    var SUPABASE_URL = getSupabaseUrl();
    var SUPABASE_ANON_KEY = getSupabaseAnonKey();
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase not configured. Using localStorage fallback.');
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: true, autoRefreshToken: true },
            realtime: { params: { eventsPerSecond: 10 } }
        });
        console.log('✅ Supabase client initialized');
        return supabaseClient;
    } catch (e) {
        console.error('❌ Supabase init failed:', e);
        return null;
    }
}

function getSupabase() {
    if (!supabaseClient) return initSupabase();
    return supabaseClient;
}

// Allow configuring from browser console for setup
function configureSupabase(url, key) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    supabaseClient = null;
    return initSupabase();
}
