import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Discover from './pages/Discover'
import Watchlist from './pages/Watchlist'
import Schedule from './pages/Schedule'
import MyTickets from './pages/MyTickets'
import Resell from './pages/Resell'
import Profits from './pages/Profits'
import { checkAndSendNotifications } from './lib/notifications'
import './index.css'

export default function App() {
  useEffect(() => {
    // Check for due notifications on every app open
    checkAndSendNotifications().catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/discover" replace />} />
          <Route path="discover" element={<Discover />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="tickets" element={<MyTickets />} />
          <Route path="resell" element={<Resell />} />
          <Route path="profits" element={<Profits />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
