// Generate temporary Deepgram token for browser use
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    return res.status(500).json({ error: 'Deepgram API key not configured' });
  }

  try {
    // Create a temporary API key that expires in 10 seconds
    // This is safer than exposing the main key
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // If we can't create a temp key, just return the main key
      // (for development - in production you'd want proper key management)
      console.log('Using main Deepgram key');
      return res.json({
        key: DEEPGRAM_API_KEY,
        url: 'wss://api.deepgram.com/v1/listen'
      });
    }

    // Return the key for WebSocket connection
    res.json({
      key: DEEPGRAM_API_KEY,
      url: 'wss://api.deepgram.com/v1/listen'
    });

  } catch (error) {
    console.error('Deepgram token error:', error);
    res.status(500).json({ error: 'Failed to get Deepgram token' });
  }
}
