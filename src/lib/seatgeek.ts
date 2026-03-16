import axios from 'axios'
import type { TicketEvent } from '@/types/event'

const SG_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID
const BASE = 'https://api.seatgeek.com/2'

export async function searchSeatGeek(query: string, city = ''): Promise<TicketEvent[]> {
  const now = new Date().toISOString().split('T')[0]
  const end = new Date()
  end.setMonth(end.getMonth() + 6)
  const endDate = end.toISOString().split('T')[0]

  try {
    const { data } = await axios.get(`${BASE}/events`, {
      params: {
        client_id: SG_ID,
        q: query || undefined,
        'venue.city': city || undefined,
        'venue.country': 'CA',
        'datetime_local.gte': now,
        'datetime_local.lte': endDate,
        per_page: 50,
        sort: 'datetime_local.asc',
      },
    })
    return (data.events || []).map((e: any): TicketEvent => ({
      id: `sg-${e.id}`,
      name: e.title,
      type: e.type === 'sports' ? 'sports' : 'concert',
      venue: e.venue?.name || '',
      city: e.venue?.city || '',
      date: e.datetime_local || '',
      onSaleDate: null,
      preSaleDate: null,
      imageUrl: e.performers?.[0]?.image || '',
      minPrice: e.stats?.lowest_price || null,
      maxPrice: e.stats?.highest_price || null,
      url: e.url || '',
      platform: 'seatgeek',
      genre: e.performers?.[0]?.genres?.[0]?.name || '',
      presaleCodes: [],
    }))
  } catch (err) {
    console.error('SeatGeek API error:', err)
    return []
  }
}
