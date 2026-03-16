import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { TrendingUp, ExternalLink, Copy, Loader2, DollarSign } from 'lucide-react'
import { subscribeTickets } from '@/lib/tickets'
import { getResalePrices } from '@/lib/resalePrices'
import type { MyTicket } from '@/lib/tickets'
import type { ResalePrice } from '@/lib/resalePrices'

export default function Resell() {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [prices, setPrices] = useState<Record<string, ResalePrice[]>>({})
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => subscribeTickets(setTickets), [])

  async function checkPrices(ticket: MyTicket) {
    if (!ticket.id) return
    setLoading(prev => new Set([...prev, ticket.id!]))
    try {
      const data = await getResalePrices(ticket.eventName)
      setPrices(prev => ({ ...prev, [ticket.id!]: data }))
    } finally {
      setLoading(prev => { const s = new Set(prev); s.delete(ticket.id!); return s })
    }
  }

  function buildListing(ticket: MyTicket, suggestedPrice: number | null) {
    const price = suggestedPrice ?? ticket.pricePaid
    const dateStr = ticket.date
      ? (() => { try { return format(parseISO(ticket.date), 'MMM d, yyyy') } catch { return ticket.date } })()
      : ''
    return [
      `🎫 ${ticket.eventName}`,
      dateStr && `📅 ${dateStr}`,
      ticket.venue && `📍 ${ticket.venue}`,
      (ticket.section || ticket.row || ticket.seat) &&
        `💺 Sec ${ticket.section || '?'} | Row ${ticket.row || '?'} | Seat ${ticket.seat || '?'}`,
      ticket.platform && `🎟 Original platform: ${ticket.platform}`,
      ticket.orderNumber && `📋 Order #${ticket.orderNumber}`,
      `💰 Asking: $${price}`,
    ].filter(Boolean).join('\n')
  }

  function copyListing(ticket: MyTicket, suggestedPrice: number | null) {
    const text = buildListing(ticket, suggestedPrice)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(ticket.id ?? null)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d') } catch { return d }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1">Resell</h1>
      <p className="text-gray-400 text-sm mb-4">
        Price intelligence and listing templates for your tickets.
      </p>

      {tickets.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No tickets yet. Add tickets in "My Tickets" first.
        </p>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => {
            const ticketPrices = ticket.id ? prices[ticket.id] : undefined
            const sg = ticketPrices?.[0]
            const isLoading = ticket.id ? loading.has(ticket.id) : false
            const profit = sg?.suggestedListPrice
              ? sg.suggestedListPrice - ticket.pricePaid
              : null

            return (
              <div key={ticket.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-white text-sm">{ticket.eventName}</h3>
                  {ticket.date && (
                    <span className="text-xs text-gray-500 shrink-0">{formatDate(ticket.date)}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  {ticket.venue && <span>{ticket.venue} · </span>}
                  {(ticket.section || ticket.row || ticket.seat) && (
                    <span>Sec {ticket.section} Row {ticket.row} Seat {ticket.seat} · </span>
                  )}
                  <span className="text-green-400">${ticket.pricePaid} paid</span>
                </div>

                {/* Price intelligence */}
                {!ticketPrices ? (
                  <button
                    onClick={() => checkPrices(ticket)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg transition-colors mb-3"
                  >
                    {isLoading ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                    Check Resale Prices
                  </button>
                ) : ticketPrices.length === 0 ? (
                  <p className="text-xs text-gray-500 mb-3">No resale data found for this event.</p>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-3 mb-3 space-y-1">
                    {sg && (
                      <>
                        <div className="text-xs font-medium text-white mb-1.5">SeatGeek Market</div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-center mb-2">
                          <div>
                            <div className="text-gray-400">Low</div>
                            <div className="text-white font-medium">${sg.lowestPrice ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Avg</div>
                            <div className="text-white font-medium">${sg.averagePrice ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">High</div>
                            <div className="text-white font-medium">${sg.highestPrice ?? '—'}</div>
                          </div>
                        </div>
                        {sg.suggestedListPrice && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-purple-300 font-medium flex items-center gap-1">
                              <DollarSign size={11} /> Suggested: ${sg.suggestedListPrice}
                            </span>
                            {profit !== null && (
                              <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {profit >= 0 ? '+' : ''}{profit} profit
                              </span>
                            )}
                          </div>
                        )}
                        {sg.listingCount > 0 && (
                          <div className="text-xs text-gray-500">{sg.listingCount} listings</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://www.stubhub.com/find/s/?q=${encodeURIComponent(ticket.eventName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={11} /> StubHub
                  </a>
                  <a
                    href={`https://seatgeek.com/search?q=${encodeURIComponent(ticket.eventName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={11} /> SeatGeek
                  </a>
                  <button
                    onClick={() => copyListing(ticket, sg?.suggestedListPrice ?? null)}
                    className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Copy size={11} />
                    {copied === ticket.id ? '✓ Copied!' : 'Copy Listing'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
