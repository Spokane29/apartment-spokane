// Speech-to-text using Deepgram API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    console.error('DEEPGRAM_API_KEY not configured');
    return res.status(500).json({ error: 'Deepgram API key not configured' });
  }

  try {
    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data required' });
    }

    // audio is base64 encoded webm/opus from MediaRecorder
    const audioBuffer = Buffer.from(audio, 'base64');

    // Call Deepgram API
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram error:', response.status, error);
      return res.status(response.status).json({ error: 'Transcription failed', details: error });
    }

    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    console.log('Deepgram transcription:', transcript);

    res.json({ transcript });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
}
