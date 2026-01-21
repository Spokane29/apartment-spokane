import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch('https://apartment-spokane.com/api/leads/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    if (!response.ok) {
      console.error('LeasingVoice API error:', response.status, data)
      return res.status(response.status).json({ error: 'Failed to submit lead', details: data })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Lead submission error:', error)
    return res.status(500).json({ error: 'Internal server error', message: String(error) })
  }
}
