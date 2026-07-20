// ==================== SUPABASE CONFIGURATION ====================
// Designed for Vercel + Supabase integration.
// Vercel injects SUPABASE_URL / SUPABASE_ANON_KEY env vars automatically.
// The anon key is PUBLIC — security is enforced via Row Level Security (RLS).

// In-memory config (not persisted to localStorage for security)
var _supabaseUrl = null;
var _supabaseAnonKey = null;

(function() {
    // Vercel injects these at build time for the Supabase integration
    if (typeof __SUPABASE_URL !== 'undefined' && typeof __SUPABASE_ANON_KEY !== 'undefined') {
        _supabaseUrl = __SUPABASE_URL;
        _supabaseAnonKey = __SUPABASE_ANON_KEY;
    }
    // Also check for process.env (some bundlers replace at build time)
    try {
        if (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL) {
            _supabaseUrl = process.env.SUPABASE_URL;
            _supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        }
    } catch(e) {}
    // Detect publishable key (new Supabase key format)
    try {
        if (typeof __SUPABASE_PUBLISHABLE_KEY !== 'undefined') {
            _supabaseAnonKey = __SUPABASE_PUBLISHABLE_KEY;
        }
    } catch(e) {}
    // Fallback: try the Vercel serverless function
    if (!_supabaseUrl || !_supabaseAnonKey) {
        fetch('/api/config.js').then(function(r) { return r.json(); }).then(function(cfg) {
            if (cfg.configured) {
                _supabaseUrl = cfg.supabaseUrl;
                _supabaseAnonKey = cfg.supabaseAnonKey || cfg.supabasePublishableKey;
                supabaseClient = null;
                initSupabase();
            } else {
                console.warn('⚠️ Supabase not configured. Running in offline mode.');
                if (typeof showSupabaseWarning === 'function') showSupabaseWarning();
            }
        }).catch(function() {
            console.warn('⚠️ Could not reach config endpoint. Running in offline mode.');
        });
    }
})();

// ==================== SUPABASE CLIENT ====================

var supabaseClient = null;

function getSupabaseUrl() {
    if (_supabaseUrl) return _supabaseUrl;
    if (window.__supabaseConfig && window.__supabaseConfig.supabaseUrl) {
        _supabaseUrl = window.__supabaseConfig.supabaseUrl;
        return _supabaseUrl;
    }
    // Legacy: check localStorage for manual configuration
    var url = localStorage.getItem('supabase_url');
    if (url) {
        _supabaseUrl = url;
        return url;
    }
    return null;
}

function getSupabaseAnonKey() {
    if (_supabaseAnonKey) return _supabaseAnonKey;
    if (window.__supabaseConfig) {
        var key = window.__supabaseConfig.supabaseAnonKey || window.__supabaseConfig.supabasePublishableKey;
        if (key) {
            _supabaseAnonKey = key;
            return key;
        }
    }
    // Legacy: check localStorage for manual configuration
    var key = localStorage.getItem('supabase_anon_key') || localStorage.getItem('supabase_publishable_key');
    if (key) {
        _supabaseAnonKey = key;
        return key;
    }
    return null;
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
    _supabaseUrl = url;
    _supabaseAnonKey = key;
    supabaseClient = null;
    return initSupabase();
}
