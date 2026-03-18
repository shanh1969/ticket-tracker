import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'

export interface TicketBuy {
  id?: string
  eventName: string
  eventDate: string
  venue: string
  buyDate: string
  quantity: number
  faceValueEach: number
  feesTotal: number
  totalCost: number          // faceValueEach * quantity + feesTotal
  buyerName: string          // 'Me' or name of person who bought
  notes: string
  status: 'holding' | 'partial' | 'sold' | 'loss'
}

export interface TicketSell {
  id?: string
  buyId: string
  eventName: string
  sellDate: string
  quantitySold: number
  salePriceEach: number
  platform: string           // StubHub, SeatGeek, Facebook, etc.
  platformFeePercent: number
  platformFeeAmount: number
  netReceived: number        // salePriceEach * qty - platformFeeAmount
  notes: string
}

const BUYS_COL = 'tt_buys'
const SELLS_COL = 'tt_sells'

export async function addBuy(buy: Omit<TicketBuy, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, BUYS_COL), buy)
  return ref.id
}

export async function getBuys(): Promise<TicketBuy[]> {
  const q = query(collection(db, BUYS_COL), orderBy('buyDate', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketBuy))
}

export async function updateBuyStatus(id: string, status: TicketBuy['status']) {
  await updateDoc(doc(db, BUYS_COL, id), { status })
}

export async function deleteBuy(id: string) {
  await deleteDoc(doc(db, BUYS_COL, id))
}

export async function addSell(sell: Omit<TicketSell, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, SELLS_COL), sell)
  return ref.id
}

export async function getSells(): Promise<TicketSell[]> {
  const q = query(collection(db, SELLS_COL), orderBy('sellDate', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TicketSell))
}

export async function deleteSell(id: string) {
  await deleteDoc(doc(db, SELLS_COL, id))
}

// Compute profit for a buy given all its sells
export function calcProfit(buy: TicketBuy, sells: TicketSell[]) {
  const buySells = sells.filter(s => s.buyId === buy.id)
  const totalRevenue = buySells.reduce((sum, s) => sum + s.netReceived, 0)
  const costPerTicket = buy.totalCost / buy.quantity
  const qtySold = buySells.reduce((sum, s) => sum + s.quantitySold, 0)
  const allocatedCost = costPerTicket * qtySold
  const profit = totalRevenue - allocatedCost
  return { totalRevenue, allocatedCost, profit, qtySold }
}
