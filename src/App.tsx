import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Discover from './pages/Discover'
import Watchlist from './pages/Watchlist'
import Schedule from './pages/Schedule'
import MyTickets from './pages/MyTickets'
import Resell from './pages/Resell'
import './index.css'

export default function App() {
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
