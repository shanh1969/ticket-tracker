import { useState, useEffect } from 'react'
import { Plus, Trash2, Music, Users } from 'lucide-react'
import { subscribeWatchlist, addToWatchlist, removeFromWatchlist } from '@/lib/watchlist'
import type { WatchlistItem } from '@/lib/watchlist'

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'artist' | 'team'>('artist')
  const [saving, setSaving] = useState(false)

  useEffect(() => subscribeWatchlist(setItems), [])

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addToWatchlist({ name: name.trim(), type })
      setName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Watchlist</h1>
      <p className="text-gray-400 text-sm mb-4">
        Add artists or teams. We'll alert you when new events are announced.
      </p>

      {/* Add form */}
      <div className="bg-gray-900 rounded-xl p-3 mb-4 border border-gray-800">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setType('artist')}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              type === 'artist' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Music size={12} /> Artist
          </button>
          <button
            onClick={() => setType('team')}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              type === 'team' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Users size={12} /> Team
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={type === 'artist' ? 'e.g. Taylor Swift' : 'e.g. Toronto Maple Leafs'}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No watchlist items yet. Add an artist or team above.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800"
            >
              <div className="flex items-center gap-2">
                {item.type === 'artist' ? (
                  <Music size={14} className="text-purple-400" />
                ) : (
                  <Users size={14} className="text-blue-400" />
                )}
                <span className="text-sm font-medium text-white">{item.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  item.type === 'artist'
                    ? 'bg-purple-900 text-purple-300'
                    : 'bg-blue-900 text-blue-300'
                }`}>
                  {item.type}
                </span>
              </div>
              <button
                onClick={() => item.id && removeFromWatchlist(item.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
