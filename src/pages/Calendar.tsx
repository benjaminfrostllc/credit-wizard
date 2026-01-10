import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { PixelCoin } from '../components/PixelCoin'

// GHL Calendar Embed URL - Update this with your actual GHL calendar link
const GHL_CALENDAR_URL = import.meta.env.VITE_GHL_CALENDAR_URL || ''

export default function Calendar() {
  useApp() // Ensure user is authenticated
  const [loadCalendar, setLoadCalendar] = useState(false)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-wizard-accent hover:text-wizard-glow transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <PixelCoin size={48} />
          <div>
            <h1
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              BOOK A MEETING
            </h1>
            <p className="text-gray-400 text-sm">Schedule a consultation with your Credit Wizard specialist</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-wizard-purple/30 rounded-xl border-2 border-wizard-indigo/30 p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <h3
                className="text-xs text-gold mb-2"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                SCHEDULING INFO
              </h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• <strong className="text-white">Select a time</strong> that works best for you</li>
                <li>• <strong className="text-white">Consultations</strong> are typically 15-30 minutes</li>
                <li>• <strong className="text-white">Come prepared</strong> with any questions about your credit journey</li>
                <li>• <strong className="text-white">You'll receive</strong> a confirmation email with meeting details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Calendar Embed */}
        {GHL_CALENDAR_URL ? (
          <div className="bg-wizard-dark rounded-2xl border-2 border-wizard-indigo/30 overflow-hidden">
            {loadCalendar ? (
              <iframe
                src={GHL_CALENDAR_URL}
                width="100%"
                height="700"
                frameBorder="0"
                className="w-full"
                title="Book a Meeting"
                loading="lazy"
                allow="camera; microphone; autoplay; encrypted-media;"
              />
            ) : (
              <div className="p-12 text-center">
                <span className="text-6xl mb-4 block">📅</span>
                <h3
                  className="text-sm text-white mb-2"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  READY TO BOOK?
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  Click below to load the booking calendar
                </p>
                <button
                  onClick={() => setLoadCalendar(true)}
                  className="px-6 py-3 bg-wizard-accent hover:bg-wizard-glow text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  Load Calendar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-wizard-purple/30 rounded-2xl border-2 border-wizard-indigo/30 p-8 text-center">
            <span className="text-6xl mb-4 block">📅</span>
            <h3
              className="text-sm text-white mb-2"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              CALENDAR NOT CONFIGURED
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              The booking calendar hasn't been set up yet.
            </p>
            <div className="bg-wizard-dark/50 rounded-lg p-4 text-left max-w-md mx-auto">
              <p className="text-xs text-gray-500 mb-2">To enable booking:</p>
              <p className="text-xs text-wizard-accent font-mono">
                Add VITE_GHL_CALENDAR_URL to your environment variables with your GoHighLevel calendar embed URL.
              </p>
            </div>
          </div>
        )}

        {/* Contact Alternative */}
        <div className="mt-6 p-4 bg-wizard-dark/30 rounded-xl border border-wizard-indigo/30">
          <h3
            className="text-xs text-wizard-accent mb-2"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            CAN'T FIND A TIME?
          </h3>
          <p className="text-xs text-gray-400">
            If none of the available times work for you, click the blue orb in the bottom right corner to chat with
            <strong className="text-oracle-glow"> The Oracle</strong> or contact your specialist directly.
          </p>
        </div>
      </div>
    </div>
  )
}
