import axios from 'axios'
import type { TicketEvent } from '@/types/event'

const SG_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID
const BASE = 'https://api.seatgeek.com/2'

async function fetchPage(query: string, city: string, page: number): Promise<any[]> {
  const now = new Date().toISOString().split('T')[0]
  const end = new Date()
  end.setMonth(end.getMonth() + 6)
  const endDate = end.toISOString().split('T')[0]
  const { data } = await axios.get(`${BASE}/events`, {
    params: {
      client_id: SG_ID,
      q: query || undefined,
      'venue.city': city || undefined,
      'venue.country': 'CA',
      'datetime_local.gte': now,
      'datetime_local.lte': endDate,
      per_page: 50,
      page,
      sort: 'datetime_local.asc',
    },
  })
  return data.events || []
}

export async function searchSeatGeek(query: string, city = '', startPage = 1): Promise<TicketEvent[]> {
  try {
    // Fetch 8 pages in parallel = up to 400 results
    const pages = await Promise.all([
      fetchPage(query, city, startPage),
      fetchPage(query, city, startPage + 1),
      fetchPage(query, city, startPage + 2),
      fetchPage(query, city, startPage + 3),
      fetchPage(query, city, startPage + 4),
      fetchPage(query, city, startPage + 5),
      fetchPage(query, city, startPage + 6),
      fetchPage(query, city, startPage + 7),
    ])
    const allEvents = pages.flat()
    // Deduplicate by id
    const seen = new Set<number>()
    const unique = allEvents.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    return unique.map((e: any): TicketEvent => {
      const addrParts = [e.venue?.address, e.venue?.city, e.venue?.state, e.venue?.postal_code].filter(Boolean)
      const stats = e.stats || {}
      const lowestResale = stats.lowest_price || null
      const highestResale = stats.highest_price || null
      const avgResale = stats.average_price || null
      const medianResale = stats.median_price || null
      const listingCount = stats.listing_count || null
      // SeatGeek prices are resale market prices
      // Estimate face value as ~40-60% of lowest resale for popular events
      const estFaceValue = lowestResale ? Math.round(lowestResale * 0.5) : null
      const estProfit = estFaceValue && avgResale ? Math.round((avgResale - estFaceValue) * 0.85) : null
      const profitPct = estFaceValue && estProfit ? Math.round((estProfit / estFaceValue) * 100) : null
      // Demand score based on listing count and price spread
      let demand: number | null = null
      if (listingCount !== null && avgResale !== null) {
        demand = Math.min(100, Math.round(
          (listingCount > 500 ? 40 : listingCount > 100 ? 25 : 10) +
          (avgResale > 200 ? 35 : avgResale > 100 ? 25 : 15) +
          (highestResale && lowestResale && highestResale / lowestResale > 3 ? 25 : 10)
        ))
      }
      return {
        id: `sg-${e.id}`,
        name: e.title,
        type: e.type === 'sports' ? 'sports' : 'concert',
        venue: e.venue?.name || '',
        city: e.venue?.city || '',
        address: addrParts.length > 0 ? addrParts.join(', ') : null,
        date: e.datetime_local || '',
        doorsTime: null,
        onSaleDate: null,
        preSaleDate: null,
        imageUrl: e.performers?.[0]?.image || '',
        minPrice: estFaceValue,
        maxPrice: lowestResale ? Math.round(lowestResale * 1.2) : null,
        url: e.url || '',
        platform: 'seatgeek',
        genre: e.performers?.[0]?.genres?.[0]?.name || '',
        presaleCodes: [],
        resaleMinPrice: lowestResale,
        resaleMaxPrice: highestResale,
        resaleAvgPrice: avgResale,
        resaleMedianPrice: medianResale,
        resaleListingCount: listingCount,
        estimatedResaleValue: avgResale,
        estimatedProfit: estProfit,
        profitMarginPct: profitPct,
        demandScore: demand,
      }
    })
  } catch (err) {
    console.error('SeatGeek API error:', err)
    return []
  }
}
