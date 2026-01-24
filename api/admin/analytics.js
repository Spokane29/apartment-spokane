import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get date range from query params (default: last 30 days)
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get chat sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false });

    if (sessionsError) {
      // Table might not exist yet
      console.log('Sessions error:', sessionsError.message);
    }

    // Get leads for the same period
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.log('Leads error:', leadsError.message);
    }

    // Calculate metrics
    const sessionList = sessions || [];
    const leadList = leads || [];

    const totalSessions = sessionList.length;
    const totalLeads = leadList.filter(l => l.source === 'website-chat').length;
    const toursBooked = sessionList.filter(s => s.tour_booked).length;

    // Conversion rates
    const leadConversionRate = totalSessions > 0
      ? ((totalLeads / totalSessions) * 100).toFixed(1)
      : 0;
    const tourConversionRate = totalSessions > 0
      ? ((toursBooked / totalSessions) * 100).toFixed(1)
      : 0;

    // Collection rates
    const collectedName = sessionList.filter(s => s.collected_name).length;
    const collectedPhone = sessionList.filter(s => s.collected_phone).length;
    const collectedEmail = sessionList.filter(s => s.collected_email).length;
    const collectedTourDate = sessionList.filter(s => s.collected_tour_date).length;

    // Average messages per session
    const totalMessages = sessionList.reduce((sum, s) => sum + (s.message_count || 0), 0);
    const avgMessages = totalSessions > 0
      ? (totalMessages / totalSessions).toFixed(1)
      : 0;

    // Daily breakdown
    const dailyStats = {};
    sessionList.forEach(s => {
      const date = new Date(s.started_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { sessions: 0, leads: 0, tours: 0 };
      }
      dailyStats[date].sessions++;
      if (s.lead_captured) dailyStats[date].leads++;
      if (s.tour_booked) dailyStats[date].tours++;
    });

    res.json({
      period: `Last ${days} days`,
      summary: {
        totalSessions,
        totalLeads,
        toursBooked,
        leadConversionRate: `${leadConversionRate}%`,
        tourConversionRate: `${tourConversionRate}%`,
        avgMessagesPerSession: avgMessages
      },
      collection: {
        name: { count: collectedName, rate: `${totalSessions > 0 ? ((collectedName/totalSessions)*100).toFixed(1) : 0}%` },
        phone: { count: collectedPhone, rate: `${totalSessions > 0 ? ((collectedPhone/totalSessions)*100).toFixed(1) : 0}%` },
        email: { count: collectedEmail, rate: `${totalSessions > 0 ? ((collectedEmail/totalSessions)*100).toFixed(1) : 0}%` },
        tourDate: { count: collectedTourDate, rate: `${totalSessions > 0 ? ((collectedTourDate/totalSessions)*100).toFixed(1) : 0}%` }
      },
      daily: Object.entries(dailyStats)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 14)
        .map(([date, stats]) => ({ date, ...stats })),
      recentSessions: sessionList.slice(0, 20).map(s => ({
        id: s.session_id,
        started: s.started_at,
        messages: s.message_count,
        leadCaptured: s.lead_captured,
        tourBooked: s.tour_booked
      }))
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
