import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const authHeader = req.headers.authorization

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-transactions`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('Plaid sync proxy error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
