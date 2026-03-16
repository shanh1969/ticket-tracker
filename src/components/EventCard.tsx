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

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="w-full h-32 object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-sm leading-snug">{event.name}</h3>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            event.type === 'sports' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
          }`}>
            {event.type}
          </span>
        </div>

        <div className="space-y-1 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{event.venue}{event.city ? `, ${event.city}` : ''}</span>
          </div>
          {event.date && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{formatDate(event.date)}</span>
            </div>
          )}
          {event.onSaleDate && (
            <div className="flex items-center gap-1">
              <Tag size={12} />
              <span>On sale: {formatDate(event.onSaleDate)}</span>
            </div>
          )}
          {(event.minPrice || event.maxPrice) && (
            <div className="flex items-center gap-1">
              <DollarSign size={12} />
              <span>
                {event.minPrice && event.maxPrice
                  ? `$${event.minPrice} – $${event.maxPrice}`
                  : event.minPrice
                  ? `From $${event.minPrice}`
                  : `Up to $${event.maxPrice}`}
              </span>
            </div>
          )}
          {event.presaleCodes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {event.presaleCodes.map((code, i) => (
                <span key={i} className="bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded text-xs">
                  {code}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {onTrack && (
            <button
              onClick={() => onTrack(event)}
              className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Track
            </button>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink size={12} /> View Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
