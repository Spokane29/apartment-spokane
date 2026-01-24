export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
  if (!ELEVEN_LABS_API_KEY) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  // Default voice - "Rachel" (friendly female voice good for customer service)
  // You can change this to any ElevenLabs voice ID
  const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', error);
      return res.status(response.status).json({ error: 'Failed to generate speech' });
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();

    // Return audio as base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    res.json({ audio: base64Audio, contentType: 'audio/mpeg' });

  } catch (error) {
    console.error('Voice API error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
}
