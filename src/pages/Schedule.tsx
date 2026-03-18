import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MapPin, Calendar, Trash2, Bell } from 'lucide-react'
import { subscribeSchedule, removeFromSchedule } from '@/lib/schedule'
import type { ScheduledEvent } from '@/lib/schedule'
import NotifSetup from '@/components/NotifSetup'

function NotifBadge({ sent, label }: { sent: boolean; label: string }) {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full" style={
      sent
        ? { background: '#d1fae5', color: '#065f46' }
        : { background: '#f3f4f6', color: '#9ca3af' }
    }>
      {sent ? '✓' : '○'} {label}
    </span>
  )
}

export default function Schedule() {
  const [events, setEvents] = useState<ScheduledEvent[]>([])

  useEffect(() => subscribeSchedule(setEvents), [])

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>Watchlist</h1>
      <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
        Events you're watching. Get notified at each milestone.
      </p>

      <NotifSetup />

      {events.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#9ca3af' }}>
          No tracked events yet. Search for events and click "+ Track" to add them.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map(item => (
            <div key={item.id} className="rounded-xl p-3" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm leading-snug" style={{ color: '#111827' }}>{item.event.name}</h3>
                <button
                  onClick={() => item.id && removeFromSchedule(item.id)}
                  className="shrink-0 transition-colors"
                  style={{ color: '#d1d5db' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseOut={e => (e.currentTarget.style.color = '#d1d5db')}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="space-y-1 text-xs mb-3" style={{ color: '#6b7280' }}>
                {item.event.venue && (
                  <div className="flex items-center gap-1">
                    <MapPin size={11} />
                    <span>{item.event.venue}{item.event.city ? `, ${item.event.city}` : ''}</span>
                  </div>
                )}
                {item.event.date && (
                  <div className="flex items-center gap-1">
                    <Calendar size={11} />
                    <span>{formatDate(item.event.date)}</span>
                  </div>
                )}
                {item.event.onSaleDate && (
                  <div className="flex items-center gap-1">
                    <Bell size={11} />
                    <span>On sale: {formatDate(item.event.onSaleDate)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <NotifBadge sent={item.notifications.announced} label="Announced" />
                <NotifBadge sent={item.notifications.oneWeek} label="1 Week" />
                <NotifBadge sent={item.notifications.twentyFourHour} label="24 Hrs" />
                <NotifBadge sent={item.notifications.onSale} label="On Sale" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
