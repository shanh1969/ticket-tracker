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

async function fetchTMPage(query: string, city: string, page: number): Promise<any[]> {
  const { startDateTime, endDateTime } = getSixMonthRange()
  try {
    const { data } = await axios.get(`${BASE}/events.json`, {
      params: {
        apikey: TM_KEY,
        keyword: query || undefined,
        city: city || undefined,
        countryCode: 'CA',
        size: 200,
        page,
        sort: 'date,asc',
        startDateTime,
        endDateTime,
      },
    })
    return data._embedded?.events || []
  } catch {
    return []
  }
}

export async function searchEvents(query: string, city = '', startPage = 0): Promise<TicketEvent[]> {
  try {
    // Fetch 2 pages in parallel = up to 400 results
    const pages = await Promise.all([
      fetchTMPage(query, city, startPage),
      fetchTMPage(query, city, startPage + 1),
    ])
    const seen = new Set<string>()
    const allEvents = pages.flat().filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    return allEvents.map((e: any): TicketEvent => {
      const v = e._embedded?.venues?.[0]
      const addrLine = v?.address?.line1 || ''
      const addrCity = v?.city?.name || ''
      const addrState = v?.state?.stateCode || v?.state?.name || ''
      const addrPostal = v?.postalCode || ''
      const addressParts = [addrLine, addrCity, addrState, addrPostal].filter(Boolean)
      const doorsLocal = e.dates?.doorsTimes?.localTime || null
      const showLocal = e.dates?.start?.localTime || null
      let doorsTime: string | null = null
      if (doorsLocal && showLocal && doorsLocal !== showLocal) {
        doorsTime = doorsLocal.slice(0, 5) // HH:MM
      }
      const faceMin: number | null = e.priceRanges?.[0]?.min || null
      const faceMax: number | null = e.priceRanges?.[0]?.max || null
      const presales: any[] = e.sales?.presales || []
      const isSports = e.classifications?.[0]?.segment?.name === 'Sports'

      // Estimate resale value from face value using historical multipliers:
      // - Events with presales & high price spread = high demand → 1.8-2.5x
      // - Sports events typically hold 1.3-2.0x face value
      // - Concerts with wide price spread → 1.5-2.0x
      // - Low-price events under $50 → 1.2-1.5x (less resale interest)
      let resaleMultiplier = 1.3
      const priceSpread = faceMin && faceMax ? faceMax / faceMin : 1
      if (presales.length >= 3) resaleMultiplier += 0.4
      else if (presales.length >= 1) resaleMultiplier += 0.2
      if (priceSpread >= 4) resaleMultiplier += 0.5
      else if (priceSpread >= 2) resaleMultiplier += 0.2
      if (isSports && faceMin && faceMin >= 100) resaleMultiplier += 0.3
      if (faceMin && faceMin >= 150) resaleMultiplier += 0.2
      if (faceMin && faceMin < 50) resaleMultiplier = Math.max(1.1, resaleMultiplier - 0.3)

      const estResaleValue = faceMin ? Math.round(faceMin * resaleMultiplier) : null
      const platformFee = 0.15 // typical resale platform fee
      const estProfit = faceMin && estResaleValue
        ? Math.round((estResaleValue - faceMin) * (1 - platformFee))
        : null
      const profitPct = faceMin && estProfit ? Math.round((estProfit / faceMin) * 100) : null

      // Demand score heuristic
      let demand: number | null = null
      if (faceMin !== null) {
        demand = Math.min(100, Math.round(
          20 +
          (presales.length * 12) +
          (priceSpread >= 3 ? 25 : priceSpread >= 2 ? 15 : 5) +
          (faceMin >= 150 ? 20 : faceMin >= 75 ? 10 : 0)
        ))
      }

      return {
        id: `tm-${e.id}`,
        name: e.name,
        type: isSports ? 'sports' : 'concert',
        venue: v?.name || '',
        city: addrCity,
        address: addressParts.length > 0 ? addressParts.join(', ') : null,
        date: e.dates?.start?.dateTime || e.dates?.start?.localDate || '',
        doorsTime,
        onSaleDate: e.sales?.public?.startDateTime || null,
        preSaleDate: e.sales?.presales?.[0]?.startDateTime || null,
        imageUrl: e.images?.find((i: any) => i.ratio === '16_9')?.url || e.images?.[0]?.url || '',
        minPrice: faceMin,
        maxPrice: faceMax,
        url: e.url || '',
        platform: 'ticketmaster',
        genre: e.classifications?.[0]?.genre?.name || '',
        presaleCodes: e.sales?.presales?.map((p: any) => `${p.name}: ${p.url}`).filter(Boolean) || [],
        resaleMinPrice: estResaleValue ? Math.round(estResaleValue * 0.8) : null,
        resaleMaxPrice: estResaleValue ? Math.round(estResaleValue * 1.6) : null,
        resaleAvgPrice: estResaleValue,
        resaleMedianPrice: estResaleValue ? Math.round(estResaleValue * 0.95) : null,
        resaleListingCount: null,
        estimatedResaleValue: estResaleValue,
        estimatedProfit: estProfit,
        profitMarginPct: profitPct,
        demandScore: demand,
      }
    })
  } catch (err) {
    console.error('Ticketmaster API error:', err)
    return []
  }
}


export async function getUpcomingEvents(city = 'Toronto'): Promise<TicketEvent[]> {
  return searchEvents('', city)
}
