import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
import type { ScheduledEvent } from './schedule'

const EMAIL_KEY = 'tt_notif_email'

export function getNotifEmail(): string {
  return localStorage.getItem(EMAIL_KEY) || ''
}

export function saveNotifEmail(email: string) {
  localStorage.setItem(EMAIL_KEY, email)
}

export async function requestBrowserPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getBrowserPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function showBrowserNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.ico' })
}

async function sendEmail(subject: string, html: string) {
  const email = getNotifEmail()
  if (!email) return
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, html }),
    })
  } catch {
    // silent fail — notifications are best-effort
  }
}

export async function checkAndSendNotifications() {
  const now = new Date()
  let snapshot
  try {
    snapshot = await getDocs(collection(db, 'schedule'))
  } catch {
    return
  }

  for (const docSnap of snapshot.docs) {
    const item = { id: docSnap.id, ...docSnap.data() } as ScheduledEvent
    const { event, notifications: notifs } = item
    const firestoreUpdates: Record<string, boolean> = {}

    const eventDate = event.date ? new Date(event.date) : null
    const onSaleDate = event.onSaleDate ? new Date(event.onSaleDate) : null

    // On-sale alert
    if (!notifs.onSale && onSaleDate && onSaleDate <= now) {
      firestoreUpdates['notifications.onSale'] = true
      showBrowserNotification('🎫 Tickets On Sale!', `${event.name} tickets are on sale now!`)
      await sendEmail(
        `🎫 On Sale Now: ${event.name}`,
        `<h2 style="color:#4f46e5">🎫 Tickets are on sale!</h2>
         <p><strong>${event.name}</strong></p>
         <p>${event.venue}${event.city ? `, ${event.city}` : ''}</p>
         ${event.url ? `<p><a href="${event.url}" style="color:#4f46e5">Buy tickets now →</a></p>` : ''}`
      )
    }

    // 1-week alert
    if (!notifs.oneWeek && eventDate) {
      const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      if (daysUntil > 0 && daysUntil <= 7) {
        firestoreUpdates['notifications.oneWeek'] = true
        const days = Math.ceil(daysUntil)
        showBrowserNotification('📅 Event This Week!', `${event.name} is in ${days} day${days !== 1 ? 's' : ''}!`)
        await sendEmail(
          `📅 ${days} day${days !== 1 ? 's' : ''} until ${event.name}!`,
          `<h2 style="color:#4f46e5">Your event is coming up!</h2>
           <p><strong>${event.name}</strong></p>
           <p>${event.venue}${event.city ? `, ${event.city}` : ''}</p>
           <p>In <strong>${days} day${days !== 1 ? 's' : ''}</strong></p>
           ${event.url ? `<p><a href="${event.url}" style="color:#4f46e5">View event →</a></p>` : ''}`
        )
      }
    }

    // 24-hour alert
    if (!notifs.twentyFourHour && eventDate) {
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (hoursUntil > 0 && hoursUntil <= 24) {
        firestoreUpdates['notifications.twentyFourHour'] = true
        showBrowserNotification('⏰ Event Tomorrow!', `${event.name} is tomorrow — don't forget!`)
        await sendEmail(
          `⏰ Tomorrow: ${event.name}!`,
          `<h2 style="color:#4f46e5">Your event is TOMORROW!</h2>
           <p><strong>${event.name}</strong></p>
           <p>${event.venue}${event.city ? `, ${event.city}` : ''}</p>
           ${event.url ? `<p><a href="${event.url}" style="color:#4f46e5">View event →</a></p>` : ''}`
        )
      }
    }

    if (Object.keys(firestoreUpdates).length > 0) {
      await updateDoc(doc(db, 'schedule', item.id!), firestoreUpdates)
    }
  }
}
