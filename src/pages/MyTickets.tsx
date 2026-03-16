import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, Mail, Edit3 } from 'lucide-react'
import { subscribeTickets, addTicket, deleteTicket } from '@/lib/tickets'
import type { MyTicket } from '@/lib/tickets'

const BLANK: Omit<MyTicket, 'id' | 'addedAt' | 'source'> = {
  eventName: '', venue: '', date: '', section: '', row: '', seat: '',
  pricePaid: 0, platform: '', orderNumber: '',
}

export default function MyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)

  useEffect(() => subscribeTickets(setTickets), [])

  function update(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.eventName.trim()) return
    setSaving(true)
    try {
      await addTicket({ ...form, source: 'manual' })
      setForm({ ...BLANK })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM d, yyyy') } catch { return d }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Tickets</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Manually
        </button>
      </div>

      {/* Manual entry form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-1">Add Ticket Manually</h3>
          {([
            ['eventName', 'Event Name *', 'text'],
            ['venue', 'Venue', 'text'],
            ['date', 'Event Date', 'date'],
            ['section', 'Section', 'text'],
            ['row', 'Row', 'text'],
            ['seat', 'Seat', 'text'],
            ['pricePaid', 'Price Paid ($)', 'number'],
            ['platform', 'Platform (e.g. Ticketmaster)', 'text'],
            ['orderNumber', 'Order #', 'text'],
          ] as [keyof typeof BLANK, string, string][]).map(([field, label, type]) => (
            <div key={field}>
              <label className="text-xs text-gray-400">{label}</label>
              <input
                type={type}
                value={String(form[field])}
                onChange={e => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 mt-0.5"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.eventName.trim()}
              className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Ticket'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Email import tip */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 mb-4 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <Mail size={14} className="text-purple-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-white font-medium">Auto-import via email:</span> Forward your ticket
            confirmation emails to your inbound Resend address and tickets will appear here automatically.
          </div>
        </div>
      </div>

      {/* Ticket list */}
      {tickets.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No tickets yet. Add manually or forward a confirmation email.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-white text-sm">{ticket.eventName}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                    ticket.source === 'email'
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {ticket.source === 'email' ? <Mail size={10} /> : <Edit3 size={10} />}
                    {ticket.source === 'email' ? 'Auto-imported' : 'Manual'}
                  </span>
                  <button
                    onClick={() => ticket.id && deleteTicket(ticket.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 space-y-0.5">
                {ticket.venue && <div>{ticket.venue}</div>}
                {ticket.date && <div>{formatDate(ticket.date)}</div>}
                <div className="flex gap-3">
                  {ticket.section && <span>Sec: {ticket.section}</span>}
                  {ticket.row && <span>Row: {ticket.row}</span>}
                  {ticket.seat && <span>Seat: {ticket.seat}</span>}
                </div>
                <div className="flex gap-3">
                  {ticket.pricePaid > 0 && <span className="text-green-400">${ticket.pricePaid} paid</span>}
                  {ticket.platform && <span>{ticket.platform}</span>}
                  {ticket.orderNumber && <span>#{ticket.orderNumber}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
