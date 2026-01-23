import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get the single property info document
    const { data, error } = await supabase
      .from('ai_config')
      .select('property_info')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ content: data?.property_info || '' });

  } else if (req.method === 'PUT') {
    const { content } = req.body;

    // Update the single property info document
    const { data, error } = await supabase
      .from('ai_config')
      .update({ property_info: content, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ content: data?.property_info || '' });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
