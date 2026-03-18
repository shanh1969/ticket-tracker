import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

interface Section {
  title: string
  emoji: string
  content: Lesson[]
}

interface Lesson {
  heading: string
  points: string[]
}

const SECTIONS: Section[] = [
  {
    title: 'Buying Tickets Like an Expert',
    emoji: '🎯',
    content: [
      {
        heading: 'Online Always Beats Phone',
        points: [
          'Always buy online — it is faster, shows more inventory, and lets you compare sections simultaneously.',
          'Calling Ticketmaster on a hot on-sale can mean 1–3 hour hold times. By then, good seats are long gone.',
          'The only exception: accessible seating. Call the venue box office directly — they often have better placement and sometimes bypass the queue.',
          'In-person box office is worth it to avoid fees (face value only, no Ticketmaster service charges). On 4 tickets at $150 each, that saves you $120+ in fees.',
        ]
      },
      {
        heading: 'The Queue — How It Actually Works',
        points: [
          'Ticketmaster\'s queue is a RANDOM LOTTERY — not first-come-first-served.',
          'Everyone who enters the queue before on-sale time gets randomly shuffled. Being there 30 minutes early gives you the exact same odds as being there 2 minutes early.',
          'You only need to be in the queue before the on-sale clock hits zero. 5 minutes early is genuinely enough.',
          'The 30-minute advice exists only as insurance against slow logins, expired cards, or technical issues — not because early = better position.',
          'Entering AFTER on-sale starts puts you truly at the back. That is the only rule that matters.',
          'To enter the queue: click the Tickets button on any event card → go to the Ticketmaster event page → click "Join Waiting Room" or "Find Tickets" → stay on the page.',
        ]
      },
      {
        heading: 'Multiple Devices = Multiple Lottery Tickets',
        points: [
          'Each browser on each device gets its own independent queue position.',
          'On your laptop: open Chrome, Firefox, AND Edge — each logged into Ticketmaster, each on the event page. That is 3 separate queue entries from one computer.',
          'On your phone: open Chrome, Firefox, and Safari/Edge — 3 more entries.',
          'If you have a dual-screen phone that shows 3 apps simultaneously: all 3 browsers stay active and live at the same time. Zero switching, zero pausing. This is the ideal mobile setup.',
          'Total with laptop + phone: up to 6 simultaneous queue entries.',
          'When one browser gets through — buy on that one immediately, close the others.',
        ]
      },
      {
        heading: 'On-Sale Day Protocol',
        points: [
          '5–10 minutes before on-sale: open all browsers, log in, navigate to the event page, enter the waiting room.',
          'Decide in advance: how many tickets, which sections are acceptable, your maximum price. Make these decisions before on-sale — not while the 8-minute checkout timer is running.',
          'Click "Best Available" first. It picks the highest-ranked open seats instantly. Much faster than manually scanning the map while good seats disappear.',
          'Only browse the seat map if Best Available gives you something clearly unacceptable (behind stage, obstructed view).',
          'Complete checkout in under 3 minutes. Pre-save your credit card in Ticketmaster before on-sale day.',
          'After on-sale starts, keep refreshing for 10–20 minutes. Returns, failed payments, and second-wave releases happen constantly in the first hour.',
        ]
      },
    ]
  },
  {
    title: 'Presales — Your Biggest Advantage',
    emoji: '🔑',
    content: [
      {
        heading: 'What Presales Are',
        points: [
          'Presales open 2–7 days before general public on-sale — same inventory, same prices, far less competition.',
          'A single show can have 4–6 presale windows back-to-back. Each has its own code and open/close time.',
          'The Tickets button on each event card links directly to the Ticketmaster page where all presale windows are listed.',
          'Your TicketTracker app automatically shows presale codes pulled from the Ticketmaster API on each event card.',
        ]
      },
      {
        heading: 'How to Get Presale Codes',
        points: [
          'BEST: Subscribe to the artist\'s official email newsletter or fan club — they get first access, usually 5–7 days early.',
          'Follow the artist on Spotify — open the Spotify app, go to the artist page, check the Events tab for a presale code.',
          'Canadian credit cards with presale access: American Express Canada, TD credit cards, RBC Avion/Signature, CIBC Aventura.',
          'Ticketmaster Verified Fan: register on Ticketmaster for specific shows — they send you a code if selected.',
          'Reddit fan subreddits and Twitter/X: fans share presale codes publicly within minutes of announcement. Search "[Artist] presale code".',
          'Live Nation newsletter and venue email lists give 1–3 day early access.',
        ]
      },
    ]
  },
  {
    title: 'Ticket Limits — What You Can Actually Buy',
    emoji: '🎟️',
    content: [
      {
        heading: 'How Limits Work',
        points: [
          'Ticket limits are per HOUSEHOLD, not per credit card. Ticketmaster links accounts by credit card, billing address, IP address, and device fingerprint simultaneously.',
          'Typical limits: Major arena concerts 2–4 tickets, standard concerts 4–6, sports regular season 4–8, stadiums 6–8.',
          'Using two different credit cards from the same IP address and same billing address will get BOTH orders cancelled. You end up with nothing.',
          'Two devices on the same WiFi buying at the same time with same billing address = flagged as duplicate.',
        ]
      },
      {
        heading: 'Getting More Tickets Legitimately',
        points: [
          'Coordinate with trusted friends or family — each person buys on their own Ticketmaster account, their own credit card, from their own WiFi connection.',
          'Send them the direct Tickets link from your TicketTracker app. They buy, you pay them back plus a fee for their time ($20–50 is standard).',
          'Each person can buy up to the limit. 3 people × 4 tickets = 12 tickets, cleanly and safely.',
          'Presale windows sometimes have separate limits from general on-sale — check each window.',
          'VIP and floor packages are often sold separately with their own limits.',
        ]
      },
    ]
  },
  {
    title: 'Seat Selection Strategy',
    emoji: '🪑',
    content: [
      {
        heading: 'Best Seats for Attending',
        points: [
          'Floor/Pit: Best atmosphere, closest to the artist. Standing only. Arrive early to reach the rail.',
          'Lower Bowl Centre (rows 10–20): Best overall. Directly facing the stage, not angled. Rows 10–20 often beat rows 1–5 for comfort.',
          'Upper Bowl Centre: Underrated. Dead centre upper bowl is a clean sightline, often 40–60% cheaper than lower bowl.',
          'Behind the stage: Avoid unless you want to watch the artist\'s back. Sometimes 70% cheaper.',
        ]
      },
      {
        heading: 'Best Seats for Reselling',
        points: [
          'Floor/Pit: Sell fastest, highest premium possible (200–500% markup on hot shows).',
          'Lower Bowl Centre rows 1–15: Strong resale market, reliable profit.',
          'Upper Bowl: Sells but lower margin — only worth buying if face value is very cheap.',
          'Obstructed view / behind stage: Hardest to sell, lowest return. Avoid for resale.',
        ]
      },
    ]
  },
  {
    title: 'Understanding Fees',
    emoji: '💸',
    content: [
      {
        heading: 'What You Pay When Buying',
        points: [
          'Total fees on Ticketmaster typically add 25–35% on top of face value.',
          'Service/convenience fee: 18–22% of face value (goes to Ticketmaster).',
          'Facility fee: $3–8 flat (goes to the venue).',
          'Order processing fee: $2–5 flat per order.',
          'Always choose mobile delivery — PDF/print delivery adds $2–4 extra. Mobile tickets are free.',
          'Box office in person = face value only, zero service fees. Worth it on expensive tickets for a group.',
        ]
      },
    ]
  },
  {
    title: 'Reselling — The Complete Playbook',
    emoji: '💰',
    content: [
      {
        heading: 'How to Identify Profitable Shows',
        points: [
          'Artist is on a major album cycle (new release in last 6 months).',
          'Limited tour dates in your city — 1 show vs 5 shows means much higher demand per show.',
          'Venue is small relative to the artist\'s fanbase.',
          'Show sells out within hours of going on sale.',
          'No additional dates announced after first sellout.',
          'The skill that separates $500/month from $5,000/month is knowing WHICH tickets to buy — anyone can buy, not everyone knows what will sell.',
        ]
      },
      {
        heading: 'When to List After Buying',
        points: [
          'Show sold out within 1 hour: List the same day at 150–200% of face value. Demand is at peak right now.',
          'Show sold out within first week: List within 2 weeks at 120–150% face value.',
          'Show not sold out, slow seller: Wait until 2–4 weeks before the show — demand often rises as the date approaches.',
          'Under 2 weeks to show: Drop price 5–10% every few days. Urgency pricing.',
          'NEVER hold tickets past 48 hours before the show. Unsold tickets on show day are worth $0. Half your money back beats nothing.',
        ]
      },
      {
        heading: '5 Pricing Rules',
        points: [
          '1. Check comps first — look at what similar seats are listed for on StubHub and SeatGeek right now before setting your price.',
          '2. List 5–10% below the lowest comp in your section — buyers sort by price, being cheapest gets you sold first.',
          '3. Account for seller fees before pricing: StubHub takes 15% from you, SeatGeek takes 10%. If you want $200 net, list at $235 on StubHub or $222 on SeatGeek.',
          '4. List in pairs — buyers almost always come in pairs. Two tickets listed together sells far faster than singles. Split 4 tickets into two pairs.',
          '5. Revisit every 2–3 days — if no sale in 5 days, drop 10%. If under 1 week to show, drop 15%.',
        ]
      },
      {
        heading: 'Where to Sell',
        points: [
          'StubHub: Largest buyer traffic, easiest to sell. Seller fee 15%. Best first choice for most events.',
          'SeatGeek: Lower seller fee (10%), growing platform. Good for reaching different buyers.',
          'Ticketmaster Fan-to-Fan: Official resale, guaranteed authentic transfer. Use for Ticketmaster-issued tickets.',
          'Facebook Marketplace / Kijiji: Zero fees, immediate payment via e-Transfer. Good for last-minute local sales.',
          'List on StubHub AND SeatGeek simultaneously — more exposure, faster sale. Remove one the moment the other sells.',
          'For Facebook/Kijiji: ONLY accept Interac e-Transfer — never PayPal or cheque. E-transfer is final and cannot be reversed.',
        ]
      },
      {
        heading: 'Safe Ticket Transfers',
        points: [
          'Always use the official Transfer function in the Ticketmaster or AXS app — it invalidates your barcode and generates a new one for the buyer.',
          'NEVER share a screenshot of your ticket barcode. Anyone with a screenshot can scan it and get in — and you will be turned away.',
          'PDF tickets emailed directly are risky for resale — the original file still exists. Use official transfer whenever possible.',
          'Ticketmaster transfer-locked tickets can only be resold through Ticketmaster\'s official resale system.',
        ]
      },
    ]
  },
  {
    title: 'Income Potential',
    emoji: '📈',
    content: [
      {
        heading: 'What You Can Realistically Make',
        points: [
          'Solo (you buying 4–6 tickets yourself): $500–$2,000 per month on a good month with 2–4 hot shows.',
          'Hot show example: Buy 4 tickets at $150 face = $600 invested. Sell at $280 each = $1,120 gross, $952 net after 15% StubHub fees. Profit: ~$350.',
          'Very hot show: Buy 4 at $200 = $800 invested. Sell at $450 each = $1,800 gross, $1,530 net. Profit: ~$730.',
          'With 2 buyers (you + 1 person): doubles your volume per show → $2,100–$4,200/month.',
          'With 3 buyers: $3,150–$6,300/month on 3 hot shows.',
          'With 4 buyers: $4,200–$8,400/month.',
          'People doing $10,000+/month are running 5–10 buyers, targeting 6–8 shows/month, and have learned which artists always sell out.',
        ]
      },
      {
        heading: 'Capital and Risk',
        points: [
          'You need $600–$1,500 tied up per show before you see any return. This is real money at risk.',
          'Not every show is profitable — roughly 1 in 3 shows you buy will actually be worth flipping.',
          'Time investment: 5–10 hours per month solo for monitoring listings, adjusting prices, managing transfers.',
          'September–November and February–April are peak concert seasons. July and January are slow.',
          'Reinvest profits into bigger shows — larger face value = larger absolute profit per ticket.',
        ]
      },
    ]
  },
  {
    title: 'Taxes & Legal (Ontario)',
    emoji: '🧾',
    content: [
      {
        heading: 'How You Are Taxed',
        points: [
          'Ticket reselling is legal in Ontario (legalized in 2015). This is a legitimate business.',
          'CRA treats this as self-employment / business income. You are taxed on NET PROFIT only — not gross sales.',
          'Ontario combined marginal rate for income in the $60k–$100k bracket: approximately 31–33%.',
          'Example: Buy $600, sell for $952 net, profit = $352. Tax owed = ~$110. Take home = ~$242.',
          'Register as a sole proprietor — simple, free, and lets you deduct expenses.',
        ]
      },
      {
        heading: 'What You Can Deduct',
        points: [
          'All Ticketmaster and platform fees paid when buying tickets.',
          'All StubHub/SeatGeek seller fees.',
          'Money paid to your buyers for their time.',
          'Your phone bill (portion used for the business).',
          'Internet bill (portion used for the business).',
          'Any subscription costs for this app.',
          'A portion of your home office if you work from home.',
        ]
      },
      {
        heading: 'HST Warning',
        points: [
          'Once your total revenue (gross sales — not profit) exceeds $30,000 in any 12-month period, CRA requires you to register for HST.',
          'After registering, you must collect 13% HST from buyers and remit it to CRA.',
          'Your TicketTracker Profits page shows a warning when you are approaching this threshold.',
          'Talk to an accountant before you hit $30k — getting set up properly is much easier than fixing it after.',
        ]
      },
      {
        heading: 'Stay Safe from Audits',
        points: [
          'People who get caught by CRA are depositing $50,000+ in e-Transfers with zero records.',
          'Keep every Ticketmaster confirmation email. Keep every StubHub/SeatGeek payout email.',
          'Use your TicketTracker Profits page — every buy, sell, fee, and profit is logged and exportable as CSV for your accountant.',
          'Clean books mean a CRA audit is nothing to worry about — you hand them the CSV and you are done.',
        ]
      },
    ]
  },
  {
    title: 'Using TicketTracker for the Full Workflow',
    emoji: '📱',
    content: [
      {
        heading: 'Step-by-Step Workflow',
        points: [
          'DISCOVER: Search for events. See presale codes on each card automatically. Click Tickets to go directly to the purchase page.',
          'WATCHLIST: Save favourite artists and teams. App watches for new events and notifies you.',
          'SCHEDULE: All tracked events in one place. Four notification stages: Announced → Week Before → 24 Hours → On Sale Now.',
          'MY TICKETS: Forward your confirmation email to auto-import purchased tickets. Or add manually.',
          'RESELL: Select a ticket from your inventory. App scans SeatGeek for current comps, suggests a listing price, generates a copy-paste description. Click StubHub or SeatGeek to open the listing form.',
          'PROFITS: Log every buy and sell. Dashboard shows total invested, revenue, fees, gross profit, estimated tax owed, and take-home pay. Export to CSV for your accountant.',
        ]
      },
      {
        heading: 'The Tickets Button',
        points: [
          'Every event card has a "Buy" button that links directly to that specific event\'s purchase page on Ticketmaster or SeatGeek.',
          'This IS the end link — no searching, no browsing. Click it and you land exactly where you need to be.',
          'Open this link in Chrome, Firefox, and Edge simultaneously before on-sale time to get 3 queue entries from your laptop alone.',
          'On your dual-screen phone, open the same link in 3 browsers simultaneously for 3 more active queue entries.',
        ]
      },
    ]
  },
]

export default function TicketLessons() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        style={{background: '#4f46e5', color: 'white'}}>
        <BookOpen size={13} />
        Ticket Lessons
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col" style={{background: 'rgba(0,0,0,0.5)'}}>
          <div className="flex-1 overflow-y-auto mt-12 rounded-t-2xl" style={{background: '#f0f2f5'}}>

            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #e5e7eb', backdropFilter: 'blur(8px)'}}>
              <div>
                <h1 className="text-base font-bold" style={{color: '#1e1b4b'}}>🎫 Ticket Expert Guide</h1>
                <p className="text-xs" style={{color: '#6b7280'}}>Everything you need to buy and sell like a pro</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full" style={{background: '#f3f4f6'}}>
                <X size={18} color="#374151" />
              </button>
            </div>

            <div className="p-4 space-y-3 pb-10">
              {SECTIONS.map(section => (
                <div key={section.title} className="rounded-xl overflow-hidden" style={{background: 'white', border: '1px solid #e5e7eb'}}>

                  {/* Section header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpanded(expanded === section.title ? null : section.title)}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{section.emoji}</span>
                      <span className="font-semibold text-sm" style={{color: '#111827'}}>{section.title}</span>
                    </div>
                    {expanded === section.title
                      ? <ChevronUp size={16} color="#9ca3af" />
                      : <ChevronDown size={16} color="#9ca3af" />}
                  </button>

                  {/* Section content */}
                  {expanded === section.title && (
                    <div style={{borderTop: '1px solid #f3f4f6'}}>
                      {section.content.map(lesson => (
                        <div key={lesson.heading} className="px-4 py-3" style={{borderBottom: '1px solid #f9fafb'}}>
                          <h3 className="text-sm font-semibold mb-2" style={{color: '#374151'}}>{lesson.heading}</h3>
                          <ul className="space-y-2">
                            {lesson.points.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" style={{color: '#4b5563'}}>
                                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{background: '#4f46e5'}} />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
