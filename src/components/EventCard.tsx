import { useState } from 'react'
import { format, parseISO, formatDistanceToNow, isPast } from 'date-fns'
import { MapPin, Calendar, Tag, DollarSign, ExternalLink, Plus, Loader2, Check, TrendingUp, BarChart3, Clock, Ticket } from 'lucide-react'
import type { TicketEvent } from '@/types/event'

interface Props {
  event: TicketEvent
  onTrack?: (event: TicketEvent) => void
}

export default function EventCard({ event, onTrack }: Props) {
  const [watchState, setWatchState] = useState<'idle' | 'loading' | 'done'>('idle')

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy h:mm a') } catch { return d }
  }
  const formatShortDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
  }
  const formatTimeUntil = (d: string) => {
    try {
      const date = parseISO(d)
      if (isPast(date)) return 'Past'
      return formatDistanceToNow(date, { addSuffix: true })
    } catch { return '' }
  }

  const facePrice = event.minPrice && event.maxPrice
    ? `$${event.minPrice} – $${event.maxPrice}`
    : event.minPrice ? `From $${event.minPrice}`
    : event.maxPrice ? `Up to $${event.maxPrice}`
    : null

  const resalePrice = event.resaleMinPrice && event.resaleMaxPrice
    ? `$${event.resaleMinPrice} – $${event.resaleMaxPrice}`
    : event.resaleAvgPrice ? `~$${event.resaleAvgPrice}`
    : null

  const onSaleSoon = event.onSaleDate && !isPast(parseISO(event.onSaleDate))

  return (
    <div className="rounded-lg px-3 py-3 transition-colors" style={{background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>

      {/* Top row: image + name + badge + actions */}
      <div className="flex items-start gap-3">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded shrink-0" style={{background: '#f3f4f6'}} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  event.type === 'sports' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {event.type}
                </span>
                {event.platform === 'seatgeek' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">SeatGeek</span>
                )}
                {event.platform === 'ticketmaster' && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">Ticketmaster</span>
                )}
                {event.demandScore !== null && event.demandScore >= 70 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Hot</span>
                )}
              </div>
              <p className="text-sm font-semibold leading-tight mt-1" style={{color: '#111827'}}>{event.name}</p>
              {event.genre && <p className="text-xs mt-0.5" style={{color: '#9ca3af'}}>{event.genre}</p>}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 shrink-0">
              {onTrack && (
                <button
                  onClick={async () => {
                    if (watchState !== 'idle') return
                    setWatchState('loading')
                    await onTrack(event)
                    setWatchState('done')
                  }}
                  disabled={watchState !== 'idle'}
                  className="flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all active:scale-95"
                  style={{
                    background: watchState === 'done' ? '#059669' : '#4f46e5',
                    opacity: watchState === 'loading' ? 0.8 : 1,
                  }}>
                  {watchState === 'loading' && <Loader2 size={11} className="animate-spin" />}
                  {watchState === 'done' && <Check size={11} />}
                  {watchState === 'idle' && <Plus size={11} />}
                  {watchState === 'loading' ? 'Saving…' : watchState === 'done' ? 'Watched!' : 'Watch'}
                </button>
              )}
              {event.url && (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap"
                  style={{background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb'}}>
                  <ExternalLink size={11} /> Buy
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info grid — 2 columns of titled sections */}
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">

        {/* CONCERT DATE */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{color: '#6b7280', fontSize: '10px'}}>Concert Date</p>
          <div className="flex items-center gap-1 text-xs" style={{color: '#111827'}}>
            <Calendar size={11} className="shrink-0" style={{color: '#6b7280'}} />
            <span>{event.date ? formatDate(event.date) : 'TBA'}</span>
          </div>
          {event.date && (
            <p className="text-xs pl-4 mt-0.5" style={{color: '#9ca3af'}}>{formatTimeUntil(event.date)}</p>
          )}
          {event.doorsTime && (
            <p className="text-xs pl-4" style={{color: '#9ca3af'}}>Doors: {event.doorsTime}</p>
          )}
        </div>

        {/* ON SALE DATE */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{color: '#6b7280', fontSize: '10px'}}>On Sale Date</p>
          {event.onSaleDate ? (
            <>
              <div className="flex items-center gap-1 text-xs" style={{color: onSaleSoon ? '#b45309' : '#111827'}}>
                <Tag size={11} className="shrink-0" style={{color: onSaleSoon ? '#b45309' : '#6b7280'}} />
                <span className={onSaleSoon ? 'font-semibold' : ''}>{formatDate(event.onSaleDate)}</span>
              </div>
              {onSaleSoon && (
                <p className="text-xs pl-4 mt-0.5 font-medium" style={{color: '#b45309'}}>
                  {formatTimeUntil(event.onSaleDate)}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs" style={{color: '#9ca3af'}}>
              <Tag size={11} className="shrink-0" />
              <span>Already on sale / TBA</span>
            </div>
          )}
          {event.preSaleDate && (
            <p className="text-xs pl-4 mt-0.5" style={{color: '#7c3aed'}}>
              Presale: {formatShortDate(event.preSaleDate)}
            </p>
          )}
        </div>

        {/* FACE VALUE / TICKET COST */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{color: '#6b7280', fontSize: '10px'}}>Ticket Cost (Face Value)</p>
          <div className="flex items-center gap-1 text-xs" style={{color: facePrice ? '#059669' : '#9ca3af'}}>
            <DollarSign size={11} className="shrink-0" />
            {facePrice ? (
              <span className="font-semibold">{facePrice}</span>
            ) : event.url ? (
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{color: '#6b7280'}}>See site for price</a>
            ) : (
              <span>Price TBA</span>
            )}
          </div>
          {event.minPrice && event.maxPrice && (
            <p className="text-xs pl-4 mt-0.5" style={{color: '#9ca3af'}}>
              Spread: {Math.round(event.maxPrice / event.minPrice)}x range
            </p>
          )}
        </div>

        {/* RESALE PRICE / POTENTIAL VALUE */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{color: '#6b7280', fontSize: '10px'}}>Resale Price (Est. Value)</p>
          {resalePrice ? (
            <>
              <div className="flex items-center gap-1 text-xs" style={{color: '#7c3aed'}}>
                <TrendingUp size={11} className="shrink-0" />
                <span className="font-semibold">{resalePrice}</span>
              </div>
              {event.resaleAvgPrice && (
                <p className="text-xs pl-4 mt-0.5" style={{color: '#9ca3af'}}>
                  Avg: ${event.resaleAvgPrice}
                  {event.resaleMedianPrice ? ` · Med: $${event.resaleMedianPrice}` : ''}
                </p>
              )}
              {event.resaleListingCount !== null && event.resaleListingCount > 0 && (
                <p className="text-xs pl-4" style={{color: '#9ca3af'}}>
                  {event.resaleListingCount} listings on market
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs" style={{color: '#9ca3af'}}>
              <TrendingUp size={11} className="shrink-0" />
              <span>No resale data</span>
            </div>
          )}
        </div>
      </div>

      {/* Profit estimate bar */}
      {(event.estimatedProfit !== null || event.demandScore !== null) && (
        <div className="mt-2 rounded-md px-2.5 py-2" style={{background: '#f0fdf4', border: '1px solid #bbf7d0'}}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {event.estimatedProfit !== null && (
              <div className="flex items-center gap-1.5">
                <DollarSign size={12} style={{color: '#059669'}} />
                <span className="text-xs font-semibold" style={{color: '#059669'}}>
                  Est. Profit: ${event.estimatedProfit}/ticket
                </span>
                {event.profitMarginPct !== null && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{
                    background: event.profitMarginPct >= 50 ? '#dcfce7' : '#fef9c3',
                    color: event.profitMarginPct >= 50 ? '#166534' : '#854d0e',
                  }}>
                    +{event.profitMarginPct}%
                  </span>
                )}
              </div>
            )}
            {event.demandScore !== null && (
              <div className="flex items-center gap-1.5">
                <BarChart3 size={12} style={{color: event.demandScore >= 70 ? '#dc2626' : event.demandScore >= 40 ? '#b45309' : '#6b7280'}} />
                <span className="text-xs font-medium" style={{color: '#374151'}}>
                  Demand: {event.demandScore}/100
                </span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{background: '#e5e7eb'}}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${event.demandScore}%`,
                      background: event.demandScore >= 70 ? '#dc2626' : event.demandScore >= 40 ? '#f59e0b' : '#9ca3af',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          {event.platform === 'ticketmaster' && event.estimatedProfit !== null && (
            <p className="text-xs mt-1" style={{color: '#6b7280'}}>
              Based on price spread, presale activity & historical patterns (15% platform fee included)
            </p>
          )}
          {event.platform === 'seatgeek' && event.resaleAvgPrice !== null && (
            <p className="text-xs mt-1" style={{color: '#6b7280'}}>
              Based on live SeatGeek resale market data (15% platform fee included)
            </p>
          )}
        </div>
      )}

      {/* Venue */}
      <div className="mt-2 text-xs" style={{color: '#6b7280'}}>
        <div className="flex items-start gap-1 min-w-0">
          <MapPin size={10} className="shrink-0 mt-0.5" />
          <span className="truncate">{event.venue}{event.city ? `, ${event.city}` : ''}</span>
        </div>
        {event.address && (
          <div className="flex items-start gap-1 min-w-0 pl-3.5">
            <span className="truncate" style={{color: '#9ca3af'}}>{event.address}</span>
          </div>
        )}
      </div>

      {/* Presale codes */}
      {event.presaleCodes.filter(c => c && !c.includes('undefined')).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.presaleCodes.filter(c => c && !c.includes('undefined')).map((code, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{background: '#fef3c7', color: '#92400e'}}>
              {code}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
