import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw, TrendingUp, Flame, Clock, AlertTriangle, ExternalLink, DollarSign, BarChart2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fetchHotTickets } from '@/lib/hotTickets'
import type { HotEvent } from '@/lib/hotTickets'

const CATEGORY_CONFIG = {
  'on-sale-soon':  { label: 'On Sale Soon',    color: '#dc2626', bg: '#fef2f2', icon: Clock,     tip: 'Buy at face value NOW before resale markup' },
  'high-margin':   { label: 'High Margin',      color: '#059669', bg: '#f0fdf4', icon: DollarSign, tip: 'Big gap between face value and current resale avg' },
  'scarce':        { label: 'Scarce Supply',    color: '#d97706', bg: '#fffbeb', icon: AlertTriangle, tip: 'High demand, few listings = price will rise' },
  'high-demand':   { label: 'High Demand',      color: '#4f46e5', bg: '#eef2ff', icon: Flame,     tip: 'Top popularity — these sell out fast' },
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#9ca3af'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-full h-1.5" style={{ background: '#e5e7eb' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-7 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export default function HotTickets() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<HotEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [city, setCity] = useState(() => localStorage.getItem('tt_city') || 'Toronto')
  const [filter, setFilter] = useState<HotEvent['category'] | 'all'>('all')

  async function refresh() {
    setLoading(true)
    try {
      const data = await fetchHotTickets(city)
      setEvents(data)
      setLastRefreshed(new Date())
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (events.length === 0) refresh()
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter)

  const counts = {
    'on-sale-soon': events.filter(e => e.category === 'on-sale-soon').length,
    'high-margin': events.filter(e => e.category === 'high-margin').length,
    'scarce': events.filter(e => e.category === 'scarce').length,
    'high-demand': events.filter(e => e.category === 'high-demand').length,
  }

  const formatDate = (d: string) => { try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d } }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        style={{ background: '#059669', color: 'white' }}>
        <TrendingUp size={13} />
        Hot Tickets
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex-1 overflow-y-auto mt-12 rounded-t-2xl" style={{ background: '#f0f2f5' }}>

            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-3" style={{ background: 'rgba(255,255,255,0.97)', borderBottom: '1px solid #e5e7eb', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-base font-bold" style={{ color: '#111827' }}>📈 Market Intelligence</h1>
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    {lastRefreshed ? `Last refreshed ${format(lastRefreshed, 'h:mm a')}` : 'See which tickets are most profitable to buy right now'}
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-full" style={{ background: '#f3f4f6' }}>
                  <X size={18} color="#374151" />
                </button>
              </div>

              {/* City + Refresh */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={e => { setCity(e.target.value); localStorage.setItem('tt_city', e.target.value) }}
                  placeholder="City"
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  style={{ border: '1px solid #d1d5db', color: '#111827' }}
                  onKeyDown={e => e.key === 'Enter' && refresh()}
                />
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                  style={{ background: '#059669' }}>
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">

              {/* Summary cards */}
              {events.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.entries(CATEGORY_CONFIG) as [HotEvent['category'], typeof CATEGORY_CONFIG['on-sale-soon']][]).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(filter === key ? 'all' : key)}
                        className="rounded-xl p-3 text-left transition-all"
                        style={{
                          background: filter === key ? cfg.bg : 'white',
                          border: `1px solid ${filter === key ? cfg.color : '#e5e7eb'}`,
                          boxShadow: filter === key ? `0 0 0 2px ${cfg.color}22` : undefined,
                        }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon size={14} color={cfg.color} />
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: '#111827' }}>{counts[key]}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{cfg.tip}</p>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* How to use this */}
              {events.length > 0 && (
                <div className="rounded-xl p-3" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#3730a3' }}>💡 How to use this</p>
                  <ul className="text-xs space-y-0.5" style={{ color: '#4338ca' }}>
                    <li>• <strong>On Sale Soon</strong> — buy at face value before the resale markup kicks in</li>
                    <li>• <strong>High Margin</strong> — current resale avg is well above floor price, good spread to profit from</li>
                    <li>• <strong>Scarce Supply</strong> — high demand + few listings = price will keep rising, buy now</li>
                    <li>• <strong>High Demand</strong> — top popularity scores, these sell out and premium prices hold</li>
                  </ul>
                </div>
              )}

              {/* Empty / loading state */}
              {events.length === 0 && !loading && (
                <div className="text-center py-16">
                  <BarChart2 size={40} color="#9ca3af" className="mx-auto mb-3" />
                  <p className="text-sm font-medium" style={{ color: '#374151' }}>No data yet</p>
                  <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>Enter your city and click Refresh to see the hottest tickets</p>
                  <button onClick={refresh} className="text-white text-sm px-6 py-2 rounded-lg" style={{ background: '#059669' }}>
                    Load Market Data
                  </button>
                </div>
              )}

              {loading && events.length === 0 && (
                <div className="text-center py-16">
                  <RefreshCw size={32} color="#9ca3af" className="mx-auto mb-3 animate-spin" />
                  <p className="text-sm" style={{ color: '#6b7280' }}>Scanning market data...</p>
                </div>
              )}

              {/* Event list */}
              {filtered.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                    {filter === 'all' ? `${filtered.length} opportunities` : `${filtered.length} ${CATEGORY_CONFIG[filter].label} events`}
                  </p>
                  {filtered.map((event, i) => {
                    const cfg = CATEGORY_CONFIG[event.category]
                    const Icon = cfg.icon
                    return (
                      <div key={event.id} className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb' }}>

                        {/* Top bar */}
                        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.color}22` }}>
                          <span className="text-xs font-bold w-5 text-center" style={{ color: '#9ca3af' }}>#{i + 1}</span>
                          <Icon size={13} color={cfg.color} />
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                          <span className="ml-auto text-xs" style={{ color: cfg.color }}>{event.reason}</span>
                        </div>

                        <div className="flex items-start gap-3 p-3">
                          {/* Image */}
                          {event.imageUrl ? (
                            <img src={event.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg shrink-0" style={{ background: '#f3f4f6' }} />
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-snug mb-0.5" style={{ color: '#111827' }}>{event.name}</p>
                            <p className="text-xs" style={{ color: '#6b7280' }}>
                              {event.venue}{event.city ? `, ${event.city}` : ''} · {event.date ? formatDate(event.date) : '—'}
                            </p>
                            {event.onSaleDate && (
                              <p className="text-xs font-semibold mt-0.5" style={{ color: '#dc2626' }}>
                                🔔 On sale: {formatDate(event.onSaleDate)}
                              </p>
                            )}
                          </div>

                          {/* Profit numbers */}
                          <div className="shrink-0 text-right space-y-0.5">
                            {event.estimatedProfit !== null && (
                              <div>
                                <p className="text-xs" style={{ color: '#9ca3af' }}>Est. profit/ticket</p>
                                <p className="text-lg font-bold" style={{ color: '#059669' }}>+${event.estimatedProfit}</p>
                                <p className="text-xs" style={{ color: '#059669' }}>+{event.profitPct}%</p>
                              </div>
                            )}
                            {event.category === 'on-sale-soon' && event.floorPrice && (
                              <div>
                                <p className="text-xs" style={{ color: '#9ca3af' }}>Face value</p>
                                <p className="text-lg font-bold" style={{ color: '#4f46e5' }}>${event.floorPrice}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price breakdown */}
                        {(event.floorPrice || event.avgPrice || event.highPrice) && (
                          <div className="grid grid-cols-3 divide-x mx-3 mb-2 rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                            <div className="px-2 py-1.5 text-center">
                              <p className="text-xs" style={{ color: '#9ca3af' }}>Floor</p>
                              <p className="text-sm font-bold" style={{ color: '#111827' }}>{event.floorPrice ? `$${event.floorPrice}` : '—'}</p>
                            </div>
                            <div className="px-2 py-1.5 text-center">
                              <p className="text-xs" style={{ color: '#9ca3af' }}>Avg Resale</p>
                              <p className="text-sm font-bold" style={{ color: event.avgPrice ? '#059669' : '#9ca3af' }}>{event.avgPrice ? `$${event.avgPrice}` : '—'}</p>
                            </div>
                            <div className="px-2 py-1.5 text-center">
                              <p className="text-xs" style={{ color: '#9ca3af' }}>High</p>
                              <p className="text-sm font-bold" style={{ color: '#111827' }}>{event.highPrice ? `$${event.highPrice}` : '—'}</p>
                            </div>
                          </div>
                        )}

                        {/* Demand + scarcity bars */}
                        {event.demandScore > 0 && (
                          <div className="px-3 pb-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
                              <span className="w-16 shrink-0">Demand</span>
                              <ScoreBar value={event.demandScore} />
                            </div>
                            {event.listingCount > 0 && (
                              <p className="text-xs" style={{ color: '#9ca3af' }}>{event.listingCount} listings on market</p>
                            )}
                          </div>
                        )}

                        {/* Action */}
                        <div className="px-3 pb-3 flex gap-2">
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg"
                            style={{ background: event.category === 'on-sale-soon' ? '#dc2626' : '#4f46e5' }}>
                            <ExternalLink size={11} />
                            {event.category === 'on-sale-soon' ? 'Buy Tickets Now' : 'View on ' + (event.platform === 'seatgeek' ? 'SeatGeek' : 'Ticketmaster')}
                          </a>
                          {event.platform === 'seatgeek' && (
                            <a
                              href={`https://www.stubhub.ca/search?q=${encodeURIComponent(event.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                              style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
                              StubHub ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
