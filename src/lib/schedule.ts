import {
  collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
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
    notifications: {
      announced: true,
      oneWeek: false,
      twentyFourHour: false,
      onSale: false,
    },
    createdAt: serverTimestamp(),
  })
}

export async function removeFromSchedule(id: string) {
  await deleteDoc(doc(db, 'schedule', id))
}
