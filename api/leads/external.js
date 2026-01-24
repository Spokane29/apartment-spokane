import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      propertyInterest,
      message,
      source,
      companyId
    } = req.body;

    // Validate required fields
    if (!firstName || !phone) {
      return res.status(400).json({ error: 'First name and phone are required' });
    }

    // Insert lead into database
    const { data: lead, error } = await supabase.from('leads').insert([{
      first_name: firstName,
      last_name: lastName || '',
      phone: phone,
      email: email || '',
      message: message || '',
      source: source || 'external',
      property_interest: propertyInterest || 'South Oak Apartment',
      status: 'new'
    }]).select().single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    console.log('Lead received:', { firstName, phone, source, leadId: lead.id });

    res.status(200).json({
      success: true,
      message: 'Lead received',
      leadId: lead.id
    });

  } catch (error) {
    console.error('Error processing lead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
