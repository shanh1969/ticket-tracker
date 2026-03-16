import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { searchEvents } from '@/lib/ticketmaster'
import { searchSeatGeek } from '@/lib/seatgeek'
import { addToSchedule } from '@/lib/schedule'
import EventCard from '@/components/EventCard'
import type { TicketEvent } from '@/types/event'

type Filter = 'all' | 'concert' | 'sports'

export default function Discover() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [tracked, setTracked] = useState<Set<string>>(new Set())

  async function handleSearch() {
    if (!query.trim() && !city.trim()) return
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
      <h1 className="text-xl font-bold mb-4">Discover Events</h1>

      {/* Search inputs */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Artist, team, or event..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="City (optional)"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
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
            className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
              filter === f
                ? 'bg-purple-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 && !loading && (
        <p className="text-gray-500 text-sm text-center py-8">
          Search for an artist, team, or event to get started.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map(event => (
          <div key={event.id} className="relative">
            <EventCard
              event={event}
              onTrack={tracked.has(event.id) ? undefined : handleTrack}
            />
            {tracked.has(event.id) && (
              <div className="absolute top-2 right-2 bg-green-700 text-white text-xs px-2 py-0.5 rounded-full">
                ✓ Tracked
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
