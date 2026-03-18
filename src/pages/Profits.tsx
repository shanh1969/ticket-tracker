import { useState, useEffect } from 'react'
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Download, ChevronDown, ChevronUp, Mail, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { addBuy, getBuys, addSell, getSells, deleteBuy, deleteSell, calcProfit, updateBuyStatus } from '@/lib/profits'
import type { TicketBuy, TicketSell } from '@/lib/profits'
import { parseEmail } from '@/lib/emailParser'
import type { ParsedBuyEmail, ParsedSellEmail } from '@/lib/emailParser'
import { initGmail, requestGmailAccess, scanTicketEmails, isGmailConfigured } from '@/lib/gmail'

// Ontario 2024 combined federal + provincial income tax estimate
// Uses simplified bracket for business income on top of assumed $60k other income
const TAX_RATE = 0.3143   // ~31.43% combined marginal (federal 20.5% + ON 9.15% + 1.78% surtax) - common for $60-100k range
const HST_THRESHOLD = 30000  // Must register for HST above this

const PLATFORMS = ['StubHub', 'SeatGeek', 'Ticketmaster Fan-to-Fan', 'Vivid Seats', 'Facebook Marketplace', 'Kijiji', 'Other']
const STATUS_COLORS: Record<TicketBuy['status'], string> = {
  holding: '#4f46e5', partial: '#d97706', sold: '#059669', loss: '#dc2626',
}

export default function Profits() {
  const [buys, setBuys] = useState<TicketBuy[]>([])
  const [sells, setSells] = useState<TicketSell[]>([])
  const [showBuyForm, setShowBuyForm] = useState(false)
  const [showSellForm, setShowSellForm] = useState(false)
  const [sellBuyId, setSellBuyId] = useState('')
  const [expandedBuy, setExpandedBuy] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'buys' | 'sells' | 'import'>('dashboard')

  // Email import state
  const [emailText, setEmailText] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseEmail>>(null)
  const [importMsg, setImportMsg] = useState('')
  const [gmailStatus, setGmailStatus] = useState<'idle' | 'loading' | 'scanning' | 'done' | 'error'>('idle')
  const [gmailResults, setGmailResults] = useState<{ parsed: ReturnType<typeof parseEmail>, raw: string }[]>([])

  // Buy form
  const [buyForm, setBuyForm] = useState({
    eventName: '', eventDate: '', venue: '', buyDate: new Date().toISOString().split('T')[0],
    quantity: '2', faceValueEach: '', feesTotal: '', buyerName: 'Me', notes: ''
  })

  // Sell form
  const [sellForm, setSellForm] = useState({
    sellDate: new Date().toISOString().split('T')[0],
    quantitySold: '2', salePriceEach: '', platform: 'StubHub',
    platformFeePercent: '15', notes: ''
  })

  useEffect(() => { load() }, [])

  async function load() {
    const [b, s] = await Promise.all([getBuys(), getSells()])
    setBuys(b)
    setSells(s)
  }

  // ── Email paste parse ──────────────────────────────────────────────────────
  function handleParseEmail() {
    const result = parseEmail(emailText)
    setParsed(result)
    if (!result) setImportMsg('Could not detect a ticket confirmation in this email. Try copying more of the email body.')
    else setImportMsg('')
  }

  async function handleImportParsed(p: ReturnType<typeof parseEmail>) {
    if (!p) return
    if (p.type === 'buy') {
      const b = p as ParsedBuyEmail
      await addBuy({
        eventName: b.eventName, eventDate: b.eventDate, venue: b.venue,
        buyDate: new Date().toISOString().split('T')[0], quantity: b.quantity,
        faceValueEach: b.faceValueEach, feesTotal: b.feesTotal, totalCost: b.totalCost,
        buyerName: 'Me', notes: `Auto-imported from ${b.platform} email. Order: ${b.orderNumber}`,
        status: 'holding',
      })
      setImportMsg(`✓ Buy logged — ${b.eventName}`)
    } else {
      const s = p as ParsedSellEmail
      const matchingBuy = buys.find(b => b.eventName.toLowerCase().includes(s.eventName.toLowerCase().slice(0, 10)))
      await addSell({
        buyId: matchingBuy?.id || '',
        eventName: s.eventName, sellDate: s.sellDate, quantitySold: s.quantitySold,
        salePriceEach: s.salePriceEach, platform: s.platform,
        platformFeePercent: 15,
        platformFeeAmount: s.platformFeeAmount, netReceived: s.netReceived,
        notes: `Auto-imported. Order: ${s.orderNumber}`,
      })
      if (matchingBuy) {
        const allSells = [...sells, { buyId: matchingBuy.id, quantitySold: s.quantitySold } as TicketSell]
        const totalSold = allSells.filter(x => x.buyId === matchingBuy.id).reduce((sum, x) => sum + x.quantitySold, 0)
        await updateBuyStatus(matchingBuy.id!, totalSold >= matchingBuy.quantity ? 'sold' : 'partial')
      }
      setImportMsg(`✓ Sale logged — ${s.eventName}`)
    }
    setParsed(null)
    setEmailText('')
    load()
  }

  // ── Gmail scan ─────────────────────────────────────────────────────────────
  async function handleGmailScan() {
    setGmailStatus('loading')
    setGmailResults([])
    try {
      await initGmail()
      await requestGmailAccess()
      setGmailStatus('scanning')
      const bodies = await scanTicketEmails()
      const results = bodies
        .map(raw => ({ parsed: parseEmail(raw), raw }))
        .filter(r => r.parsed !== null)
      setGmailResults(results)
      setGmailStatus('done')
    } catch (e: any) {
      console.error(e)
      setGmailStatus('error')
    }
  }

  async function handleImportAll() {
    for (const r of gmailResults) {
      if (r.parsed) await handleImportParsed(r.parsed)
    }
    setGmailResults([])
    setGmailStatus('idle')
  }

  // ── Buy form submit ────────────────────────────────────────────────────────
  async function handleAddBuy() {
    const qty = Number(buyForm.quantity)
    const face = Number(buyForm.faceValueEach)
    const fees = Number(buyForm.feesTotal) || 0
    if (!buyForm.eventName || !qty || !face) return
    await addBuy({
      eventName: buyForm.eventName, eventDate: buyForm.eventDate, venue: buyForm.venue,
      buyDate: buyForm.buyDate, quantity: qty, faceValueEach: face, feesTotal: fees,
      totalCost: face * qty + fees, buyerName: buyForm.buyerName || 'Me',
      notes: buyForm.notes, status: 'holding',
    })
    setBuyForm({ eventName: '', eventDate: '', venue: '', buyDate: new Date().toISOString().split('T')[0], quantity: '2', faceValueEach: '', feesTotal: '', buyerName: 'Me', notes: '' })
    setShowBuyForm(false)
    load()
  }

  // ── Sell form submit ───────────────────────────────────────────────────────
  async function handleAddSell() {
    const buy = buys.find(b => b.id === sellBuyId)
    if (!buy || !sellForm.salePriceEach) return
    const qty = Number(sellForm.quantitySold)
    const price = Number(sellForm.salePriceEach)
    const feePercent = Number(sellForm.platformFeePercent)
    const feeAmount = (price * qty) * (feePercent / 100)
    const net = price * qty - feeAmount
    await addSell({
      buyId: sellBuyId, eventName: buy.eventName, sellDate: sellForm.sellDate,
      quantitySold: qty, salePriceEach: price, platform: sellForm.platform,
      platformFeePercent: feePercent, platformFeeAmount: feeAmount, netReceived: net,
      notes: sellForm.notes,
    })
    const allSells = [...sells, { buyId: sellBuyId, quantitySold: qty } as TicketSell]
    const totalSold = allSells.filter(s => s.buyId === sellBuyId).reduce((sum, s) => sum + s.quantitySold, 0)
    const { profit } = calcProfit(buy, allSells as TicketSell[])
    const status = totalSold >= buy.quantity ? (profit < 0 ? 'loss' : 'sold') : 'partial'
    await updateBuyStatus(sellBuyId, status)
    setSellForm({ sellDate: new Date().toISOString().split('T')[0], quantitySold: '2', salePriceEach: '', platform: 'StubHub', platformFeePercent: '15', notes: '' })
    setShowSellForm(false)
    setSellBuyId('')
    load()
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalInvested = buys.reduce((sum, b) => sum + b.totalCost, 0)
  const totalRevenue = sells.reduce((sum, s) => sum + s.netReceived, 0)
  const totalFees = sells.reduce((sum, s) => sum + s.platformFeeAmount, 0)
  const totalProfit = buys.reduce((sum, b) => sum + calcProfit(b, sells).profit, 0)
  const estimatedTax = totalProfit > 0 ? totalProfit * TAX_RATE : 0
  const takeHomePay = totalProfit - estimatedTax
  const holdingValue = buys.filter(b => b.status === 'holding' || b.status === 'partial').reduce((sum, b) => sum + b.totalCost, 0)

  // Monthly
  const monthlyData: Record<string, { revenue: number, cost: number, profit: number }> = {}
  sells.forEach(s => {
    const month = s.sellDate.slice(0, 7)
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, cost: 0, profit: 0 }
    monthlyData[month].revenue += s.netReceived
  })
  buys.forEach(b => {
    const buySells = sells.filter(s => s.buyId === b.id)
    if (!buySells.length) return
    const { allocatedCost, profit } = calcProfit(b, sells)
    const month = buySells.sort((a, z) => a.sellDate.localeCompare(z.sellDate))[0].sellDate.slice(0, 7)
    if (monthlyData[month]) { monthlyData[month].cost += allocatedCost; monthlyData[month].profit += profit }
  })
  const months = Object.keys(monthlyData).sort().reverse()

  function exportCSV() {
    const rows = [['Event','Buy Date','Qty','Face Value Ea','Fees','Total Cost','Sell Date','Qty Sold','Sale Price Ea','Platform','Platform Fee','Net Received','Profit','Tax Estimate']]
    buys.forEach(b => {
      const buySells = sells.filter(s => s.buyId === b.id)
      if (!buySells.length) {
        rows.push([b.eventName,b.buyDate,String(b.quantity),String(b.faceValueEach),String(b.feesTotal),String(b.totalCost),'','','','','','','',''])
      } else {
        buySells.forEach(s => {
          const costPerTicket = b.totalCost / b.quantity
          const profit = s.netReceived - costPerTicket * s.quantitySold
          const tax = profit > 0 ? (profit * TAX_RATE).toFixed(2) : '0.00'
          rows.push([b.eventName,b.buyDate,String(b.quantity),String(b.faceValueEach),String(b.feesTotal),String(b.totalCost),s.sellDate,String(s.quantitySold),String(s.salePriceEach),s.platform,s.platformFeeAmount.toFixed(2),s.netReceived.toFixed(2),profit.toFixed(2),tax])
        })
      }
    })
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ticket-profits-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{color: '#111827'}}>Profit Tracker</h1>
        <button onClick={exportCSV} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{background: 'white', border: '1px solid #d1d5db', color: '#374151'}}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {(['dashboard','buys','sells','import'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="text-xs px-4 py-1.5 rounded-full capitalize transition-colors"
            style={activeTab === t ? {background:'#4f46e5',color:'white'} : {background:'white',color:'#6b7280',border:'1px solid #e5e7eb'}}>
            {t === 'import' ? '📧 Import' : t}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Total Invested</p>
              <p className="text-xl font-bold" style={{color:'#111827'}}>{fmt(totalInvested)}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Total Revenue</p>
              <p className="text-xl font-bold" style={{color:'#059669'}}>{fmt(totalRevenue)}</p>
            </div>
            <div className="rounded-xl p-4" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Platform Fees Paid</p>
              <p className="text-xl font-bold" style={{color:'#dc2626'}}>{fmt(totalFees)}</p>
            </div>
            <div className="rounded-xl p-4" style={{background: totalProfit >= 0 ? '#f0fdf4' : '#fef2f2', border:`1px solid ${totalProfit >= 0 ? '#86efac' : '#fca5a5'}`}}>
              <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Gross Profit</p>
              <div className="flex items-center gap-1">
                {totalProfit >= 0 ? <TrendingUp size={18} color="#059669" /> : <TrendingDown size={18} color="#dc2626" />}
                <p className="text-xl font-bold" style={{color: totalProfit >= 0 ? '#059669' : '#dc2626'}}>
                  {totalProfit < 0 ? '-' : ''}{fmt(totalProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* Tax section */}
          {totalProfit > 0 && (
            <div className="rounded-xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
              <div className="px-4 py-2" style={{background:'#fffbeb',borderBottom:'1px solid #fde68a'}}>
                <p className="text-xs font-semibold" style={{color:'#92400e'}}>Ontario Tax Estimate (Business Income)</p>
              </div>
              <div className="grid grid-cols-3 divide-x" style={{background:'white'}}>
                <div className="px-3 py-3 text-center">
                  <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Gross Profit</p>
                  <p className="font-bold text-sm" style={{color:'#111827'}}>{fmt(totalProfit)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Tax (~{(TAX_RATE*100).toFixed(1)}%)</p>
                  <p className="font-bold text-sm" style={{color:'#dc2626'}}>-{fmt(estimatedTax)}</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-xs mb-1" style={{color:'#9ca3af'}}>Take Home</p>
                  <p className="font-bold text-sm" style={{color:'#059669'}}>{fmt(takeHomePay)}</p>
                </div>
              </div>
              <div className="px-4 py-2 text-xs" style={{background:'#f9fafb',color:'#6b7280'}}>
                Rate shown is combined federal + Ontario marginal rate for income in the $60k–$100k bracket. Consult your accountant for your exact rate. Keep all receipts — fees and buyer payments are deductible.
              </div>
            </div>
          )}

          {/* HST warning */}
          {totalRevenue >= HST_THRESHOLD * 0.8 && (
            <div className="rounded-xl p-3 flex items-start gap-2" style={{background:'#fef2f2',border:'1px solid #fca5a5'}}>
              <AlertTriangle size={16} color="#dc2626" className="shrink-0 mt-0.5" />
              <div className="text-xs" style={{color:'#991b1b'}}>
                <strong>HST Registration Warning:</strong> Your revenue is approaching ${HST_THRESHOLD.toLocaleString()} CAD. Once you exceed this threshold in a 12-month period, CRA requires you to register for HST and collect 13% from buyers. Talk to your accountant now.
              </div>
            </div>
          )}

          {holdingValue > 0 && (
            <div className="rounded-xl p-3 flex items-center gap-2" style={{background:'#eef2ff',border:'1px solid #c7d2fe'}}>
              <DollarSign size={16} color="#4f46e5" />
              <span className="text-sm" style={{color:'#3730a3'}}><strong>{fmt(holdingValue)}</strong> currently tied up in unsold tickets</span>
            </div>
          )}

          {/* Monthly breakdown */}
          {months.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-2" style={{color:'#374151'}}>Monthly Breakdown</h2>
              <div className="rounded-xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{background:'#f9fafb'}}>
                      <th className="text-left px-3 py-2 text-xs font-semibold" style={{color:'#6b7280'}}>Month</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold" style={{color:'#6b7280'}}>Revenue</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold" style={{color:'#6b7280'}}>Profit</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold" style={{color:'#6b7280'}}>Tax Est.</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold" style={{color:'#6b7280'}}>Take Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map(m => {
                      const d = monthlyData[m]
                      const tax = d.profit > 0 ? d.profit * TAX_RATE : 0
                      return (
                        <tr key={m} style={{borderTop:'1px solid #f3f4f6'}}>
                          <td className="px-3 py-2" style={{color:'#111827'}}>{m}</td>
                          <td className="px-3 py-2 text-right" style={{color:'#059669'}}>{fmt(d.revenue)}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{color: d.profit >= 0 ? '#059669' : '#dc2626'}}>{d.profit < 0 ? '-' : ''}{fmt(d.profit)}</td>
                          <td className="px-3 py-2 text-right" style={{color:'#dc2626'}}>{fmt(tax)}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{color:'#059669'}}>{fmt(d.profit - tax)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {buys.length === 0 && <p className="text-center text-sm py-8" style={{color:'#9ca3af'}}>No transactions yet. Log your first buy or import from email.</p>}
        </div>
      )}

      {/* ── BUYS ── */}
      {activeTab === 'buys' && (
        <div className="space-y-3">
          <button onClick={() => setShowBuyForm(!showBuyForm)} className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg w-full justify-center" style={{background:'#4f46e5'}}>
            <Plus size={15} /> Log a Buy Manually
          </button>

          {showBuyForm && (
            <div className="rounded-xl p-4 space-y-3" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <h3 className="font-semibold text-sm" style={{color:'#111827'}}>New Purchase</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Event Name *</label>
                  <input value={buyForm.eventName} onChange={e => setBuyForm(p => ({...p,eventName:e.target.value}))} placeholder="e.g. Drake — Scotiabank Arena" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Event Date</label>
                  <input type="date" value={buyForm.eventDate} onChange={e => setBuyForm(p => ({...p,eventDate:e.target.value}))} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Buy Date *</label>
                  <input type="date" value={buyForm.buyDate} onChange={e => setBuyForm(p => ({...p,buyDate:e.target.value}))} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Venue</label>
                  <input value={buyForm.venue} onChange={e => setBuyForm(p => ({...p,venue:e.target.value}))} placeholder="Scotiabank Arena" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Buyer</label>
                  <input value={buyForm.buyerName} onChange={e => setBuyForm(p => ({...p,buyerName:e.target.value}))} placeholder="Me / Friend name" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Quantity *</label>
                  <input type="number" value={buyForm.quantity} onChange={e => setBuyForm(p => ({...p,quantity:e.target.value}))} min="1" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Face Value Each ($) *</label>
                  <input type="number" value={buyForm.faceValueEach} onChange={e => setBuyForm(p => ({...p,faceValueEach:e.target.value}))} placeholder="150.00" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Total Fees ($)</label>
                  <input type="number" value={buyForm.feesTotal} onChange={e => setBuyForm(p => ({...p,feesTotal:e.target.value}))} placeholder="45.00" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
              </div>
              {buyForm.quantity && buyForm.faceValueEach && (
                <div className="rounded-lg px-3 py-2 text-sm" style={{background:'#eef2ff',color:'#3730a3'}}>
                  Total cost: <strong>${(Number(buyForm.faceValueEach)*Number(buyForm.quantity)+(Number(buyForm.feesTotal)||0)).toFixed(2)}</strong>
                </div>
              )}
              <input value={buyForm.notes} onChange={e => setBuyForm(p => ({...p,notes:e.target.value}))} placeholder="Notes (section, seat numbers...)" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
              <div className="flex gap-2">
                <button onClick={handleAddBuy} className="flex-1 text-white text-sm py-2 rounded-lg" style={{background:'#4f46e5'}}>Save</button>
                <button onClick={() => setShowBuyForm(false)} className="flex-1 text-sm py-2 rounded-lg" style={{border:'1px solid #d1d5db',color:'#6b7280'}}>Cancel</button>
              </div>
            </div>
          )}

          {buys.map(buy => {
            const { totalRevenue: rev, profit, qtySold } = calcProfit(buy, sells)
            const buySells = sells.filter(s => s.buyId === buy.id)
            const isExpanded = expandedBuy === buy.id
            return (
              <div key={buy.id} className="rounded-xl overflow-hidden" style={{background:'white',border:'1px solid #e5e7eb'}}>
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedBuy(isExpanded ? null : buy.id!)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{color:'#111827'}}>{buy.eventName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{background:STATUS_COLORS[buy.status]}}>{buy.status}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{color:'#9ca3af'}}>{buy.quantity} tickets · {buy.buyerName} · {buy.buyDate}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{color: profit >= 0 ? '#059669' : '#dc2626'}}>{profit < 0 ? '-' : '+'}{fmt(profit)}</div>
                    <div className="text-xs" style={{color:'#9ca3af'}}>{qtySold}/{buy.quantity} sold</div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                </div>
                {isExpanded && (
                  <div style={{borderTop:'1px solid #f3f4f6'}}>
                    <div className="px-4 py-3 grid grid-cols-4 gap-2 text-xs" style={{background:'#fafafa'}}>
                      <div><span style={{color:'#9ca3af'}}>Paid</span><br /><strong>{fmt(buy.totalCost)}</strong></div>
                      <div><span style={{color:'#9ca3af'}}>Revenue</span><br /><strong style={{color:'#059669'}}>{fmt(rev)}</strong></div>
                      <div><span style={{color:'#9ca3af'}}>Profit</span><br /><strong style={{color:profit>=0?'#059669':'#dc2626'}}>{profit<0?'-':''}{fmt(profit)}</strong></div>
                      <div><span style={{color:'#9ca3af'}}>Tax Est.</span><br /><strong style={{color:'#dc2626'}}>{fmt(profit>0?profit*TAX_RATE:0)}</strong></div>
                    </div>
                    {buySells.length > 0 && (
                      <div className="px-4 pb-2">
                        <p className="text-xs font-semibold mb-1" style={{color:'#6b7280'}}>Sales</p>
                        {buySells.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1" style={{borderTop:'1px solid #f3f4f6'}}>
                            <span style={{color:'#374151'}}>{s.sellDate} · {s.quantitySold}x ${s.salePriceEach} · {s.platform}</span>
                            <div className="flex items-center gap-2">
                              <span style={{color:'#059669'}}>Net {fmt(s.netReceived)}</span>
                              <button onClick={() => deleteSell(s.id!).then(load)}><Trash2 size={12} color="#dc2626" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-4 pb-3 flex gap-2">
                      <button onClick={() => { setSellBuyId(buy.id!); setShowSellForm(true); setActiveTab('sells') }} className="flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg" style={{background:'#059669'}}>
                        <Plus size={12} /> Log Sale
                      </button>
                      <button onClick={() => deleteBuy(buy.id!).then(load)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{border:'1px solid #fca5a5',color:'#dc2626'}}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {buys.length === 0 && !showBuyForm && <p className="text-center text-sm py-8" style={{color:'#9ca3af'}}>No buys logged yet.</p>}
        </div>
      )}

      {/* ── SELLS ── */}
      {activeTab === 'sells' && (
        <div className="space-y-3">
          <button onClick={() => setShowSellForm(!showSellForm)} className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg w-full justify-center" style={{background:'#059669'}}>
            <Plus size={15} /> Log a Sale Manually
          </button>

          {showSellForm && (
            <div className="rounded-xl p-4 space-y-3" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <h3 className="font-semibold text-sm" style={{color:'#111827'}}>Record a Sale</h3>
              <div>
                <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Which purchase? *</label>
                <select value={sellBuyId} onChange={e => setSellBuyId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}}>
                  <option value="">Select event...</option>
                  {buys.filter(b => b.status !== 'sold').map(b => <option key={b.id} value={b.id}>{b.eventName} ({b.quantity} tickets)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Sell Date</label>
                  <input type="date" value={sellForm.sellDate} onChange={e => setSellForm(p => ({...p,sellDate:e.target.value}))} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Qty Sold</label>
                  <input type="number" value={sellForm.quantitySold} onChange={e => setSellForm(p => ({...p,quantitySold:e.target.value}))} min="1" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Sale Price Each ($) *</label>
                  <input type="number" value={sellForm.salePriceEach} onChange={e => setSellForm(p => ({...p,salePriceEach:e.target.value}))} placeholder="280.00" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Platform Fee %</label>
                  <input type="number" value={sellForm.platformFeePercent} onChange={e => setSellForm(p => ({...p,platformFeePercent:e.target.value}))} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{color:'#6b7280'}}>Platform</label>
                  <select value={sellForm.platform} onChange={e => setSellForm(p => ({...p,platform:e.target.value}))} className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {sellForm.salePriceEach && sellForm.quantitySold && (
                <div className="rounded-lg px-3 py-2 text-sm space-y-1" style={{background:'#f0fdf4',color:'#15803d'}}>
                  <div>Gross: ${(Number(sellForm.salePriceEach)*Number(sellForm.quantitySold)).toFixed(2)}</div>
                  <div>Fee ({sellForm.platformFeePercent}%): -${(Number(sellForm.salePriceEach)*Number(sellForm.quantitySold)*Number(sellForm.platformFeePercent)/100).toFixed(2)}</div>
                  <div className="font-bold">Net received: ${(Number(sellForm.salePriceEach)*Number(sellForm.quantitySold)*(1-Number(sellForm.platformFeePercent)/100)).toFixed(2)}</div>
                </div>
              )}
              <input value={sellForm.notes} onChange={e => setSellForm(p => ({...p,notes:e.target.value}))} placeholder="Notes" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{border:'1px solid #d1d5db',color:'#111827'}} />
              <div className="flex gap-2">
                <button onClick={handleAddSell} className="flex-1 text-white text-sm py-2 rounded-lg" style={{background:'#059669'}}>Save</button>
                <button onClick={() => setShowSellForm(false)} className="flex-1 text-sm py-2 rounded-lg" style={{border:'1px solid #d1d5db',color:'#6b7280'}}>Cancel</button>
              </div>
            </div>
          )}

          {sells.map(s => (
            <div key={s.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{background:'white',border:'1px solid #e5e7eb'}}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{color:'#111827'}}>{s.eventName}</p>
                <p className="text-xs" style={{color:'#9ca3af'}}>{s.sellDate} · {s.quantitySold} tickets · {s.platform}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{color:'#059669'}}>{fmt(s.netReceived)}</p>
                <p className="text-xs" style={{color:'#9ca3af'}}>after fees</p>
              </div>
              <button onClick={() => deleteSell(s.id!).then(load)}><Trash2 size={14} color="#dc2626" /></button>
            </div>
          ))}
          {sells.length === 0 && !showSellForm && <p className="text-center text-sm py-8" style={{color:'#9ca3af'}}>No sales logged yet.</p>}
        </div>
      )}

      {/* ── IMPORT ── */}
      {activeTab === 'import' && (
        <div className="space-y-4">

          {/* Option B — Gmail auto-scan */}
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
            <div className="px-4 py-3" style={{background:'#eef2ff',borderBottom:'1px solid #c7d2fe'}}>
              <p className="text-sm font-semibold" style={{color:'#1e1b4b'}}>Option B — Auto-Scan Gmail</p>
              <p className="text-xs mt-0.5" style={{color:'#4338ca'}}>Connect Gmail once — app finds all ticket emails automatically. Zero effort.</p>
            </div>
            <div className="p-4 space-y-3">
              {!isGmailConfigured() ? (
                <div className="rounded-lg p-3 text-xs" style={{background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e'}}>
                  <strong>Setup needed:</strong> Add your Google OAuth Client ID to enable Gmail scanning.<br />
                  1. Go to <strong>console.cloud.google.com</strong> → APIs &amp; Services → Credentials<br />
                  2. Create OAuth 2.0 Client ID (Web application)<br />
                  3. Add <code>http://localhost:5173</code> to Authorized JavaScript origins<br />
                  4. Add to your <strong>.env.local</strong>: <code>VITE_GOOGLE_CLIENT_ID=your-client-id</code><br />
                  5. Restart the dev server
                </div>
              ) : (
                <>
                  <button
                    onClick={handleGmailScan}
                    disabled={gmailStatus === 'loading' || gmailStatus === 'scanning'}
                    className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg w-full justify-center disabled:opacity-50"
                    style={{background:'#4f46e5'}}>
                    {gmailStatus === 'loading' && <><RefreshCw size={14} className="animate-spin" /> Connecting to Gmail...</>}
                    {gmailStatus === 'scanning' && <><RefreshCw size={14} className="animate-spin" /> Scanning emails...</>}
                    {(gmailStatus === 'idle' || gmailStatus === 'error') && <><Mail size={14} /> Scan My Gmail for Ticket Emails</>}
                    {gmailStatus === 'done' && <><RefreshCw size={14} /> Scan Again</>}
                  </button>

                  {gmailStatus === 'error' && <p className="text-xs text-center" style={{color:'#dc2626'}}>Gmail connection failed. Check your Client ID and try again.</p>}

                  {gmailResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{color:'#111827'}}>Found {gmailResults.length} ticket emails</p>
                        <button onClick={handleImportAll} className="text-xs text-white px-3 py-1.5 rounded-lg" style={{background:'#059669'}}>
                          Import All
                        </button>
                      </div>
                      {gmailResults.map((r, i) => r.parsed && (
                        <div key={i} className="rounded-lg p-3 flex items-center justify-between gap-3" style={{background:'#f9fafb',border:'1px solid #e5e7eb'}}>
                          <div className="min-w-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${r.parsed.type === 'buy' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                              {r.parsed.type === 'buy' ? 'BUY' : 'SALE'}
                            </span>
                            <span className="text-sm" style={{color:'#111827'}}>{r.parsed.type === 'buy' ? (r.parsed as ParsedBuyEmail).eventName : (r.parsed as ParsedSellEmail).eventName}</span>
                            <p className="text-xs mt-0.5" style={{color:'#9ca3af'}}>
                              {r.parsed.type === 'buy'
                                ? `${(r.parsed as ParsedBuyEmail).quantity} tickets · $${(r.parsed as ParsedBuyEmail).totalCost.toFixed(2)} total`
                                : `${(r.parsed as ParsedSellEmail).quantitySold} sold · $${(r.parsed as ParsedSellEmail).netReceived.toFixed(2)} net`}
                            </p>
                          </div>
                          <button onClick={() => handleImportParsed(r.parsed)} className="shrink-0 text-xs text-white px-3 py-1.5 rounded-lg" style={{background:'#4f46e5'}}>
                            Import
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {gmailStatus === 'done' && gmailResults.length === 0 && (
                    <p className="text-xs text-center" style={{color:'#9ca3af'}}>No ticket confirmation emails found in your inbox.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Option A — Paste email */}
          <div className="rounded-xl overflow-hidden" style={{border:'1px solid #e5e7eb'}}>
            <div className="px-4 py-3" style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
              <p className="text-sm font-semibold" style={{color:'#374151'}}>Option A — Paste Email</p>
              <p className="text-xs mt-0.5" style={{color:'#6b7280'}}>Open your confirmation email → Select All → Copy → Paste here. Works for Ticketmaster, StubHub, SeatGeek, AXS.</p>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={emailText}
                onChange={e => { setEmailText(e.target.value); setParsed(null); setImportMsg('') }}
                placeholder="Paste your ticket confirmation or payout email here..."
                rows={6}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{border:'1px solid #d1d5db',color:'#111827'}}
              />
              <button onClick={handleParseEmail} disabled={!emailText.trim()} className="w-full text-white text-sm py-2 rounded-lg disabled:opacity-40" style={{background:'#4f46e5'}}>
                Detect &amp; Parse Email
              </button>

              {importMsg && (
                <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{background: importMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', color: importMsg.startsWith('✓') ? '#15803d' : '#dc2626'}}>
                  {importMsg.startsWith('✓') ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {importMsg}
                </div>
              )}

              {parsed && (
                <div className="rounded-xl overflow-hidden" style={{border:'2px solid #4f46e5'}}>
                  <div className="px-4 py-2" style={{background:'#eef2ff'}}>
                    <p className="text-xs font-semibold" style={{color:'#3730a3'}}>
                      {parsed.type === 'buy' ? '🎫 Purchase detected' : '💰 Sale detected'} — confirm and import
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2 text-sm">
                    {parsed.type === 'buy' ? (
                      <>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Event</span><br /><strong>{(parsed as ParsedBuyEmail).eventName || '—'}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Platform</span><br /><strong>{parsed.platform}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Quantity</span><br /><strong>{(parsed as ParsedBuyEmail).quantity} tickets</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Total Cost</span><br /><strong>${(parsed as ParsedBuyEmail).totalCost.toFixed(2)}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Face Value Each</span><br /><strong>${(parsed as ParsedBuyEmail).faceValueEach.toFixed(2)}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Fees</span><br /><strong>${(parsed as ParsedBuyEmail).feesTotal.toFixed(2)}</strong></div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Event</span><br /><strong>{(parsed as ParsedSellEmail).eventName || '—'}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Platform</span><br /><strong>{parsed.platform}</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Qty Sold</span><br /><strong>{(parsed as ParsedSellEmail).quantitySold} tickets</strong></div>
                        <div><span className="text-xs" style={{color:'#9ca3af'}}>Net Received</span><br /><strong style={{color:'#059669'}}>${(parsed as ParsedSellEmail).netReceived.toFixed(2)}</strong></div>
                      </>
                    )}
                  </div>
                  <div className="px-4 pb-4 flex gap-2">
                    <button onClick={() => handleImportParsed(parsed)} className="flex-1 text-white text-sm py-2 rounded-lg" style={{background:'#059669'}}>
                      ✓ Import This
                    </button>
                    <button onClick={() => setParsed(null)} className="flex-1 text-sm py-2 rounded-lg" style={{border:'1px solid #d1d5db',color:'#6b7280'}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
