import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { days } = req.query;
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { first_name, phone, email, move_in_date, message } = req.body;
      if (!first_name || !phone) return res.status(400).json({ error: 'First name and phone required' });

      const { data, error } = await supabase.from('leads').insert([{
        first_name, phone, email, move_in_date, message,
        source: 'website-chat',
        property_interest: '104 S Oak',
      }]).select().single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Lead ID required' });

      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
