import { useState } from 'react'
import { Bell, BellOff, Mail, Check } from 'lucide-react'
import { requestBrowserPermission, getBrowserPermission, getNotifEmail, saveNotifEmail } from '@/lib/notifications'

export default function NotifSetup() {
  const [permission, setPermission] = useState(() => getBrowserPermission())
  const [email, setEmail] = useState(() => getNotifEmail())
  const [savedEmail, setSavedEmail] = useState(() => getNotifEmail())
  const [emailSaved, setEmailSaved] = useState(false)

  async function handleEnableBrowser() {
    const granted = await requestBrowserPermission()
    setPermission(granted ? 'granted' : 'denied')
  }

  function handleSaveEmail() {
    const trimmed = email.trim()
    saveNotifEmail(trimmed)
    setSavedEmail(trimmed)
    setEmailSaved(true)
    setTimeout(() => setEmailSaved(false), 3000)
  }

  return (
    <div className="rounded-xl p-3 mb-4" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#111827' }}>
        🔔 Notification Settings
      </h2>

      {/* Browser notifications */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-medium" style={{ color: '#374151' }}>Browser Alerts</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>Pop-up when app is open</p>
        </div>
        {permission === 'unsupported' ? (
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#f3f4f6', color: '#9ca3af' }}>
            Not supported
          </span>
        ) : permission === 'granted' ? (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: '#d1fae5', color: '#065f46' }}>
            <Bell size={12} /> Enabled
          </span>
        ) : permission === 'denied' ? (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <BellOff size={12} /> Blocked
          </span>
        ) : (
          <button
            onClick={handleEnableBrowser}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white"
            style={{ background: '#4f46e5' }}
          >
            <Bell size={12} /> Enable
          </button>
        )}
      </div>

      {/* Email notifications */}
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: '#374151' }}>
          <span className="inline-flex items-center gap-1"><Mail size={11} /> Email Alerts</span>
        </p>
        <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>
          Sent 1 week before, 24 hrs before, and when tickets go on sale.
          Requires <a href="https://resend.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>Resend</a> API key in Vercel.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveEmail()}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
            style={{ background: '#f9fafb', border: `1px solid ${emailSaved ? '#059669' : '#d1d5db'}`, color: '#111827' }}
          />
          <button
            onClick={handleSaveEmail}
            disabled={!email.trim()}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
            style={{ background: emailSaved ? '#059669' : '#4f46e5' }}
          >
            {emailSaved ? <><Check size={12} /> Saved</> : 'Save'}
          </button>
        </div>
        {savedEmail && (
          <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color: '#059669' }}>
            <Check size={11} /> Notifications will be sent to <strong>{savedEmail}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
