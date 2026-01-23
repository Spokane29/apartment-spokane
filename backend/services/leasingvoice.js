const config = require('../config');

// Send lead data to LeasingVoice API
async function syncLead(leadData) {
  // Skip if no API URL configured
  if (!config.leasingVoice.apiUrl) {
    console.log('LeasingVoice API not configured, skipping sync');
    return null;
  }

  const payload = {
    firstName: leadData.first_name,
    lastName: leadData.last_name || '',
    phone: leadData.phone,
    email: leadData.email || '',
    propertyInterest: leadData.property_interest || '104 S Oak',
    moveInDate: leadData.move_in_date || '',
    message: leadData.message || 'Interested via website chat',
    source: 'website-chat',
  };

  try {
    const response = await fetch(config.leasingVoice.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.leasingVoice.apiKey && {
          Authorization: `Bearer ${config.leasingVoice.apiKey}`,
        }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('LeasingVoice API error:', error);
      return { success: false, error };
    }

    const result = await response.json();
    console.log('Lead synced to LeasingVoice:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('LeasingVoice sync failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  syncLead,
};
