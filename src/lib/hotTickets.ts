import axios from 'axios'

const TM_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY

export interface HotEvent {
  id: string
  name: string
  venue: string
  city: string
  date: string
  onSaleDate: string | null
  url: string
  platform: 'seatgeek' | 'ticketmaster'
  imageUrl: string
  demandScore: number
  listingCount: number
  floorPrice: number | null
  avgPrice: number | null
  highPrice: number | null
  estimatedProfit: number | null
  profitPct: number | null
  scarcityScore: number
  category: 'on-sale-soon' | 'high-demand' | 'high-margin' | 'scarce'
  reason: string
}

export async function fetchHotTickets(city = 'Toronto'): Promise<HotEvent[]> {
  const now = new Date()
  const oneYear = new Date()
  oneYear.setFullYear(oneYear.getFullYear() + 1)

  const startDT = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endDT = oneYear.toISOString().replace(/\.\d{3}Z$/, 'Z')

  // Single API call — avoids rate-limit issues from parallel requests
  let events: any[] = []
  try {
    const { data } = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
      params: {
        apikey: TM_KEY,
        city: city || undefined,
        countryCode: 'CA',
        classificationName: 'music',
        size: 200,
        sort: 'date,asc',
        startDateTime: startDT,
        endDateTime: endDT,
      },
    })
    events = data._embedded?.events || []
  } catch (err) {
    console.error('TM hot tickets fetch error:', err)
    return []
  }

  const twoWeeks = now.getTime() + 14 * 86400000
  const results: HotEvent[] = []

  for (const e of events) {
    const floor: number | null = e.priceRanges?.[0]?.min || null
    const high: number | null = e.priceRanges?.[0]?.max || null
    const presales: any[] = e.sales?.presales || []
    const hasPresales = presales.length > 0
    const onSaleDT: string | null = e.sales?.public?.startDateTime || null
    const onSaleTs = onSaleDT ? new Date(onSaleDT).getTime() : null
    const goesOnSaleSoon = onSaleTs !== null && onSaleTs <= twoWeeks && onSaleTs >= now.getTime()
    const daysUntilSale = onSaleTs ? Math.round((onSaleTs - now.getTime()) / 86400000) : null
    const priceRatio = floor && high ? high / floor : 0

    let category: HotEvent['category']
    let reason: string
    let estimatedProfit: number | null = null
    let profitPct: number | null = null
    let demandScore = 0

    if (goesOnSaleSoon) {
      const label = daysUntilSale === 0 ? 'ON SALE TODAY'
        : daysUntilSale === 1 ? 'On sale tomorrow'
        : `On sale in ${daysUntilSale} days`
      category = 'on-sale-soon'
      reason = `${label} — buy at face value ($${floor ?? '?'}) before resale premium`
    } else if (priceRatio >= 3 && floor !== null && floor < 250) {
      // Wide price spread = event has VIP/premium tiers = strong resale market
      category = 'high-margin'
      const estResale = floor * 2.0
      const fee = estResale * 0.15
      estimatedProfit = Math.round(estResale - floor - fee)
      profitPct = Math.round((estimatedProfit / floor) * 100)
      reason = `Price spread $${floor}–$${high} (${Math.round(priceRatio)}× range) — strong resale premium expected`
    } else if (hasPresales) {
      // Active presales = high-demand event, smart buyers get in early
      category = 'scarce'
      demandScore = Math.min(95, 50 + presales.length * 10)
      reason = `${presales.length} presale${presales.length > 1 ? 's' : ''} active — hot event, buy before general sale`
    } else if (floor !== null && floor >= 75) {
      // High floor price = premium show that holds resale value
      category = 'high-demand'
      demandScore = Math.min(100, Math.round(40 + floor / 5))
      reason = `Premium floor price $${floor} — top-tier show that holds resale value`
    } else {
      continue // skip low-signal events (no price, no presales, cheap)
    }

    results.push({
      id: `tm-${e.id}`,
      name: e.name,
      venue: e._embedded?.venues?.[0]?.name || '',
      city: e._embedded?.venues?.[0]?.city?.name || '',
      date: e.dates?.start?.dateTime || e.dates?.start?.localDate || '',
      onSaleDate: onSaleDT,
      url: e.url || '',
      platform: 'ticketmaster',
      imageUrl: e.images?.find((i: any) => i.ratio === '16_9')?.url || '',
      demandScore,
      listingCount: 0,
      floorPrice: floor,
      avgPrice: null,
      highPrice: high,
      estimatedProfit,
      profitPct,
      scarcityScore: hasPresales ? presales.length * 20 : 0,
      category,
      reason,
    })
  }

  // Sort: on-sale-soon → high-margin → scarce → high-demand
  const order: Record<string, number> = { 'on-sale-soon': 0, 'high-margin': 1, 'scarce': 2, 'high-demand': 3 }
  return results.sort((a, b) => {
    const catDiff = order[a.category] - order[b.category]
    if (catDiff !== 0) return catDiff
    if (a.profitPct !== null && b.profitPct !== null) return b.profitPct - a.profitPct
    return (b.floorPrice || 0) - (a.floorPrice || 0)
  })
}
