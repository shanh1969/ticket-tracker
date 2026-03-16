import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { Resend } from 'resend'
import axios from 'axios'

admin.initializeApp()
const db = admin.firestore()

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'alerts@yourdomain.com'
const TO = process.env.RESEND_TO_EMAIL ?? 'you@example.com'
const TM_KEY = process.env.TICKETMASTER_API_KEY ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// Helper: send email via Resend
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmail(subject: string, html: string) {
  await resend.emails.send({ from: FROM, to: TO, subject, html })
}

// ─────────────────────────────────────────────────────────────────────────────
// checkWatchlist — runs every 5 minutes
// Searches Ticketmaster for new events matching watchlist items
// ─────────────────────────────────────────────────────────────────────────────
export const checkWatchlist = onSchedule(
  { schedule: 'every 5 minutes', region: 'us-central1' },
  async () => {
    const watchlistSnap = await db.collection('watchlist').get()
    const scheduleSnap = await db.collection('schedule').get()

    // Build set of already-tracked event IDs
    const trackedIds = new Set<string>()
    scheduleSnap.docs.forEach(d => {
      const event = (d.data() as any).event
      if (event?.id) trackedIds.add(event.id)
    })

    for (const item of watchlistSnap.docs) {
      const { name } = item.data() as { name: string; type: string }
      try {
        const { data } = await axios.get(
          'https://app.ticketmaster.com/discovery/v2/events.json',
          {
            params: {
              apikey: TM_KEY,
              keyword: name,
              size: 5,
              sort: 'date,asc',
            },
          }
        )
        const events = data._embedded?.events ?? []
        for (const e of events) {
          const id = `tm-${e.id}`
          if (trackedIds.has(id)) continue

          // Add to schedule
          const newEvent = {
            id,
            name: e.name,
            type: e.classifications?.[0]?.segment?.name === 'Sports' ? 'sports' : 'concert',
            venue: e._embedded?.venues?.[0]?.name ?? '',
            city: e._embedded?.venues?.[0]?.city?.name ?? '',
            date: e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? '',
            onSaleDate: e.sales?.public?.startDateTime ?? null,
            preSaleDate: e.sales?.presales?.[0]?.startDateTime ?? null,
            imageUrl: e.images?.find((i: any) => i.ratio === '16_9')?.url ?? '',
            minPrice: e.priceRanges?.[0]?.min ?? null,
            maxPrice: e.priceRanges?.[0]?.max ?? null,
            url: e.url ?? '',
            platform: 'ticketmaster',
            genre: e.classifications?.[0]?.genre?.name ?? '',
            presaleCodes: [],
          }

          await db.collection('schedule').add({
            event: newEvent,
            notifications: { announced: true, oneWeek: false, twentyFourHour: false, onSale: false },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          trackedIds.add(id)

          await sendEmail(
            `🎫 NEW EVENT: ${e.name}`,
            `
              <h2>New Event Announced: ${e.name}</h2>
              <p><strong>Venue:</strong> ${newEvent.venue}, ${newEvent.city}</p>
              <p><strong>Date:</strong> ${newEvent.date}</p>
              ${newEvent.onSaleDate ? `<p><strong>On Sale:</strong> ${newEvent.onSaleDate}</p>` : ''}
              ${newEvent.minPrice ? `<p><strong>Price:</strong> From $${newEvent.minPrice}</p>` : ''}
              <p><a href="${newEvent.url}">View on Ticketmaster →</a></p>
              <hr><p><em>Matched watchlist: ${name}</em></p>
            `
          )
        }
      } catch (err) {
        console.error(`Watchlist check error for "${name}":`, err)
      }
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// checkNotificationThresholds — runs every 60 minutes
// Sends milestone emails: 1 week, 24 hours, and on-sale
// ─────────────────────────────────────────────────────────────────────────────
export const checkNotificationThresholds = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const snap = await db.collection('schedule').get()
    const now = Date.now()

    for (const doc of snap.docs) {
      const data = doc.data() as any
      const event = data.event
      const notifs = data.notifications ?? {}
      const onSaleDate = event?.onSaleDate ? new Date(event.onSaleDate).getTime() : null

      if (!onSaleDate) continue

      const hoursUntil = (onSaleDate - now) / (1000 * 60 * 60)
      const updates: Record<string, boolean> = {}

      // On sale NOW (within -5 to +60 min window)
      if (!notifs.onSale && hoursUntil >= -0.083 && hoursUntil <= 1) {
        await sendEmail(
          `🚨 ON SALE NOW: ${event.name}`,
          `
            <h2>🚨 Tickets are ON SALE NOW: ${event.name}</h2>
            <p><strong>Venue:</strong> ${event.venue}</p>
            <p><a href="${event.url}" style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:8px">Buy Tickets Now →</a></p>
          `
        )
        updates['notifications.onSale'] = true
      }

      // 24 hours out
      if (!notifs.twentyFourHour && hoursUntil > 0 && hoursUntil <= 24) {
        await sendEmail(
          `⏰ 24 Hours Until On Sale: ${event.name}`,
          `
            <h2>⏰ On sale in ~24 hours: ${event.name}</h2>
            <p>On sale: ${new Date(onSaleDate).toLocaleString()}</p>
            <p><a href="${event.url}">Get ready →</a></p>
          `
        )
        updates['notifications.twentyFourHour'] = true
      }

      // 1 week out (168 hours)
      if (!notifs.oneWeek && hoursUntil > 24 && hoursUntil <= 168) {
        await sendEmail(
          `📅 1 Week Until On Sale: ${event.name}`,
          `
            <h2>📅 On sale in 1 week: ${event.name}</h2>
            <p>On sale: ${new Date(onSaleDate).toLocaleString()}</p>
            <p><a href="${event.url}">View event →</a></p>
          `
        )
        updates['notifications.oneWeek'] = true
      }

      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates)
      }
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// inboundEmail — HTTP endpoint for Resend inbound email webhook
// Parses ticket confirmation emails and imports into my_tickets
// ─────────────────────────────────────────────────────────────────────────────
export const inboundEmail = onRequest(
  { region: 'us-central1', invoker: 'public' as any },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed')
      return
    }

    try {
      const payload = req.body
      const subject = payload.subject ?? payload.headers?.subject ?? ''
      const text: string = payload.text ?? payload.html ?? ''
      const from: string = payload.from ?? ''

      // Detect platform from sender
      let platform = 'unknown'
      if (from.includes('ticketmaster')) platform = 'Ticketmaster'
      else if (from.includes('stubhub')) platform = 'StubHub'
      else if (from.includes('seatgeek')) platform = 'SeatGeek'
      else if (from.includes('axs')) platform = 'AXS'

      // Extract order number
      const orderMatch = text.match(/order\s*#?\s*([A-Z0-9\-]{6,20})/i)
      const orderNumber = orderMatch?.[1] ?? ''

      // Extract event name from subject (best effort)
      const eventName = subject
        .replace(/your (order|ticket|confirmation)/gi, '')
        .replace(/from \w+/gi, '')
        .replace(/order #?[A-Z0-9\-]+/gi, '')
        .trim() || subject

      // Extract date (best effort)
      const dateMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i)
      const date = dateMatch ? dateMatch[0] : ''

      await db.collection('my_tickets').add({
        eventName,
        venue: '',
        date,
        section: '',
        row: '',
        seat: '',
        pricePaid: 0,
        platform,
        orderNumber,
        source: 'email',
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawSubject: subject,
      })

      res.status(200).json({ ok: true })
    } catch (err) {
      console.error('inboundEmail error:', err)
      res.status(500).json({ error: 'Internal error' })
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// scrapePresaleCodes — runs every 60 minutes
// Fetches presale info from Ticketmaster for all scheduled events
// ─────────────────────────────────────────────────────────────────────────────
export const scrapePresaleCodes = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const snap = await db.collection('schedule').get()

    for (const doc of snap.docs) {
      const data = doc.data() as any
      const event = data.event
      if (!event?.id?.startsWith('tm-')) continue

      const tmId = event.id.replace('tm-', '')
      try {
        const { data: res } = await axios.get(
          `https://app.ticketmaster.com/discovery/v2/events/${tmId}.json`,
          { params: { apikey: TM_KEY } }
        )
        const presales = res.sales?.presales ?? []
        const codes = presales
          .map((p: any) => `${p.name}: ${p.url ?? ''}`)
          .filter(Boolean)

        if (codes.length > 0) {
          await doc.ref.update({ 'event.presaleCodes': codes })
        }
      } catch (err) {
        // Non-critical — skip silently
      }
    }
  }
)
