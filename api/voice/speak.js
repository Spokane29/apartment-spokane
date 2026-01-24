// Convert text to be more natural for speech
function convertToSpeakable(text) {
  let result = text;

  // Convert prices like $1,200 to "twelve hundred dollars"
  result = result.replace(/\$1,200/g, 'twelve hundred dollars');
  result = result.replace(/\$1200/g, 'twelve hundred dollars');
  result = result.replace(/\$(\d),(\d{3})/g, (match, thousands, hundreds) => {
    return `${thousands} thousand ${hundreds} dollars`;
  });
  result = result.replace(/\$(\d{3})/g, '$1 dollars');

  // Convert /month to "a month" or "per month"
  result = result.replace(/\/month/gi, ' a month');
  result = result.replace(/\/mo/gi, ' a month');

  // Convert addresses to be more speakable
  result = result.replace(/(\d+)\s+S\s+/g, '$1 South ');
  result = result.replace(/(\d+)\s+N\s+/g, '$1 North ');
  result = result.replace(/(\d+)\s+E\s+/g, '$1 East ');
  result = result.replace(/(\d+)\s+W\s+/g, '$1 West ');
  result = result.replace(/\bSt\b/g, 'Street');
  result = result.replace(/\bAve\b/g, 'Avenue');
  result = result.replace(/\bBlvd\b/g, 'Boulevard');

  // Convert bed/bath shorthand
  result = result.replace(/(\d)-bedroom/gi, '$1 bedroom');
  result = result.replace(/(\d)-bathroom/gi, '$1 bathroom');
  result = result.replace(/(\d)-bed/gi, '$1 bedroom');
  result = result.replace(/(\d)-bath/gi, '$1 bathroom');
  result = result.replace(/(\d)\s*bed\s*\/\s*(\d)\s*bath/gi, '$1 bedroom $2 bathroom');

  // Convert phone numbers to be more speakable
  result = result.replace(/\((\d{3})\)\s*(\d{3})-(\d{4})/g, '$1 $2 $3');

  return result;
}

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

  // Debug: log key prefix to verify it's loaded
  console.log('ElevenLabs key prefix:', ELEVEN_LABS_API_KEY.substring(0, 10) + '...');

  // Default voice - "Rachel" (friendly female voice good for customer service)
  const VOICE_ID = process.env.ELEVEN_LABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  // Convert text to be more speech-friendly
  const speakableText = convertToSpeakable(text);

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
          text: speakableText,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs error:', response.status, error);
      return res.status(response.status).json({ error: 'Failed to generate speech', details: error });
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
