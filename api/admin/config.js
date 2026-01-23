import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('ai_config').select('*').single();
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });
    res.json(data);
  } else if (req.method === 'PUT') {
    const { assistant_name, personality_rules, greeting_message } = req.body;
    const updates = {};
    if (assistant_name) updates.assistant_name = assistant_name;
    if (personality_rules) updates.personality_rules = personality_rules;
    if (greeting_message) updates.greeting_message = greeting_message;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });

    const { data: existing } = await supabase.from('ai_config').select('id').single();
    const { data, error } = await supabase.from('ai_config').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
