import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { page, referrer, userAgent } = req.body;

      await supabase.from('page_views').insert([{
        page: page || '/',
        referrer: referrer || null,
        user_agent: userAgent || req.headers['user-agent'] || null,
        ip_hash: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
      }]);

      res.json({ success: true });
    } catch (error) {
      console.error('Track error:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'GET') {
    // Get visitor stats
    try {
      const days = parseInt(req.query.days) || 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Count unique visitors by ip_hash
      const uniqueVisitors = new Set(data.map(v => v.ip_hash)).size;
      const totalViews = data.length;

      res.json({
        totalViews,
        uniqueVisitors,
        period: `Last ${days} day(s)`
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
