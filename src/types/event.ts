export interface TicketEvent {
  id: string
  name: string
  type: 'concert' | 'sports' | 'other'
  venue: string
  city: string
  address: string | null
  date: string
  doorsTime: string | null
  onSaleDate: string | null
  preSaleDate: string | null
  imageUrl: string
  minPrice: number | null
  maxPrice: number | null
  url: string
  platform: 'ticketmaster' | 'seatgeek'
  genre: string
  presaleCodes: string[]
  // Resale market data
  resaleMinPrice: number | null
  resaleMaxPrice: number | null
  resaleAvgPrice: number | null
  resaleMedianPrice: number | null
  resaleListingCount: number | null
  // Estimated profit potential
  estimatedResaleValue: number | null   // projected resale price per ticket
  estimatedProfit: number | null        // per ticket after fees
  profitMarginPct: number | null        // percentage return
  demandScore: number | null            // 0-100 demand indicator
}
