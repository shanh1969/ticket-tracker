"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapePresaleCodes = exports.inboundEmail = exports.checkNotificationThresholds = exports.checkWatchlist = void 0;
const admin = require("firebase-admin");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const resend_1 = require("resend");
const axios_1 = require("axios");
admin.initializeApp();
const db = admin.firestore();
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM = (_a = process.env.RESEND_FROM_EMAIL) !== null && _a !== void 0 ? _a : 'alerts@yourdomain.com';
const TO = (_b = process.env.RESEND_TO_EMAIL) !== null && _b !== void 0 ? _b : 'you@example.com';
const TM_KEY = (_c = process.env.TICKETMASTER_API_KEY) !== null && _c !== void 0 ? _c : '';
// ─────────────────────────────────────────────────────────────────────────────
// Helper: send email via Resend
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmail(subject, html) {
    await resend.emails.send({ from: FROM, to: TO, subject, html });
}
// ─────────────────────────────────────────────────────────────────────────────
// checkWatchlist — runs every 5 minutes
// Searches Ticketmaster for new events matching watchlist items
// ─────────────────────────────────────────────────────────────────────────────
exports.checkWatchlist = (0, scheduler_1.onSchedule)({ schedule: 'every 5 minutes', region: 'us-central1' }, async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16;
    const watchlistSnap = await db.collection('watchlist').get();
    const scheduleSnap = await db.collection('schedule').get();
    // Build set of already-tracked event IDs
    const trackedIds = new Set();
    scheduleSnap.docs.forEach(d => {
        const event = d.data().event;
        if (event === null || event === void 0 ? void 0 : event.id)
            trackedIds.add(event.id);
    });
    for (const item of watchlistSnap.docs) {
        const { name } = item.data();
        try {
            const { data } = await axios_1.default.get('https://app.ticketmaster.com/discovery/v2/events.json', {
                params: {
                    apikey: TM_KEY,
                    keyword: name,
                    size: 5,
                    sort: 'date,asc',
                },
            });
            const events = (_b = (_a = data._embedded) === null || _a === void 0 ? void 0 : _a.events) !== null && _b !== void 0 ? _b : [];
            for (const e of events) {
                const id = `tm-${e.id}`;
                if (trackedIds.has(id))
                    continue;
                // Add to schedule
                const newEvent = {
                    id,
                    name: e.name,
                    type: ((_e = (_d = (_c = e.classifications) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.segment) === null || _e === void 0 ? void 0 : _e.name) === 'Sports' ? 'sports' : 'concert',
                    venue: (_j = (_h = (_g = (_f = e._embedded) === null || _f === void 0 ? void 0 : _f.venues) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.name) !== null && _j !== void 0 ? _j : '',
                    city: (_p = (_o = (_m = (_l = (_k = e._embedded) === null || _k === void 0 ? void 0 : _k.venues) === null || _l === void 0 ? void 0 : _l[0]) === null || _m === void 0 ? void 0 : _m.city) === null || _o === void 0 ? void 0 : _o.name) !== null && _p !== void 0 ? _p : '',
                    date: (_v = (_s = (_r = (_q = e.dates) === null || _q === void 0 ? void 0 : _q.start) === null || _r === void 0 ? void 0 : _r.dateTime) !== null && _s !== void 0 ? _s : (_u = (_t = e.dates) === null || _t === void 0 ? void 0 : _t.start) === null || _u === void 0 ? void 0 : _u.localDate) !== null && _v !== void 0 ? _v : '',
                    onSaleDate: (_y = (_x = (_w = e.sales) === null || _w === void 0 ? void 0 : _w.public) === null || _x === void 0 ? void 0 : _x.startDateTime) !== null && _y !== void 0 ? _y : null,
                    preSaleDate: (_2 = (_1 = (_0 = (_z = e.sales) === null || _z === void 0 ? void 0 : _z.presales) === null || _0 === void 0 ? void 0 : _0[0]) === null || _1 === void 0 ? void 0 : _1.startDateTime) !== null && _2 !== void 0 ? _2 : null,
                    imageUrl: (_5 = (_4 = (_3 = e.images) === null || _3 === void 0 ? void 0 : _3.find((i) => i.ratio === '16_9')) === null || _4 === void 0 ? void 0 : _4.url) !== null && _5 !== void 0 ? _5 : '',
                    minPrice: (_8 = (_7 = (_6 = e.priceRanges) === null || _6 === void 0 ? void 0 : _6[0]) === null || _7 === void 0 ? void 0 : _7.min) !== null && _8 !== void 0 ? _8 : null,
                    maxPrice: (_11 = (_10 = (_9 = e.priceRanges) === null || _9 === void 0 ? void 0 : _9[0]) === null || _10 === void 0 ? void 0 : _10.max) !== null && _11 !== void 0 ? _11 : null,
                    url: (_12 = e.url) !== null && _12 !== void 0 ? _12 : '',
                    platform: 'ticketmaster',
                    genre: (_16 = (_15 = (_14 = (_13 = e.classifications) === null || _13 === void 0 ? void 0 : _13[0]) === null || _14 === void 0 ? void 0 : _14.genre) === null || _15 === void 0 ? void 0 : _15.name) !== null && _16 !== void 0 ? _16 : '',
                    presaleCodes: [],
                };
                await db.collection('schedule').add({
                    event: newEvent,
                    notifications: { announced: true, oneWeek: false, twentyFourHour: false, onSale: false },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                trackedIds.add(id);
                await sendEmail(`🎫 NEW EVENT: ${e.name}`, `
              <h2>New Event Announced: ${e.name}</h2>
              <p><strong>Venue:</strong> ${newEvent.venue}, ${newEvent.city}</p>
              <p><strong>Date:</strong> ${newEvent.date}</p>
              ${newEvent.onSaleDate ? `<p><strong>On Sale:</strong> ${newEvent.onSaleDate}</p>` : ''}
              ${newEvent.minPrice ? `<p><strong>Price:</strong> From $${newEvent.minPrice}</p>` : ''}
              <p><a href="${newEvent.url}">View on Ticketmaster →</a></p>
              <hr><p><em>Matched watchlist: ${name}</em></p>
            `);
            }
        }
        catch (err) {
            console.error(`Watchlist check error for "${name}":`, err);
        }
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// checkNotificationThresholds — runs every 60 minutes
// Sends milestone emails: 1 week, 24 hours, and on-sale
// ─────────────────────────────────────────────────────────────────────────────
exports.checkNotificationThresholds = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', region: 'us-central1' }, async () => {
    var _a;
    const snap = await db.collection('schedule').get();
    const now = Date.now();
    for (const doc of snap.docs) {
        const data = doc.data();
        const event = data.event;
        const notifs = (_a = data.notifications) !== null && _a !== void 0 ? _a : {};
        const onSaleDate = (event === null || event === void 0 ? void 0 : event.onSaleDate) ? new Date(event.onSaleDate).getTime() : null;
        if (!onSaleDate)
            continue;
        const hoursUntil = (onSaleDate - now) / (1000 * 60 * 60);
        const updates = {};
        // On sale NOW (within -5 to +60 min window)
        if (!notifs.onSale && hoursUntil >= -0.083 && hoursUntil <= 1) {
            await sendEmail(`🚨 ON SALE NOW: ${event.name}`, `
            <h2>🚨 Tickets are ON SALE NOW: ${event.name}</h2>
            <p><strong>Venue:</strong> ${event.venue}</p>
            <p><a href="${event.url}" style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:8px">Buy Tickets Now →</a></p>
          `);
            updates['notifications.onSale'] = true;
        }
        // 24 hours out
        if (!notifs.twentyFourHour && hoursUntil > 0 && hoursUntil <= 24) {
            await sendEmail(`⏰ 24 Hours Until On Sale: ${event.name}`, `
            <h2>⏰ On sale in ~24 hours: ${event.name}</h2>
            <p>On sale: ${new Date(onSaleDate).toLocaleString()}</p>
            <p><a href="${event.url}">Get ready →</a></p>
          `);
            updates['notifications.twentyFourHour'] = true;
        }
        // 1 week out (168 hours)
        if (!notifs.oneWeek && hoursUntil > 24 && hoursUntil <= 168) {
            await sendEmail(`📅 1 Week Until On Sale: ${event.name}`, `
            <h2>📅 On sale in 1 week: ${event.name}</h2>
            <p>On sale: ${new Date(onSaleDate).toLocaleString()}</p>
            <p><a href="${event.url}">View event →</a></p>
          `);
            updates['notifications.oneWeek'] = true;
        }
        if (Object.keys(updates).length > 0) {
            await doc.ref.update(updates);
        }
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// inboundEmail — HTTP endpoint for Resend inbound email webhook
// Parses ticket confirmation emails and imports into my_tickets
// ─────────────────────────────────────────────────────────────────────────────
exports.inboundEmail = (0, https_1.onRequest)({ region: 'us-central1', invoker: 'public' }, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const payload = req.body;
        const subject = (_c = (_a = payload.subject) !== null && _a !== void 0 ? _a : (_b = payload.headers) === null || _b === void 0 ? void 0 : _b.subject) !== null && _c !== void 0 ? _c : '';
        const text = (_e = (_d = payload.text) !== null && _d !== void 0 ? _d : payload.html) !== null && _e !== void 0 ? _e : '';
        const from = (_f = payload.from) !== null && _f !== void 0 ? _f : '';
        // Detect platform from sender
        let platform = 'unknown';
        if (from.includes('ticketmaster'))
            platform = 'Ticketmaster';
        else if (from.includes('stubhub'))
            platform = 'StubHub';
        else if (from.includes('seatgeek'))
            platform = 'SeatGeek';
        else if (from.includes('axs'))
            platform = 'AXS';
        // Extract order number
        const orderMatch = text.match(/order\s*#?\s*([A-Z0-9\-]{6,20})/i);
        const orderNumber = (_g = orderMatch === null || orderMatch === void 0 ? void 0 : orderMatch[1]) !== null && _g !== void 0 ? _g : '';
        // Extract event name from subject (best effort)
        const eventName = subject
            .replace(/your (order|ticket|confirmation)/gi, '')
            .replace(/from \w+/gi, '')
            .replace(/order #?[A-Z0-9\-]+/gi, '')
            .trim() || subject;
        // Extract date (best effort)
        const dateMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i);
        const date = dateMatch ? dateMatch[0] : '';
        await db.collection('my_tickets').add({
            eventName,
            venue: '',
            date,
            section: '',
            row: '',
            seat: '',
            pricePaid: 0,
            platform,
            orderNumber,
            source: 'email',
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
            rawSubject: subject,
        });
        res.status(200).json({ ok: true });
    }
    catch (err) {
        console.error('inboundEmail error:', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// scrapePresaleCodes — runs every 60 minutes
// Fetches presale info from Ticketmaster for all scheduled events
// ─────────────────────────────────────────────────────────────────────────────
exports.scrapePresaleCodes = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', region: 'us-central1' }, async () => {
    var _a, _b, _c;
    const snap = await db.collection('schedule').get();
    for (const doc of snap.docs) {
        const data = doc.data();
        const event = data.event;
        if (!((_a = event === null || event === void 0 ? void 0 : event.id) === null || _a === void 0 ? void 0 : _a.startsWith('tm-')))
            continue;
        const tmId = event.id.replace('tm-', '');
        try {
            const { data: res } = await axios_1.default.get(`https://app.ticketmaster.com/discovery/v2/events/${tmId}.json`, { params: { apikey: TM_KEY } });
            const presales = (_c = (_b = res.sales) === null || _b === void 0 ? void 0 : _b.presales) !== null && _c !== void 0 ? _c : [];
            const codes = presales
                .map((p) => { var _a; return `${p.name}: ${(_a = p.url) !== null && _a !== void 0 ? _a : ''}`; })
                .filter(Boolean);
            if (codes.length > 0) {
                await doc.ref.update({ 'event.presaleCodes': codes });
            }
        }
        catch (err) {
            // Non-critical — skip silently
        }
    }
});
//# sourceMappingURL=index.js.map