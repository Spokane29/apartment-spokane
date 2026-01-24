import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Store confirmation template in a separate knowledge_base entry
const TEMPLATE_CATEGORY = 'template';
const TEMPLATE_TITLE = 'Confirmation Template';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get the confirmation template
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('category', TEMPLATE_CATEGORY)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    // Default template if none exists
    const defaultTemplate = "Got it, {name}! You're scheduled for {tour_date}. Steve will reach out at {phone} to confirm. See you soon!";
    res.json({ template: data?.content || defaultTemplate });

  } else if (req.method === 'PUT') {
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }

    // Check if entry exists
    const { data: existing } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('category', TEMPLATE_CATEGORY)
      .single();

    let result;
    if (existing) {
      result = await supabase
        .from('knowledge_base')
        .update({ content: template, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('knowledge_base')
        .insert([{ category: TEMPLATE_CATEGORY, title: TEMPLATE_TITLE, content: template }])
        .select()
        .single();
    }

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }
    res.json({ template: result.data?.content });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
