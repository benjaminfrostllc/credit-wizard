import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Checklist } from '../components/Checklist'
import { SectionInfoButton } from '../components/SectionInfoButton'
import { SectionSurvey } from '../components/SectionSurvey'

export default function Identity() {
  const { identity, toggleTask, addComment, refreshTasks } = useApp()
  const [showSurvey, setShowSurvey] = useState(false)

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-wizard-accent hover:text-wizard-glow transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl md:text-3xl font-bold text-white"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              IDENTITY
            </h1>
            <SectionInfoButton onClick={() => setShowSurvey(true)} />
          </div>
          <p className="text-gray-400 mt-2">Credit Identity & Online Presence</p>
        </div>

        <Checklist
          title="Public Signals"
          icon="🔍"
          tasks={identity}
          onToggle={(id) => toggleTask('identity', id)}
          onComment={(id, comment) => addComment('identity', id, comment)}
        />

        <div className="mt-6 p-4 bg-wizard-indigo/20 rounded-xl border border-wizard-indigo/30">
          <p className="text-sm text-gray-400">
            <span className="text-gold font-semibold">Pro Tip:</span> This is your machine-readable footprint. D-U-N-S, website, socials, and directory listings all signal legitimacy to lenders.
          </p>
        </div>
      </div>

      <SectionSurvey
        section="identity"
        sectionTitle="Identity"
        isOpen={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSave={() => refreshTasks('identity')}
      />
    </div>
  )
}
