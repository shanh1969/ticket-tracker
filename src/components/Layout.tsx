import { NavLink, Outlet } from 'react-router-dom'
import { Search, Bookmark, Calendar, Ticket, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/discover', icon: Search, label: 'Discover' },
  { to: '/watchlist', icon: Bookmark, label: 'Watchlist' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/resell', icon: TrendingUp, label: 'Resell' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen w-full relative" style={{color: '#1f2937'}}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 shadow-sm" style={{background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb'}}>
        <h1 className="text-lg font-bold" style={{color: '#4f46e5'}}>🎫 TicketTracker</h1>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full flex z-10" style={{background: 'rgba(255,255,255,0.95)', borderTop: '1px solid #e5e7eb', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)'}}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 text-xs gap-1 transition-colors ${
                isActive ? 'font-semibold' : ''
              }`
            }
            style={({ isActive }) => ({ color: isActive ? '#4f46e5' : '#9ca3af' })}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
