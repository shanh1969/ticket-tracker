import {
  collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
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
