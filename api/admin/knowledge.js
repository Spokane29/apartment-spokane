import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// We use the knowledge_base table with category='complete' for the main knowledge base document
const KB_CATEGORY = 'complete';
const KB_TITLE = 'South Oak Lead Capture Knowledge Base';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get the main knowledge base document
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('category', KB_CATEGORY)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }
    res.json({ content: data?.content || '' });

  } else if (req.method === 'PUT') {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if entry exists
    const { data: existing } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('category', KB_CATEGORY)
      .single();

    let result;
    if (existing) {
      // Update existing entry
      result = await supabase
        .from('knowledge_base')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Create new entry
      result = await supabase
        .from('knowledge_base')
        .insert([{ category: KB_CATEGORY, title: KB_TITLE, content }])
        .select()
        .single();
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    res.json({ content: result.data?.content || '' });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
