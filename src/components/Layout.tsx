import { NavLink, Outlet } from 'react-router-dom'
import { Search, Bookmark, Calendar, Ticket, TrendingUp, DollarSign, ChevronUp, ChevronDown } from 'lucide-react'
import TicketLessons from './TicketLessons'
import HotTickets from './HotTickets'

const navItems = [
  { to: '/discover', icon: Search, label: 'Discover' },
  { to: '/watchlist', icon: Bookmark, label: 'Artists' },
  { to: '/schedule', icon: Calendar, label: 'Watchlist' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/resell', icon: TrendingUp, label: 'Resell' },
  { to: '/profits', icon: DollarSign, label: 'Profits' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen w-full relative" style={{color: '#1f2937'}}>
      {/* Header */}
      <header className="sticky top-0 z-10 shadow-sm" style={{background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb'}}>
        {/* Top row: logo + actions */}
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-lg font-bold" style={{color: '#4f46e5'}}>🎫 TicketTracker</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb'}}
              title="Scroll to top"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb'}}
              title="Scroll to bottom"
            >
              <ChevronDown size={14} />
            </button>
            <HotTickets />
            <TicketLessons />
          </div>
        </div>

        {/* Nav row */}
        <nav className="flex" style={{borderTop: '1px solid #f3f4f6'}}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 flex-1 py-1.5 text-xs transition-colors ${
                  isActive ? 'font-semibold' : ''
                }`
              }
              style={({ isActive }) => ({ color: isActive ? '#4f46e5' : '#9ca3af' })}
            >
              <Icon size={14} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
