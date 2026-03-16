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
    <div className="flex flex-col min-h-screen bg-gray-950 text-white max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-bold text-purple-400">🎫 TicketTracker</h1>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-900 border-t border-gray-800 flex z-10">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
