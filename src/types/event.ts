export interface TicketEvent {
  id: string
  name: string
  type: 'concert' | 'sports' | 'other'
  venue: string
  city: string
  date: string
  onSaleDate: string | null
  preSaleDate: string | null
  imageUrl: string
  minPrice: number | null
  maxPrice: number | null
  url: string
  platform: 'ticketmaster' | 'seatgeek'
  genre: string
  presaleCodes: string[]
}
