import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Checklist } from '../components/Checklist'
import { SectionInfoButton } from '../components/SectionInfoButton'
import { SectionSurvey } from '../components/SectionSurvey'

export default function Foundry() {
  const { foundry, toggleTask, addComment, refreshTasks } = useApp()
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
              THE FOUNDRY
            </h1>
            <SectionInfoButton onClick={() => setShowSurvey(true)} />
          </div>
          <p className="text-gray-400 mt-2">Entity Creation & Legal Foundation</p>
        </div>

        <Checklist
          title="Business Setup"
          icon="🔨"
          tasks={foundry}
          onToggle={(id) => toggleTask('foundry', id)}
          onComment={(id, comment) => addComment('foundry', id, comment)}
        />

        <div className="mt-6 p-4 bg-wizard-indigo/20 rounded-xl border border-wizard-indigo/30">
          <p className="text-sm text-gray-400">
            <span className="text-gold font-semibold">Pro Tip:</span> This is where your business is forged. Complete these steps in order - your LLC is the foundation of your entire credit journey.
          </p>
        </div>
      </div>

      <SectionSurvey
        section="foundry"
        sectionTitle="The Foundry"
        isOpen={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSave={() => refreshTasks('foundry')}
      />
    </div>
  )
}
