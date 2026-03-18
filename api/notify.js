export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).end(); return }

  const { to, subject, html } = req.body || {}
  if (!to || !subject || !html) {
    res.status(400).json({ error: 'Missing fields: to, subject, html' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY not configured' })
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TicketTracker <noreply@smarterflow.ca>',
        to: [to],
        subject,
        html,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      res.status(500).json({ error: data })
      return
    }
    res.status(200).json({ ok: true, id: data.id })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
