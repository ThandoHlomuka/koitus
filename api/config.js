// Vercel Serverless Function (Node.js)
// Injects Supabase env vars from Vercel environment into the client.
// The Vercel + Supabase integration auto-sets SUPABASE_URL and SUPABASE_ANON_KEY.

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

    var url = process.env.SUPABASE_URL || '';
    var anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    res.json({
        supabaseUrl: url,
        supabaseAnonKey: anonKey,
        configured: !!(url && anonKey)
    });
};
