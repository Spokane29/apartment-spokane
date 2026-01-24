import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DEFAULT_CONFIRMATION = "Thanks {name}! Here's what I have: Phone: {phone}, Email: {email}, Tour: {tour_date} at {tour_time}. You'll receive a confirmation shortly. See you then!";

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get AI config
    const { data: config, error } = await supabase.from('ai_config').select('*').single();
    if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

    // Get confirmation template from knowledge_base
    const { data: template } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('category', 'template')
      .single();

    // Get AI rules from knowledge_base
    const { data: rules } = await supabase
      .from('knowledge_base')
      .select('content')
      .eq('category', 'rules')
      .single();

    res.json({
      ...config,
      confirmation_template: template?.content || DEFAULT_CONFIRMATION,
      ai_rules: rules?.content || ''
    });

  } else if (req.method === 'PUT') {
    const { assistant_name, personality_rules, greeting_message, confirmation_template, ai_rules } = req.body;

    // Update ai_config
    const updates = {};
    if (assistant_name !== undefined) updates.assistant_name = assistant_name;
    if (personality_rules !== undefined) updates.personality_rules = personality_rules;
    if (greeting_message !== undefined) updates.greeting_message = greeting_message;

    let configData = null;
    if (Object.keys(updates).length > 0) {
      const { data: existing } = await supabase.from('ai_config').select('id').single();
      const { data, error } = await supabase
        .from('ai_config')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      configData = data;
    }

    // Update confirmation template if provided
    let templateContent = null;
    if (confirmation_template !== undefined) {
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id')
        .eq('category', 'template')
        .single();

      if (existing) {
        await supabase
          .from('knowledge_base')
          .update({ content: confirmation_template, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('knowledge_base')
          .insert([{ category: 'template', title: 'Confirmation Template', content: confirmation_template }]);
      }
      templateContent = confirmation_template;
    }

    // Update AI rules if provided
    let rulesContent = null;
    if (ai_rules !== undefined) {
      const { data: existing } = await supabase
        .from('knowledge_base')
        .select('id')
        .eq('category', 'rules')
        .single();

      if (existing) {
        await supabase
          .from('knowledge_base')
          .update({ content: ai_rules, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('knowledge_base')
          .insert([{ category: 'rules', title: 'AI Behavior Rules', content: ai_rules }]);
      }
      rulesContent = ai_rules;
    }

    // Return updated config
    if (!configData) {
      const { data } = await supabase.from('ai_config').select('*').single();
      configData = data;
    }

    res.json({
      ...configData,
      confirmation_template: templateContent || DEFAULT_CONFIRMATION,
      ai_rules: rulesContent || ''
    });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
