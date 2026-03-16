import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchEvents } from '@/lib/ticketmaster'
import { searchSeatGeek } from '@/lib/seatgeek'
import { addToSchedule } from '@/lib/schedule'
import EventCard from '@/components/EventCard'
import type { TicketEvent } from '@/types/event'

type Filter = 'all' | 'concert' | 'sports'

export default function Discover() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState(() => localStorage.getItem('tt_city') ?? 'Toronto')
  const [filter, setFilter] = useState<Filter>('all')
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [tracked, setTracked] = useState<Set<string>>(new Set())

  // Auto-load upcoming events on mount
  useEffect(() => { handleSearch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSearch() {
    setLoading(true)
    try {
      const [tm, sg] = await Promise.all([
        searchEvents(query, city),
        searchSeatGeek(query, city),
      ])
      const merged = [...tm, ...sg].sort((a, b) =>
        (a.date || '').localeCompare(b.date || '')
      )
      setEvents(merged)
    } finally {
      setLoading(false)
    }
  }

  async function handleTrack(event: TicketEvent) {
    await addToSchedule(event)
    setTracked(prev => new Set([...prev, event.id]))
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4" style={{color: '#111827'}}>Discover Events</h1>

      {/* Search inputs */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: '#9ca3af'}} />
          <input
            type="text"
            placeholder="Artist, team, or leave blank for all events..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            style={{background: 'white', border: '1px solid #d1d5db', color: '#111827'}}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={e => { setCity(e.target.value); localStorage.setItem('tt_city', e.target.value) }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{background: 'white', border: '1px solid #d1d5db', color: '#111827'}}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{background: '#4f46e5'}}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {(['all', 'concert', 'sports'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3 py-1 rounded-full capitalize transition-colors"
            style={filter === f
              ? {background: '#4f46e5', color: 'white'}
              : {background: 'white', color: '#6b7280', border: '1px solid #e5e7eb'}
            }
          >
            {f}
          </button>
        ))}
        {events.length > 0 && (
          <span className="ml-auto text-xs" style={{color: '#9ca3af'}}>
            {filtered.length} events (next 6 months)
          </span>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 && !loading && (
        <p className="text-sm text-center py-8" style={{color: '#9ca3af'}}>
          No events found. Try a different search or city.
        </p>
      )}

      <div className="space-y-1.5 overflow-x-auto">
        {filtered.map(event => (
          <div key={event.id} className="relative min-w-0">
            <EventCard
              event={event}
              onTrack={tracked.has(event.id) ? undefined : handleTrack}
            />
            {tracked.has(event.id) && (
              <div className="absolute top-2 right-2 text-white text-xs px-2 py-0.5 rounded-full" style={{background: '#059669'}}>
                ✓ Tracked
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
