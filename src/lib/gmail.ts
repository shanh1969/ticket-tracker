/**
 * Gmail API integration — scans inbox for ticket confirmation and payout emails.
 * Requires Google OAuth with gmail.readonly scope.
 */

const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

let tokenClient: any = null
let gapiInited = false
let gisInited = false

export function isGmailConfigured() {
  return !!CLIENT_ID
}

export async function initGmail(): Promise<void> {
  await Promise.all([loadGapi(), loadGis()])
}

function loadGapi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).gapi) { initGapiClient().then(resolve); return }
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => initGapiClient().then(resolve)
    script.onerror = reject
    document.body.appendChild(script)
  })
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = reject
    document.body.appendChild(script)
  })
}

async function initGapiClient(): Promise<void> {
  await new Promise<void>(resolve => (window as any).gapi.load('client', resolve))
  await (window as any).gapi.client.init({
    discoveryDocs: [DISCOVERY_DOC],
  })
  gapiInited = true
}

export function requestGmailAccess(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!gapiInited) { reject(new Error('GAPI not initialized')); return }
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: GMAIL_SCOPES,
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error))
        else { gisInited = true; resolve() }
      },
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

// Search Gmail for ticket-related emails
export async function scanTicketEmails(): Promise<string[]> {
  if (!gapiInited || !gisInited) throw new Error('Not authorized')

  const query = [
    'from:ticketmaster.com',
    'from:ticketmaster.ca',
    'from:livenation.com',
    'from:stubhub.com',
    'from:stubhub.ca',
    'from:seatgeek.com',
    'from:axs.com',
  ].join(' OR ')

  const listRes = await (window as any).gapi.client.gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  const messages = listRes.result.messages || []
  const bodies: string[] = []

  for (const msg of messages) {
    try {
      const msgRes = await (window as any).gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      })
      const body = extractBody(msgRes.result)
      if (body) bodies.push(body)
    } catch {
      // skip unreadable messages
    }
  }

  return bodies
}

function extractBody(message: any): string {
  const parts = message.payload?.parts || [message.payload]
  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part.body?.data) {
      return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }
    if (part?.mimeType === 'text/html' && part.body?.data) {
      return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    }
    if (part?.parts) {
      const nested = extractBody({ payload: part })
      if (nested) return nested
    }
  }
  return ''
}
