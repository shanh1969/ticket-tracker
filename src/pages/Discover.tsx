import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, Clock, X } from 'lucide-react'
import { searchEvents } from '@/lib/ticketmaster'
import { searchSeatGeek } from '@/lib/seatgeek'
import { addToSchedule } from '@/lib/schedule'
import { showBrowserNotification } from '@/lib/notifications'
import EventCard from '@/components/EventCard'
import type { TicketEvent } from '@/types/event'

type Filter = 'all' | 'concert' | 'sports'

export default function Discover() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState(() => localStorage.getItem('tt_city') ?? 'Toronto')
  const [filter, setFilter] = useState<Filter>('all')
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [tracked, setTracked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tt_search_history') || '[]') } catch { return [] }
  })
  const searchRef = useRef<HTMLDivElement>(null)

  // Close history dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-load upcoming events on mount
  useEffect(() => { handleSearch() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function saveToHistory(q: string) {
    if (!q.trim()) return
    const updated = [q, ...searchHistory.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 10)
    setSearchHistory(updated)
    localStorage.setItem('tt_search_history', JSON.stringify(updated))
  }

  function removeFromHistory(item: string) {
    const updated = searchHistory.filter(h => h !== item)
    setSearchHistory(updated)
    localStorage.setItem('tt_search_history', JSON.stringify(updated))
  }

  function dedupeEvents(events: TicketEvent[]): TicketEvent[] {
    const seen = new Map<string, TicketEvent>()
    for (const e of events) {
      // Normalize: same name + same day + same venue = same event
      const day = (e.date || '').slice(0, 10)
      const key = `${e.name.toLowerCase().trim()}|${day}|${(e.venue || '').toLowerCase().trim()}`
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, e)
      } else {
        // Keep whichever has more data (url, presaleCodes, price)
        const score = (ev: TicketEvent) =>
          (ev.url ? 2 : 0) + (ev.presaleCodes.length) + (ev.minPrice ? 1 : 0)
        if (score(e) > score(existing)) seen.set(key, e)
      }
    }
    return Array.from(seen.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }

  async function handleSearch(overrideQuery?: string) {
    const q = overrideQuery !== undefined ? overrideQuery : query
    if (overrideQuery !== undefined) setQuery(overrideQuery)
    if (q.trim()) saveToHistory(q.trim())
    setShowHistory(false)
    setLoading(true)
    setPage(0)
    setHasMore(true)
    try {
      const [tm, sg] = await Promise.all([
        searchEvents(q, city, 0),
        searchSeatGeek(q, city, 1),
      ])
      setEvents(dedupeEvents([...tm, ...sg]))
      setHasMore(tm.length === 50 || sg.length === 50)
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadMore() {
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const [tm, sg] = await Promise.all([
        searchEvents(query, city, nextPage),
        searchSeatGeek(query, city, nextPage + 1),
      ])
      setEvents(prev => dedupeEvents([...prev, ...tm, ...sg]))
      setPage(nextPage)
      setHasMore(tm.length === 50 || sg.length === 50)
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleTrack(event: TicketEvent): Promise<void> {
    await addToSchedule(event)
    setTracked(prev => new Set([...prev, event.id]))
    showBrowserNotification('✓ Added to Watchlist!', `You're now watching ${event.name}`)
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4" style={{color: '#111827'}}>Discover Events</h1>

      {/* Search inputs */}
      <div className="space-y-2 mb-3">
        <div className="relative" ref={searchRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color: '#9ca3af'}} />
          <input
            type="search"
            name="event-search"
            autoComplete="off"
            placeholder="Artist, team, or leave blank for all events..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            style={{background: 'white', border: '1px solid #d1d5db', color: '#111827'}}
          />
          {/* Search history dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20" style={{background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}>
              <div className="px-3 py-1.5 flex items-center justify-between" style={{borderBottom: '1px solid #f3f4f6'}}>
                <span className="text-xs font-semibold" style={{color: '#9ca3af'}}>Recent Searches</span>
                <button className="text-xs" style={{color: '#9ca3af'}} onClick={() => { setSearchHistory([]); localStorage.removeItem('tt_search_history') }}>Clear all</button>
              </div>
              {searchHistory.map(item => (
                <div key={item} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSearch(item)}>
                  <Clock size={13} style={{color: '#9ca3af'}} className="shrink-0" />
                  <span className="flex-1 text-sm" style={{color: '#111827'}}>{item}</span>
                  <button onClick={e => { e.stopPropagation(); removeFromHistory(item) }} className="p-0.5 rounded">
                    <X size={12} style={{color: '#9ca3af'}} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
            onClick={() => handleSearch()}
            disabled={loading}
            className="text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{background: '#4f46e5'}}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Also search on other platforms */}
      <div className="rounded-lg px-3 py-2 mb-3 flex flex-wrap items-center gap-2" style={{background: 'white', border: '1px solid #e5e7eb'}}>
        <span className="text-xs shrink-0" style={{color: '#6b7280'}}>Also search on:</span>
        {[
          { label: 'Ticketmaster', url: `https://www.ticketmaster.ca/search?q=${encodeURIComponent(query || 'concerts')}` },
          { label: 'AXS', url: `https://www.axs.com/search?q=${encodeURIComponent(query || 'concerts')}` },
          { label: 'Live Nation', url: `https://www.livenation.com/search?q=${encodeURIComponent(query || 'concerts')}` },
          { label: 'StubHub', url: `https://www.stubhub.ca/search?q=${encodeURIComponent(query || 'concerts')}` },
          { label: 'SeatGeek', url: `https://www.seatgeek.com/search?q=${encodeURIComponent(query || 'concerts')}` },
        ].map(({ label, url }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded-full transition-colors"
            style={{background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb'}}
          >
            {label} ↗
          </a>
        ))}
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
        {filtered.map((event, i) => (
          <div key={event.id} className="relative min-w-0 flex items-center gap-2">
            <span className="text-xs w-7 text-right shrink-0 select-none" style={{color: '#9ca3af'}}>{i + 1}</span>
            <div className="flex-1 min-w-0 relative">
              <EventCard
                event={event}
                onTrack={tracked.has(event.id) ? undefined : handleTrack}
              />
              {tracked.has(event.id) && (
                <div className="absolute top-2 right-2 text-white text-xs px-2 py-0.5 rounded-full" style={{background: '#059669'}}>
                  ✓ Watching
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {!loading && events.length > 0 && hasMore && (
        <div className="flex justify-center pt-4 pb-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{background: 'white', border: '1px solid #d1d5db', color: '#374151'}}
          >
            {loadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : `Load More (showing ${filtered.length})`}
          </button>
        </div>
      )}
      {!loading && events.length > 0 && !hasMore && (
        <p className="text-center text-xs py-4" style={{color: '#9ca3af'}}>
          All {filtered.length} events loaded
        </p>
      )}
    </div>
  )
}
