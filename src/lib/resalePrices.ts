import axios from 'axios'

const SG_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID

export interface ResalePrice {
  platform: string
  lowestPrice: number | null
  averagePrice: number | null
  highestPrice: number | null
  suggestedListPrice: number | null
  listingCount: number
}

export async function getResalePrices(eventName: string): Promise<ResalePrice[]> {
  const results: ResalePrice[] = []

  try {
    const { data } = await axios.get('https://api.seatgeek.com/2/events', {
      params: { client_id: SG_ID, q: eventName, per_page: 1 },
    })
    const event = data.events?.[0]
    if (event?.stats) {
      const low = event.stats.lowest_price
      const avg = event.stats.average_price
      const high = event.stats.highest_price
      results.push({
        platform: 'SeatGeek',
        lowestPrice: low || null,
        averagePrice: avg || null,
        highestPrice: high || null,
        // 5% below average = fast sale; or at minimum +10% above what you paid
        suggestedListPrice: avg ? Math.round(avg * 0.95) : null,
        listingCount: event.stats.listing_count || 0,
      })
    }
  } catch (err) {
    console.error('ResalePrice fetch error:', err)
  }

  return results
}
