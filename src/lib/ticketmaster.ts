import axios from 'axios'
import type { TicketEvent } from '@/types/event'

const TM_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY
const BASE = 'https://app.ticketmaster.com/discovery/v2'

function getSixMonthRange() {
  const now = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + 6)
  return {
    startDateTime: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    endDateTime: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  }
}

export async function searchEvents(query: string, city = ''): Promise<TicketEvent[]> {
  const { startDateTime, endDateTime } = getSixMonthRange()
  try {
    const { data } = await axios.get(`${BASE}/events.json`, {
      params: {
        apikey: TM_KEY,
        keyword: query || undefined,
        city: city || undefined,
        countryCode: 'CA',
        size: 50,
        sort: 'date,asc',
        startDateTime,
        endDateTime,
      },
    })
    const events = data._embedded?.events || []
    return events.map((e: any): TicketEvent => ({
      id: `tm-${e.id}`,
      name: e.name,
      type: e.classifications?.[0]?.segment?.name === 'Sports' ? 'sports' : 'concert',
      venue: e._embedded?.venues?.[0]?.name || '',
      city: e._embedded?.venues?.[0]?.city?.name || '',
      date: e.dates?.start?.dateTime || e.dates?.start?.localDate || '',
      onSaleDate: e.sales?.public?.startDateTime || null,
      preSaleDate: e.sales?.presales?.[0]?.startDateTime || null,
      imageUrl: e.images?.find((i: any) => i.ratio === '16_9')?.url || e.images?.[0]?.url || '',
      minPrice: e.priceRanges?.[0]?.min || null,
      maxPrice: e.priceRanges?.[0]?.max || null,
      url: e.url || '',
      platform: 'ticketmaster',
      genre: e.classifications?.[0]?.genre?.name || '',
      presaleCodes: e.sales?.presales?.map((p: any) => `${p.name}: ${p.url}`).filter(Boolean) || [],
    }))
  } catch (err) {
    console.error('Ticketmaster API error:', err)
    return []
  }
}

export async function getUpcomingEvents(city = 'Toronto'): Promise<TicketEvent[]> {
  return searchEvents('', city)
}
