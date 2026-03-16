import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MapPin, Calendar, Trash2, Bell } from 'lucide-react'
import { subscribeSchedule, removeFromSchedule } from '@/lib/schedule'
import type { ScheduledEvent } from '@/lib/schedule'

function NotifBadge({ sent, label }: { sent: boolean; label: string }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
      sent ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'
    }`}>
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
      <h1 className="text-xl font-bold mb-1">My Schedule</h1>
      <p className="text-gray-400 text-sm mb-4">
        Events you're tracking. Email alerts will be sent at each milestone.
      </p>

      {events.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No tracked events yet. Search for events and click "+ Track" to add them.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map(item => (
            <div key={item.id} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white text-sm leading-snug">{item.event.name}</h3>
                <button
                  onClick={() => item.id && removeFromSchedule(item.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="space-y-1 text-xs text-gray-400 mb-3">
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

              {/* Notification status */}
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
