// Vercel Serverless Function (Node.js)
// Injects Supabase env vars from Vercel environment into the client.
// The Vercel + Supabase integration auto-sets SUPABASE_URL and SUPABASE_ANON_KEY.

module.exports = function handler(req, res) {
    try {
        var allowedOrigins = ['https://koitus.vercel.app', 'https://www.koitus.app', 'http://localhost:3000', 'http://localhost:5500'];
        var origin = req.headers.origin || '';
        if (allowedOrigins.indexOf(origin) !== -1) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        var url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        var anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        var pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

        return res.status(200).json({
            supabaseUrl: url,
            supabaseAnonKey: anonKey || pubKey,
            supabasePublishableKey: pubKey,
            configured: !!(url && (anonKey || pubKey))
        });
    } catch (err) {
        return res.status(200).json({
            supabaseUrl: '',
            supabaseAnonKey: '',
            supabasePublishableKey: '',
            configured: false,
            error: 'Config unavailable'
        });
    }
};
