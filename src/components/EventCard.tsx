import { format, parseISO } from 'date-fns'
import { MapPin, Calendar, DollarSign, Tag, ExternalLink, Plus } from 'lucide-react'
import type { TicketEvent } from '@/types/event'

interface Props {
  event: TicketEvent
  onTrack?: (event: TicketEvent) => void
}

export default function EventCard({ event, onTrack }: Props) {
  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy h:mm a') } catch { return d }
  }

  const priceStr = event.minPrice && event.maxPrice
    ? `$${event.minPrice} – $${event.maxPrice}`
    : event.minPrice ? `From $${event.minPrice}`
    : event.maxPrice ? `Up to $${event.maxPrice}`
    : null

  return (
    <div className="rounded-lg flex items-center gap-3 px-3 py-2 transition-colors" style={{background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'}}>
      {/* Thumbnail */}
      {event.imageUrl ? (
        <img src={event.imageUrl} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded shrink-0" style={{background: '#f3f4f6'}} />
      )}

      {/* Name + type badge */}
      <div className="w-56 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
            event.type === 'sports' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {event.type}
          </span>
        </div>
        <p className="text-sm font-semibold leading-tight mt-0.5 line-clamp-2" style={{color: '#111827'}}>{event.name}</p>
      </div>

      {/* Venue */}
      <div className="flex items-center gap-1 text-xs w-44 shrink-0" style={{color: '#6b7280'}}>
        <MapPin size={11} className="shrink-0" />
        <span className="truncate">{event.venue}{event.city ? `, ${event.city}` : ''}</span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1 text-xs w-40 shrink-0" style={{color: '#6b7280'}}>
        <Calendar size={11} className="shrink-0" />
        <span className="truncate">{event.date ? formatDate(event.date) : '—'}</span>
      </div>

      {/* On-sale date */}
      <div className="flex items-center gap-1 text-xs w-40 shrink-0" style={{color: '#6b7280'}}>
        <Tag size={11} className="shrink-0" />
        <span className="truncate">{event.onSaleDate ? formatDate(event.onSaleDate) : '—'}</span>
      </div>

      {/* Price */}
      <div className="flex items-center gap-1 text-xs w-28 shrink-0" style={{color: '#059669'}}>
        <DollarSign size={11} className="shrink-0" />
        <span>{priceStr ?? '—'}</span>
      </div>

      {/* Presale codes */}
      <div className="flex-1 flex flex-wrap gap-1 min-w-0">
        {event.presaleCodes.filter(c => c && !c.includes('undefined')).map((code, i) => (
          <span key={i} className="text-xs whitespace-nowrap px-1.5 py-0.5 rounded" style={{background: '#fef3c7', color: '#92400e'}}>
            {code}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0 ml-auto">
        {onTrack && (
          <button
            onClick={() => onTrack(event)}
            className="flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            style={{background: '#4f46e5'}}
          >
            <Plus size={12} /> Track
          </button>
        )}
        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            style={{background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb'}}
          >
            <ExternalLink size={12} /> Tickets
          </a>
        )}
      </div>
    </div>
  )
}
