import {
  collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
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
