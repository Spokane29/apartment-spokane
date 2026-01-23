require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },

  leasingVoice: {
    apiUrl: process.env.LEASINGVOICE_API_URL || 'https://leasingvoice.com/api/leads/external',
    apiKey: process.env.LEASINGVOICE_API_KEY,
  },
};
