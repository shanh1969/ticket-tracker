import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

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

// Firestore collections:
// - events         : discovered ticket events
// - watchlist      : artists/teams being watched
// - schedule       : events user has tracked (with notification status)
// - my_tickets     : purchased tickets (manual + email-parsed)
// - resale_listings: cached resale price data
// - notifications_log: record of emails sent
// - presale_codes  : presale codes per event
