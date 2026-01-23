import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: config } = await supabase.from('ai_config').select('greeting_message').single();
    const greeting = config?.greeting_message || "Hi! I'm Sona, the virtual assistant for South Oak Apartments. How can I help you today?";
    const sessionId = crypto.randomUUID();

    res.json({ message: greeting, sessionId });
  } catch (error) {
    console.error('Greeting error:', error);
    res.status(500).json({ error: 'Failed to get greeting' });
  }
}
