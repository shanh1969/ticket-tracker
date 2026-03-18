/**
 * Parses ticket confirmation and payout emails from major platforms.
 * Handles: Ticketmaster, Live Nation, StubHub, SeatGeek, AXS
 */

export interface ParsedBuyEmail {
  type: 'buy'
  eventName: string
  eventDate: string
  venue: string
  quantity: number
  faceValueEach: number
  feesTotal: number
  totalCost: number
  platform: string
  orderNumber: string
}

export interface ParsedSellEmail {
  type: 'sell'
  eventName: string
  sellDate: string
  quantitySold: number
  salePriceEach: number
  platformFeeAmount: number
  netReceived: number
  platform: string
  orderNumber: string
}

export type ParsedEmail = ParsedBuyEmail | ParsedSellEmail | null

function clean(s: string) { return s.replace(/\s+/g, ' ').trim() }
function parsePrice(s: string) { return parseFloat(s.replace(/[$,CAD\s]/g, '')) || 0 }
function parseDate(s: string) {
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return ''
}

// ── Ticketmaster / Live Nation ──────────────────────────────────────────────
function parseTicketmaster(text: string): ParsedBuyEmail | null {
  const isTicketmaster = /ticketmaster|livenation|live nation/i.test(text)
  if (!isTicketmaster) return null

  // Event name — usually the biggest bold line, look for "Your tickets to X" or "X\nDate"
  const nameMatch = text.match(/(?:your (?:order|tickets?) (?:for|to)|tickets? to)\s+(.+?)(?:\n|,\s*\n)/i)
    || text.match(/^([A-Z][^\n]{5,60})\n(?:[\w]+ \d|\d{1,2}\s+\w+)/m)
  const eventName = nameMatch ? clean(nameMatch[1]) : ''

  // Date
  const dateMatch = text.match(/(?:event date|date)[:\s]+([A-Za-z]+[\s,]+\d{1,2}[\s,]+\d{4})/i)
    || text.match(/(\w+ \d{1,2},\s*\d{4})/i)
  const eventDate = dateMatch ? parseDate(dateMatch[1]) : ''

  // Venue
  const venueMatch = text.match(/(?:venue|location|at)[:\s]+([^\n]{5,60})/i)
  const venue = venueMatch ? clean(venueMatch[1]) : ''

  // Quantity
  const qtyMatch = text.match(/(\d+)\s*(?:ticket|x ticket)/i)
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1

  // Order total
  const totalMatch = text.match(/(?:order total|total charged|amount charged|grand total)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const totalCost = totalMatch ? parsePrice(totalMatch[1]) : 0

  // Fees
  const feesMatch = text.match(/(?:service fee|convenience fee|facility fee|fees?)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const feesTotal = feesMatch ? parsePrice(feesMatch[1]) : 0

  // Face value per ticket
  const faceMatch = text.match(/(?:ticket price|face value|price per ticket|each)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const faceValueEach = faceMatch
    ? parsePrice(faceMatch[1])
    : quantity > 0 ? (totalCost - feesTotal) / quantity : 0

  // Order number
  const orderMatch = text.match(/(?:order (?:number|#|id)|confirmation)[:\s#]*([A-Z0-9\-]{6,20})/i)
  const orderNumber = orderMatch ? orderMatch[1] : ''

  if (!eventName && !totalCost) return null

  return { type: 'buy', eventName, eventDate, venue, quantity, faceValueEach: Math.round(faceValueEach * 100) / 100, feesTotal, totalCost, platform: 'Ticketmaster', orderNumber }
}

// ── StubHub Payout ──────────────────────────────────────────────────────────
function parseStubHub(text: string): ParsedSellEmail | null {
  if (!/stubhub/i.test(text)) return null

  const isSale = /(?:sale confirmed|your tickets? (?:sold|have been sold)|payout|payment sent)/i.test(text)
  if (!isSale) return null

  const nameMatch = text.match(/(?:sold|sale of)\s+(?:\d+ )?(?:tickets? (?:to|for)\s+)?(.+?)(?:\n|for \$)/i)
  const eventName = nameMatch ? clean(nameMatch[1]) : ''

  const dateMatch = text.match(/(?:sale date|sold on)[:\s]+([A-Za-z]+[\s,]+\d{1,2}[\s,]+\d{4})/i)
    || text.match(/(\w+ \d{1,2},\s*\d{4})/i)
  const sellDate = dateMatch ? parseDate(dateMatch[1]) : new Date().toISOString().split('T')[0]

  const qtyMatch = text.match(/(\d+)\s*(?:ticket|x)/i)
  const quantitySold = qtyMatch ? parseInt(qtyMatch[1]) : 1

  const salePriceMatch = text.match(/(?:sale price|listed price|price per ticket|sold for)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const salePriceEach = salePriceMatch ? parsePrice(salePriceMatch[1]) : 0

  const feeMatch = text.match(/(?:seller fee|our fee|service fee|stubhub fee)[:\s$CAD-]*([0-9,]+\.\d{2})/i)
  const platformFeeAmount = feeMatch ? parsePrice(feeMatch[1]) : salePriceEach * quantitySold * 0.15

  const netMatch = text.match(/(?:payout|you (?:will )?(?:receive|get|earn)|net proceeds?|amount)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const netReceived = netMatch ? parsePrice(netMatch[1]) : salePriceEach * quantitySold - platformFeeAmount

  const orderMatch = text.match(/(?:order|sale)[:\s#]*([A-Z0-9\-]{6,20})/i)
  const orderNumber = orderMatch ? orderMatch[1] : ''

  if (!eventName && !netReceived) return null

  return { type: 'sell', eventName, sellDate, quantitySold, salePriceEach, platformFeeAmount: Math.round(platformFeeAmount * 100) / 100, netReceived: Math.round(netReceived * 100) / 100, platform: 'StubHub', orderNumber }
}

// ── SeatGeek Payout ──────────────────────────────────────────────────────────
function parseSeatGeek(text: string): ParsedSellEmail | null {
  if (!/seatgeek/i.test(text)) return null

  const isSale = /(?:sold|payout|sale confirmed|your listing sold)/i.test(text)
  if (!isSale) return null

  const nameMatch = text.match(/(?:tickets? (?:to|for)|sale of)\s+(.+?)(?:\n|have sold|sold)/i)
  const eventName = nameMatch ? clean(nameMatch[1]) : ''

  const dateMatch = text.match(/(\w+ \d{1,2},\s*\d{4})/i)
  const sellDate = dateMatch ? parseDate(dateMatch[1]) : new Date().toISOString().split('T')[0]

  const qtyMatch = text.match(/(\d+)\s*ticket/i)
  const quantitySold = qtyMatch ? parseInt(qtyMatch[1]) : 1

  const salePriceMatch = text.match(/(?:sale price|listing price|per ticket)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const salePriceEach = salePriceMatch ? parsePrice(salePriceMatch[1]) : 0

  const feeMatch = text.match(/(?:fee|commission)[:\s$CAD-]*([0-9,]+\.\d{2})/i)
  const platformFeeAmount = feeMatch ? parsePrice(feeMatch[1]) : salePriceEach * quantitySold * 0.10

  const netMatch = text.match(/(?:payout|you(?:'ll)? (?:receive|get)|net)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const netReceived = netMatch ? parsePrice(netMatch[1]) : salePriceEach * quantitySold - platformFeeAmount

  const orderMatch = text.match(/(?:order|sale)[:\s#]*([A-Z0-9\-]{6,20})/i)
  const orderNumber = orderMatch ? orderMatch[1] : ''

  if (!eventName && !netReceived) return null

  return { type: 'sell', eventName, sellDate, quantitySold, salePriceEach, platformFeeAmount: Math.round(platformFeeAmount * 100) / 100, netReceived: Math.round(netReceived * 100) / 100, platform: 'SeatGeek', orderNumber }
}

// ── AXS Buy ──────────────────────────────────────────────────────────────────
function parseAXS(text: string): ParsedBuyEmail | null {
  if (!/axs\.com|@axs/i.test(text)) return null

  const nameMatch = text.match(/(?:your tickets? for|tickets? to)\s+(.+?)(?:\n|on )/i)
  const eventName = nameMatch ? clean(nameMatch[1]) : ''

  const dateMatch = text.match(/(\w+ \d{1,2},\s*\d{4})/i)
  const eventDate = dateMatch ? parseDate(dateMatch[1]) : ''

  const venueMatch = text.match(/(?:at|venue)[:\s]+([^\n]{5,60})/i)
  const venue = venueMatch ? clean(venueMatch[1]) : ''

  const qtyMatch = text.match(/(\d+)\s*ticket/i)
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1

  const totalMatch = text.match(/(?:total|amount)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const totalCost = totalMatch ? parsePrice(totalMatch[1]) : 0

  const feesMatch = text.match(/(?:fee)[:\s$CAD]*([0-9,]+\.\d{2})/i)
  const feesTotal = feesMatch ? parsePrice(feesMatch[1]) : 0
  const faceValueEach = quantity > 0 ? (totalCost - feesTotal) / quantity : 0

  const orderMatch = text.match(/(?:order)[:\s#]*([A-Z0-9\-]{6,20})/i)
  const orderNumber = orderMatch ? orderMatch[1] : ''

  if (!eventName && !totalCost) return null

  return { type: 'buy', eventName, eventDate, venue, quantity, faceValueEach: Math.round(faceValueEach * 100) / 100, feesTotal, totalCost, platform: 'AXS', orderNumber }
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseEmail(rawText: string): ParsedEmail {
  const text = rawText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return parseStubHub(text)
    || parseSeatGeek(text)
    || parseTicketmaster(text)
    || parseAXS(text)
    || null
}
