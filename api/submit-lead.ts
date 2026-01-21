import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch('https://leasingvoice.com/api/leads/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to submit lead', details: data })
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Lead submission error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
