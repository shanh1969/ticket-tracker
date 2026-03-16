# TicketTracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React + Firebase web app that tracks ticket events across major platforms, sends email alerts at key milestones, manages purchased tickets, and provides resale price intelligence to maximize profit.

**Architecture:** React + Vite frontend deployed to Vercel, Firebase Firestore for data, Firebase Cloud Functions (scheduled) for background jobs, Resend for outbound + inbound email, Ticketmaster Discovery API + SeatGeek API for event data.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Firebase (Firestore + Cloud Functions), Resend, Ticketmaster Discovery API, SeatGeek API, StubHub Seller API

---

## Phase 1: Project Scaffold

### Task 1: Initialize React + Vite + TypeScript project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`

**Step 1: Scaffold project**
```bash
cd /c/Users/shane/Downloads/tickets
npm create vite@latest . -- --template react-ts
npm install
```

**Step 2: Install core dependencies**
```bash
npm install firebase tailwindcss @tailwindcss/vite lucide-react date-fns axios
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-badge @radix-ui/react-select @radix-ui/react-toast
npm install class-variance-authority clsx tailwind-merge
npm install react-router-dom
```

**Step 3: Install dev dependencies**
```bash
npm install -D @types/node
```

**Step 4: Initialize Tailwind**
Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

Create `src/index.css`:
```css
@import "tailwindcss";
```

**Step 5: Initialize git**
```bash
git init
echo "node_modules/\n.env\n.env.local\ndist/" > .gitignore
git add -A
git commit -m "feat: initialize React + Vite + TypeScript project"
```

---

### Task 2: Firebase setup

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `.env.local`
- Create: `functions/` directory

**Step 1: Install Firebase tools**
```bash
npm install firebase
npm install -g firebase-tools
firebase login
firebase init
```
Select: Firestore, Functions, Emulators. Use existing project or create `tickettracker-app`.

**Step 2: Create Firebase config**

Create `src/lib/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
```

**Step 3: Create `.env.local`**
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_TICKETMASTER_API_KEY=your_tm_key
VITE_SEATGEEK_CLIENT_ID=your_sg_client_id
VITE_RESEND_API_KEY=your_resend_key
VITE_ALERT_EMAIL=your@email.com
```

**Step 4: Create Firestore collections schema**

Collections to create (documents will auto-create on first write):
- `events` — discovered events from APIs
- `watchlist` — artists/teams to monitor
- `schedule` — events user is tracking with notification prefs
- `my_tickets` — purchased ticket inventory
- `resale_listings` — active resale listings
- `notifications_log` — log of sent notifications
- `presale_codes` — collected presale codes per event

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: add Firebase config and Firestore schema"
```

---

### Task 3: App shell with routing and navigation

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/pages/Discover.tsx`
- Create: `src/pages/Watchlist.tsx`
- Create: `src/pages/Schedule.tsx`
- Create: `src/pages/MyTickets.tsx`
- Create: `src/pages/Resell.tsx`

**Step 1: Create page stubs**

`src/pages/Discover.tsx`:
```typescript
export default function Discover() {
  return <div className="p-4"><h1 className="text-2xl font-bold">Discover Events</h1></div>
}
```
Repeat for Watchlist, Schedule, MyTickets, Resell with their titles.

**Step 2: Create Layout with bottom nav (mobile-first)**

`src/components/Layout.tsx`:
```typescript
import { NavLink } from 'react-router-dom'
import { Search, Star, Calendar, Ticket, DollarSign } from 'lucide-react'

const tabs = [
  { to: '/', icon: Search, label: 'Discover' },
  { to: '/watchlist', icon: Star, label: 'Watchlist' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/resell', icon: DollarSign, label: 'Resell' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600">🎟 TicketTracker</h1>
      </header>
      <main className="flex-1 pb-20 overflow-auto">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`
          }>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

**Step 3: Wire up App.tsx**

`src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Discover from './pages/Discover'
import Watchlist from './pages/Watchlist'
import Schedule from './pages/Schedule'
import MyTickets from './pages/MyTickets'
import Resell from './pages/Resell'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/resell" element={<Resell />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
```

**Step 4: Run dev server and verify navigation works**
```bash
npm run dev
```
Open http://localhost:5173 — click each tab, verify pages render.

**Step 5: Commit**
```bash
git add -A
git commit -m "feat: app shell with 5-tab mobile navigation"
```

---

## Phase 2: Discover Screen

### Task 4: Ticketmaster + SeatGeek API integration

**Files:**
- Create: `src/lib/ticketmaster.ts`
- Create: `src/lib/seatgeek.ts`
- Create: `src/types/event.ts`

**Step 1: Define shared Event type**

`src/types/event.ts`:
```typescript
export interface TicketEvent {
  id: string
  name: string
  type: 'concert' | 'sports' | 'other'
  venue: string
  city: string
  date: string           // ISO date of the event
  onSaleDate: string | null   // ISO date when tickets go on sale
  preSaleDate: string | null
  imageUrl: string
  minPrice: number | null
  maxPrice: number | null
  url: string
  platform: 'ticketmaster' | 'seatgeek'
  genre: string
  presaleCodes: string[]
}
```

**Step 2: Ticketmaster API client**

`src/lib/ticketmaster.ts`:
```typescript
import axios from 'axios'
import type { TicketEvent } from '@/types/event'

const TM_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY
const BASE = 'https://app.ticketmaster.com/discovery/v2'

export async function searchEvents(query: string, city = ''): Promise<TicketEvent[]> {
  const { data } = await axios.get(`${BASE}/events.json`, {
    params: {
      apikey: TM_KEY,
      keyword: query,
      city,
      size: 20,
      sort: 'date,asc',
      classificationName: 'music,sports',
    }
  })

  const events = data._embedded?.events || []
  return events.map((e: any): TicketEvent => ({
    id: `tm-${e.id}`,
    name: e.name,
    type: e.classifications?.[0]?.segment?.name === 'Sports' ? 'sports' : 'concert',
    venue: e._embedded?.venues?.[0]?.name || '',
    city: e._embedded?.venues?.[0]?.city?.name || '',
    date: e.dates?.start?.dateTime || e.dates?.start?.localDate,
    onSaleDate: e.sales?.public?.startDateTime || null,
    preSaleDate: e.sales?.presales?.[0]?.startDateTime || null,
    imageUrl: e.images?.[0]?.url || '',
    minPrice: e.priceRanges?.[0]?.min || null,
    maxPrice: e.priceRanges?.[0]?.max || null,
    url: e.url,
    platform: 'ticketmaster',
    genre: e.classifications?.[0]?.genre?.name || '',
    presaleCodes: [],
  }))
}

export async function getUpcomingEvents(city = 'Toronto'): Promise<TicketEvent[]> {
  return searchEvents('', city)
}
```

**Step 3: SeatGeek API client**

`src/lib/seatgeek.ts`:
```typescript
import axios from 'axios'
import type { TicketEvent } from '@/types/event'

const SG_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID
const BASE = 'https://api.seatgeek.com/2'

export async function searchSeatGeek(query: string, city = ''): Promise<TicketEvent[]> {
  const { data } = await axios.get(`${BASE}/events`, {
    params: {
      client_id: SG_ID,
      q: query,
      'venue.city': city,
      per_page: 20,
      sort: 'datetime_local.asc',
    }
  })

  return data.events.map((e: any): TicketEvent => ({
    id: `sg-${e.id}`,
    name: e.title,
    type: e.type === 'sports' ? 'sports' : 'concert',
    venue: e.venue?.name || '',
    city: e.venue?.city || '',
    date: e.datetime_local,
    onSaleDate: null,
    preSaleDate: null,
    imageUrl: e.performers?.[0]?.image || '',
    minPrice: e.stats?.lowest_price || null,
    maxPrice: e.stats?.highest_price || null,
    url: e.url,
    platform: 'seatgeek',
    genre: e.performers?.[0]?.genres?.[0]?.name || '',
    presaleCodes: [],
  }))
}
```

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: Ticketmaster and SeatGeek API clients"
```

---

### Task 5: Discover page UI

**Files:**
- Modify: `src/pages/Discover.tsx`
- Create: `src/components/EventCard.tsx`

**Step 1: EventCard component**

`src/components/EventCard.tsx`:
```typescript
import { Calendar, MapPin, DollarSign, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { TicketEvent } from '@/types/event'

interface Props {
  event: TicketEvent
  onTrack: (event: TicketEvent) => void
}

export default function EventCard({ event, onTrack }: Props) {
  const eventDate = event.date ? format(parseISO(event.date), 'MMM d, yyyy') : 'TBD'
  const onSale = event.onSaleDate ? format(parseISO(event.onSaleDate), 'MMM d, yyyy h:mm a') : 'On Sale Now'

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex gap-3">
      {event.imageUrl && (
        <img src={event.imageUrl} alt={event.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin size={12} /> {event.venue}, {event.city}
        </p>
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <Calendar size={12} /> {eventDate}
        </p>
        <p className="text-sm text-blue-600 flex items-center gap-1">
          <Clock size={12} /> On Sale: {onSale}
        </p>
        {event.minPrice && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <DollarSign size={12} /> From ${event.minPrice}
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onTrack(event)}
            className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700"
          >
            + Track This
          </button>
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full hover:bg-gray-200"
          >
            View Tickets
          </a>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Discover page with search + filter**

`src/pages/Discover.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { searchEvents } from '@/lib/ticketmaster'
import { searchSeatGeek } from '@/lib/seatgeek'
import EventCard from '@/components/EventCard'
import type { TicketEvent } from '@/types/event'
import { addToSchedule } from '@/lib/schedule'

export default function Discover() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('Toronto')
  const [filter, setFilter] = useState<'all' | 'concert' | 'sports'>('all')
  const [events, setEvents] = useState<TicketEvent[]>([])
  const [loading, setLoading] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const [tm, sg] = await Promise.all([
        searchEvents(query, city),
        searchSeatGeek(query, city),
      ])
      const all = [...tm, ...sg].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      setEvents(all)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [])

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

  const handleTrack = async (event: TicketEvent) => {
    await addToSchedule(event)
    alert(`"${event.name}" added to your schedule!`)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search artist, team, or event..."
          className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={search} className="bg-blue-600 text-white p-2 rounded-xl">
          <Search size={20} />
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="City"
          className="border rounded-xl px-3 py-1 text-sm w-32 focus:outline-none"
        />
        <div className="flex gap-1">
          {(['all', 'concert', 'sports'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="text-center text-gray-500 py-8">Searching...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(event => (
            <EventCard key={event.id} event={event} onTrack={handleTrack} />
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No events found.</p>}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: Discover page with search, filter, and event cards"
```

---

## Phase 3: Watchlist

### Task 6: Watchlist page

**Files:**
- Create: `src/lib/watchlist.ts`
- Modify: `src/pages/Watchlist.tsx`

**Step 1: Watchlist Firestore helpers**

`src/lib/watchlist.ts`:
```typescript
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface WatchlistItem {
  id?: string
  name: string
  type: 'artist' | 'team'
  createdAt?: any
}

export function subscribeWatchlist(callback: (items: WatchlistItem[]) => void) {
  return onSnapshot(collection(db, 'watchlist'), snapshot => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WatchlistItem)))
  })
}

export async function addToWatchlist(item: Omit<WatchlistItem, 'id'>) {
  await addDoc(collection(db, 'watchlist'), { ...item, createdAt: serverTimestamp() })
}

export async function removeFromWatchlist(id: string) {
  await deleteDoc(doc(db, 'watchlist', id))
}
```

**Step 2: Watchlist page UI**

`src/pages/Watchlist.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Star, Trash2, Plus, Music, Users } from 'lucide-react'
import { subscribeWatchlist, addToWatchlist, removeFromWatchlist, WatchlistItem } from '@/lib/watchlist'

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'artist' | 'team'>('artist')

  useEffect(() => subscribeWatchlist(setItems), [])

  const add = async () => {
    if (!name.trim()) return
    await addToWatchlist({ name: name.trim(), type })
    setName('')
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-500">Add artists or teams — we'll auto-discover new events for them.</p>
      <div className="flex gap-2">
        <select
          value={type}
          onChange={e => setType(e.target.value as 'artist' | 'team')}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option value="artist">Artist</option>
          <option value="team">Team</option>
        </select>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="e.g. Drake, Maple Leafs"
          className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={add} className="bg-blue-600 text-white p-2 rounded-xl">
          <Plus size={20} />
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.type === 'artist' ? <Music size={16} className="text-blue-500" /> : <Users size={16} className="text-green-500" />}
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-gray-400">{item.type}</span>
            </div>
            <button onClick={() => removeFromWatchlist(item.id!)} className="text-red-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">No watchlist items yet.</p>}
      </div>
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: Watchlist page with Firebase CRUD"
```

---

## Phase 4: Schedule + Notifications

### Task 7: Schedule Firestore helpers

**Files:**
- Create: `src/lib/schedule.ts`

`src/lib/schedule.ts`:
```typescript
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { TicketEvent } from '@/types/event'

export interface ScheduledEvent {
  id?: string
  event: TicketEvent
  notifications: {
    announced: boolean
    oneWeek: boolean
    twentyFourHour: boolean
    onSale: boolean
  }
  createdAt?: any
}

export function subscribeSchedule(callback: (items: ScheduledEvent[]) => void) {
  return onSnapshot(collection(db, 'schedule'), snapshot => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduledEvent)))
  })
}

export async function addToSchedule(event: TicketEvent) {
  await addDoc(collection(db, 'schedule'), {
    event,
    notifications: { announced: true, oneWeek: false, twentyFourHour: false, onSale: false },
    createdAt: serverTimestamp(),
  })
}

export async function removeFromSchedule(id: string) {
  await deleteDoc(doc(db, 'schedule', id))
}
```

### Task 8: My Schedule page UI

**Files:**
- Modify: `src/pages/Schedule.tsx`

`src/pages/Schedule.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Calendar, Bell, Trash2, CheckCircle, Circle } from 'lucide-react'
import { subscribeSchedule, removeFromSchedule, ScheduledEvent } from '@/lib/schedule'
import { format, parseISO } from 'date-fns'

function NotificationBadge({ sent, label }: { sent: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {sent ? <CheckCircle size={10} /> : <Circle size={10} />} {label}
    </span>
  )
}

export default function Schedule() {
  const [items, setItems] = useState<ScheduledEvent[]>([])

  useEffect(() => subscribeSchedule(setItems), [])

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-500">Events you're tracking. You'll be emailed at each stage.</p>
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-900">{item.event.name}</h3>
            <button onClick={() => removeFromSchedule(item.id!)} className="text-red-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-500">{item.event.venue}, {item.event.city}</p>
          {item.event.date && (
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Calendar size={12} /> {format(parseISO(item.event.date), 'MMM d, yyyy')}
            </p>
          )}
          {item.event.onSaleDate && (
            <p className="text-sm text-blue-600">On Sale: {format(parseISO(item.event.onSaleDate), 'MMM d, yyyy h:mm a')}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            <NotificationBadge sent={item.notifications.announced} label="Announced" />
            <NotificationBadge sent={item.notifications.oneWeek} label="1 Week" />
            <NotificationBadge sent={item.notifications.twentyFourHour} label="24 Hours" />
            <NotificationBadge sent={item.notifications.onSale} label="On Sale" />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-center text-gray-400 py-8">No events scheduled. Go to Discover to track events.</p>}
    </div>
  )
}
```

**Commit:**
```bash
git add -A
git commit -m "feat: My Schedule page with notification status badges"
```

---

## Phase 5: Cloud Functions (Background Jobs)

### Task 9: Firebase Cloud Functions setup

**Files:**
- Modify: `functions/src/index.ts`

**Step 1: Install function dependencies**
```bash
cd functions
npm install resend axios node-html-parser
npm install -D @types/node
```

**Step 2: Watchlist auto-discovery function (runs every 5 min)**

`functions/src/index.ts`:
```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import axios from 'axios'
import { Resend } from 'resend'

admin.initializeApp()
const db = admin.firestore()
const resend = new Resend(process.env.RESEND_API_KEY)
const TM_KEY = process.env.TICKETMASTER_API_KEY
const ALERT_EMAIL = process.env.ALERT_EMAIL

// --- Watchlist Auto-Discovery (every 5 minutes) ---
export const checkWatchlist = onSchedule('every 5 minutes', async () => {
  const watchlistSnap = await db.collection('watchlist').get()
  const watchlist = watchlistSnap.docs.map(d => d.data())

  for (const item of watchlist) {
    const { data } = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
      params: { apikey: TM_KEY, keyword: item.name, size: 5, sort: 'date,asc' }
    })

    const events = data._embedded?.events || []
    for (const e of events) {
      const eventId = `tm-${e.id}`
      const existing = await db.collection('events').doc(eventId).get()
      if (!existing.exists) {
        await db.collection('events').doc(eventId).set({
          id: eventId, name: e.name,
          date: e.dates?.start?.dateTime || e.dates?.start?.localDate,
          onSaleDate: e.sales?.public?.startDateTime || null,
          venue: e._embedded?.venues?.[0]?.name || '',
          city: e._embedded?.venues?.[0]?.city?.name || '',
          url: e.url, platform: 'ticketmaster',
          imageUrl: e.images?.[0]?.url || '',
          watchlistMatch: item.name,
          discoveredAt: admin.firestore.FieldValue.serverTimestamp(),
        })

        // Send announcement email
        await resend.emails.send({
          from: 'TicketTracker <alerts@yourdomain.com>',
          to: ALERT_EMAIL!,
          subject: `🎟 NEW EVENT: ${e.name}`,
          html: `<h2>${e.name} just announced!</h2>
            <p>Venue: ${e._embedded?.venues?.[0]?.name}, ${e._embedded?.venues?.[0]?.city?.name}</p>
            <p>On Sale: ${e.sales?.public?.startDateTime || 'TBD'}</p>
            <a href="${e.url}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">View Tickets →</a>`,
        })
      }
    }
  }
})

// --- Notification Threshold Checker (every hour) ---
export const checkNotificationThresholds = onSchedule('every 60 minutes', async () => {
  const scheduleSnap = await db.collection('schedule').get()
  const now = new Date()

  for (const doc of scheduleSnap.docs) {
    const item = doc.data()
    const onSaleDate = item.event?.onSaleDate ? new Date(item.event.onSaleDate) : null
    if (!onSaleDate) continue

    const hoursUntilSale = (onSaleDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // 1 week = 168 hours
    if (hoursUntilSale <= 168 && hoursUntilSale > 160 && !item.notifications?.oneWeek) {
      await sendNotificationEmail(item, '1 Week Until On Sale', '1 week')
      await doc.ref.update({ 'notifications.oneWeek': true })
    }

    // 24 hours
    if (hoursUntilSale <= 24 && hoursUntilSale > 20 && !item.notifications?.twentyFourHour) {
      await sendNotificationEmail(item, '24 Hours Until On Sale', '24 hours')
      await doc.ref.update({ 'notifications.twentyFourHour': true })
    }

    // On sale now
    if (hoursUntilSale <= 0 && !item.notifications?.onSale) {
      await sendOnSaleEmail(item)
      await doc.ref.update({ 'notifications.onSale': true })
    }
  }
})

async function sendNotificationEmail(item: any, subject: string, timeframe: string) {
  await resend.emails.send({
    from: 'TicketTracker <alerts@yourdomain.com>',
    to: ALERT_EMAIL!,
    subject: `⏰ ${subject}: ${item.event.name}`,
    html: `<h2>${item.event.name}</h2>
      <p>Tickets go on sale in <strong>${timeframe}</strong>!</p>
      <p>On Sale: ${item.event.onSaleDate}</p>
      <a href="${item.event.url}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Buy Tickets →</a>`,
  })
}

async function sendOnSaleEmail(item: any) {
  await resend.emails.send({
    from: 'TicketTracker <alerts@yourdomain.com>',
    to: ALERT_EMAIL!,
    subject: `🚨 ON SALE NOW: ${item.event.name}`,
    html: `<h2>🎟 Tickets are ON SALE NOW!</h2>
      <h3>${item.event.name}</h3>
      <p>${item.event.venue}, ${item.event.city}</p>
      <a href="${item.event.url}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:18px;">BUY TICKETS NOW →</a>`,
  })
}

// --- Inbound Email Webhook (parses ticket confirmation emails) ---
export const inboundEmail = onRequest({ invoker: 'public' }, async (req, res) => {
  const { from, subject, text, html } = req.body

  // Extract ticket info from common confirmation email patterns
  const ticket = parseTicketEmail({ from, subject, text: text || html })
  if (ticket) {
    await db.collection('my_tickets').add({
      ...ticket,
      source: 'email',
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    res.json({ success: true, ticket })
  } else {
    res.json({ success: false, message: 'Could not parse ticket info' })
  }
})

function parseTicketEmail(email: { from: string; subject: string; text: string }) {
  const text = email.text || ''
  // Ticketmaster confirmation pattern
  if (email.from.includes('ticketmaster')) {
    return {
      platform: 'ticketmaster',
      eventName: text.match(/Order Confirmation[:\s]+(.+)/i)?.[1]?.trim() || email.subject,
      orderNumber: text.match(/Order #?(\w+)/i)?.[1] || '',
      rawEmail: text.substring(0, 500),
    }
  }
  // Generic fallback
  return {
    platform: 'unknown',
    eventName: email.subject,
    rawEmail: text.substring(0, 500),
  }
}
```

**Step 3: Deploy functions to Firebase**
```bash
cd functions
npx firebase use tickettracker-app
npx firebase deploy --only functions
```

**Step 4: Commit**
```bash
git add -A
git commit -m "feat: Cloud Functions for watchlist discovery and notification thresholds"
```

---

## Phase 6: My Tickets

### Task 10: My Tickets page with manual + email-parsed entries

**Files:**
- Create: `src/lib/tickets.ts`
- Modify: `src/pages/MyTickets.tsx`

**Step 1: Ticket Firestore helpers**

`src/lib/tickets.ts`:
```typescript
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export interface MyTicket {
  id?: string
  eventName: string
  venue: string
  date: string
  section: string
  row: string
  seat: string
  pricePaid: number
  platform: string
  orderNumber: string
  source: 'manual' | 'email'
  addedAt?: any
}

export function subscribeTickets(callback: (tickets: MyTicket[]) => void) {
  return onSnapshot(collection(db, 'my_tickets'), snapshot => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MyTicket)))
  })
}

export async function addTicket(ticket: Omit<MyTicket, 'id'>) {
  await addDoc(collection(db, 'my_tickets'), { ...ticket, addedAt: serverTimestamp() })
}

export async function deleteTicket(id: string) {
  await deleteDoc(doc(db, 'my_tickets', id))
}
```

**Step 2: My Tickets page**

`src/pages/MyTickets.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Plus, Trash2, Mail, Ticket } from 'lucide-react'
import { subscribeTickets, addTicket, deleteTicket, MyTicket } from '@/lib/tickets'
import { format, parseISO } from 'date-fns'

const INBOUND_EMAIL = 'tickets@yourdomain.com' // Update with your Resend inbound address

export default function MyTickets() {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ eventName: '', venue: '', date: '', section: '', row: '', seat: '', pricePaid: '', platform: 'Ticketmaster', orderNumber: '' })

  useEffect(() => subscribeTickets(setTickets), [])

  const save = async () => {
    await addTicket({ ...form, pricePaid: parseFloat(form.pricePaid) || 0, source: 'manual' })
    setShowForm(false)
    setForm({ eventName: '', venue: '', date: '', section: '', row: '', seat: '', pricePaid: '', platform: 'Ticketmaster', orderNumber: '' })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
        <Mail size={14} className="inline mr-1" />
        Forward confirmation emails to <strong>{INBOUND_EMAIL}</strong> to auto-add tickets.
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full bg-blue-600 text-white py-2 rounded-xl flex items-center justify-center gap-2">
        <Plus size={18} /> Add Ticket Manually
      </button>

      {showForm && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          {[
            ['Event Name', 'eventName'], ['Venue', 'venue'], ['Date', 'date'],
            ['Section', 'section'], ['Row', 'row'], ['Seat', 'seat'],
            ['Price Paid ($)', 'pricePaid'], ['Order #', 'orderNumber'],
          ].map(([label, key]) => (
            <input key={key} placeholder={label} value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          ))}
          <button onClick={save} className="w-full bg-green-600 text-white py-2 rounded-lg">Save Ticket</button>
        </div>
      )}

      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between">
              <h3 className="font-semibold">{t.eventName}</h3>
              <button onClick={() => deleteTicket(t.id!)} className="text-red-400"><Trash2 size={16} /></button>
            </div>
            <p className="text-sm text-gray-500">{t.venue} {t.date && `· ${t.date}`}</p>
            <p className="text-sm">Section {t.section} · Row {t.row} · Seat {t.seat}</p>
            <div className="flex justify-between mt-1">
              <p className="text-sm text-green-600 font-medium">Paid: ${t.pricePaid}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{t.source === 'email' ? '📧 Auto-imported' : '✏️ Manual'}</span>
            </div>
          </div>
        ))}
        {tickets.length === 0 && <p className="text-center text-gray-400 py-8">No tickets yet.</p>}
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add -A
git commit -m "feat: My Tickets page with manual entry and email-import display"
```

---

## Phase 7: Resell + Price Intelligence

### Task 11: Resale price intelligence

**Files:**
- Create: `src/lib/resalePrices.ts`

`src/lib/resalePrices.ts`:
```typescript
import axios from 'axios'

const SG_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID

export interface ResalePrice {
  platform: string
  lowestPrice: number | null
  averagePrice: number | null
  highestPrice: number | null
  suggestedListPrice: number | null
  listingCount: number
}

export async function getResalePrices(eventName: string): Promise<ResalePrice[]> {
  const results: ResalePrice[] = []

  // SeatGeek — has public price stats
  try {
    const { data } = await axios.get('https://api.seatgeek.com/2/events', {
      params: { client_id: SG_ID, q: eventName, per_page: 1 }
    })
    const event = data.events?.[0]
    if (event?.stats) {
      const low = event.stats.lowest_price
      const avg = event.stats.average_price
      const high = event.stats.highest_price
      results.push({
        platform: 'SeatGeek',
        lowestPrice: low,
        averagePrice: avg,
        highestPrice: high,
        // Suggest: 5% below average for fast sale, or 10% above low for max profit
        suggestedListPrice: avg ? Math.round(avg * 0.95) : null,
        listingCount: event.stats.listing_count || 0,
      })
    }
  } catch {}

  return results
}
```

### Task 12: Resell page

**Files:**
- Modify: `src/pages/Resell.tsx`

`src/pages/Resell.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { TrendingUp, ExternalLink, Copy, DollarSign } from 'lucide-react'
import { subscribeTickets, MyTicket } from '@/lib/tickets'
import { getResalePrices, ResalePrice } from '@/lib/resalePrices'

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

function generateListingTemplate(ticket: MyTicket, suggestedPrice: number | null) {
  return `🎟 ${ticket.eventName}
📍 ${ticket.venue}
💺 Section ${ticket.section}, Row ${ticket.row}, Seat ${ticket.seat}
💰 Asking: $${suggestedPrice || ticket.pricePaid}
📋 Order #: ${ticket.orderNumber}
✅ Legit tickets — purchased from ${ticket.platform}`
}

export default function Resell() {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [prices, setPrices] = useState<Record<string, ResalePrice[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => subscribeTickets(setTickets), [])

  const loadPrices = async (ticket: MyTicket) => {
    if (prices[ticket.id!]) return
    setLoading(l => ({ ...l, [ticket.id!]: true }))
    const p = await getResalePrices(ticket.eventName)
    setPrices(prev => ({ ...prev, [ticket.id!]: p }))
    setLoading(l => ({ ...l, [ticket.id!]: false }))
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-500">Select a ticket to see resale prices and listing options.</p>
      {tickets.map(ticket => {
        const ticketPrices = prices[ticket.id!] || []
        const suggested = ticketPrices[0]?.suggestedListPrice

        return (
          <div key={ticket.id} className="bg-white border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{ticket.eventName}</h3>
            <p className="text-sm text-gray-500">Sec {ticket.section} · Row {ticket.row} · Seat {ticket.seat} · Paid ${ticket.pricePaid}</p>

            <button
              onClick={() => loadPrices(ticket)}
              className="w-full bg-purple-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <TrendingUp size={16} />
              {loading[ticket.id!] ? 'Checking prices...' : 'Check Resale Prices'}
            </button>

            {ticketPrices.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-3 space-y-1">
                {ticketPrices.map(p => (
                  <div key={p.platform}>
                    <p className="font-medium text-sm">{p.platform} ({p.listingCount} listings)</p>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                      <span>Low: ${p.lowestPrice}</span>
                      <span>Avg: ${p.averagePrice}</span>
                      <span>High: ${p.highestPrice}</span>
                    </div>
                    {p.suggestedListPrice && (
                      <p className="text-green-700 font-semibold text-sm mt-1 flex items-center gap-1">
                        <DollarSign size={12} /> Suggested list price: ${p.suggestedListPrice}
                        <span className="text-xs text-gray-500">(5% below market avg)</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">List On:</p>
              <a
                href={`https://www.stubhub.com/sell`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                StubHub <ExternalLink size={14} />
              </a>
              <a
                href={`https://www.seatgeek.com/sell`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between bg-green-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                SeatGeek <ExternalLink size={14} />
              </a>
              <button
                onClick={() => copyToClipboard(generateListingTemplate(ticket, suggested))}
                className="w-full flex items-center justify-between bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm"
              >
                Copy Facebook Marketplace Listing <Copy size={14} />
              </button>
              <button
                onClick={() => copyToClipboard(generateListingTemplate(ticket, suggested))}
                className="w-full flex items-center justify-between bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm"
              >
                Copy Ticketmaster Resale Listing <Copy size={14} />
              </button>
            </div>
          </div>
        )
      })}
      {tickets.length === 0 && <p className="text-center text-gray-400 py-8">Add tickets in "My Tickets" first.</p>}
    </div>
  )
}
```

**Commit:**
```bash
git add -A
git commit -m "feat: Resell page with price intelligence and listing templates"
```

---

## Phase 8: Presale Code Tracker + Demand Signals

### Task 13: Presale code display on event cards

**Files:**
- Modify: `src/components/EventCard.tsx`

Add presale code section to EventCard when `event.presaleCodes.length > 0`:
```typescript
{event.preSaleDate && (
  <p className="text-sm text-orange-600 flex items-center gap-1">
    🔑 Presale: {format(parseISO(event.preSaleDate), 'MMM d, h:mm a')}
  </p>
)}
{event.presaleCodes.length > 0 && (
  <div className="mt-1">
    {event.presaleCodes.map(code => (
      <span key={code} className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded mr-1">
        Code: {code}
      </span>
    ))}
  </div>
)}
```

### Task 14: Cloud Function for presale code scraping

Add to `functions/src/index.ts`:

```typescript
// Presale code scraper — checks artist fan clubs and credit card presale pages
export const scrapePresaleCodes = onSchedule('every 60 minutes', async () => {
  const scheduleSnap = await db.collection('schedule').get()

  for (const doc of scheduleSnap.docs) {
    const item = doc.data()
    const eventId = item.event?.id
    if (!eventId) continue

    // Check Ticketmaster presales for this event
    const tmId = eventId.replace('tm-', '')
    try {
      const { data } = await axios.get(`https://app.ticketmaster.com/discovery/v2/events/${tmId}.json`, {
        params: { apikey: TM_KEY }
      })
      const presales = data.sales?.presales || []
      const codes: string[] = []

      for (const p of presales) {
        // Some presales include code hints in the name
        if (p.name && p.url) {
          // Log presale info — codes often require fan club membership
          codes.push(`${p.name}: ${p.url}`)
        }
      }

      if (codes.length > 0) {
        await doc.ref.update({ 'event.presaleCodes': codes })
      }
    } catch {}
  }
})
```

**Commit:**
```bash
git add -A
git commit -m "feat: presale code tracking in Cloud Functions and EventCard display"
```

---

## Phase 9: Deploy to Vercel

### Task 15: Deploy frontend to Vercel

**Step 1: Create Vercel project**
```bash
cd /c/Users/shane/Downloads/tickets
npx vercel login
npx vercel --yes
```

**Step 2: Add environment variables in Vercel dashboard**
Go to Vercel Project Settings > Environment Variables and add all `VITE_*` variables from `.env.local`.

**Step 3: Deploy to production**
```bash
npx vercel --prod --yes
```

**Step 4: Configure Resend inbound email**
- Go to Resend dashboard > Inbound
- Add domain and set webhook URL to your Firebase inbound function URL
- Set forwarding address to `tickets@yourdomain.com`

**Step 5: Final commit**
```bash
git add -A
git commit -m "feat: TicketTracker v1.0 - full app with discovery, watchlist, schedule, tickets, resell"
```

---

## Summary of Features Built

| Feature | Status |
|---------|--------|
| Event discovery (Ticketmaster + SeatGeek) | ✅ |
| Search + filter by city / type | ✅ |
| Watchlist (artists + teams) | ✅ |
| Auto-discovery via Cloud Functions (every 5 min) | ✅ |
| My Schedule with notification status | ✅ |
| 4-stage email notifications (Resend) | ✅ |
| My Tickets (manual + email import) | ✅ |
| Resell listings (StubHub, SeatGeek, copy/paste) | ✅ |
| Resale price intelligence + suggested price | ✅ |
| Presale code tracking | ✅ |
| On-sale deep links in notification emails | ✅ |
| Mobile-first responsive UI | ✅ |
| Vercel deployment | ✅ |
