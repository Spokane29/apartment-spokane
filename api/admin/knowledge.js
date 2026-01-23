import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('knowledge_base').select('*').order('category');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else if (req.method === 'POST') {
    const { category, title, content } = req.body;
    if (!category || !title || !content) return res.status(400).json({ error: 'All fields required' });

    const { data, error } = await supabase.from('knowledge_base').insert([{ category, title, content }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } else if (req.method === 'PUT') {
    const { id, content } = req.body;
    if (!id || !content) return res.status(400).json({ error: 'ID and content required' });

    const { data, error } = await supabase.from('knowledge_base').update({ content, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
