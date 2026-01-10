import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import {
  getSurveyQuestions,
  getClientSurveyResponses,
  saveClientSurveyResponses,
  type SurveyQuestion,
} from '../lib/supabase'

interface SectionSurveyProps {
  section: string
  sectionTitle: string
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function SectionSurvey({
  section,
  sectionTitle,
  isOpen,
  onClose,
  onSave,
}: SectionSurveyProps) {
  const { user } = useApp()
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !user) return

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      const [surveyQuestions, existingResponses] = await Promise.all([
        getSurveyQuestions(section),
        getClientSurveyResponses(user.id),
      ])

      if (cancelled) return

      setQuestions(surveyQuestions)

      // Load existing responses
      const responseMap: Record<string, string> = {}
      existingResponses.forEach((r) => {
        responseMap[r.question_id] = r.answer
      })
      setResponses(responseMap)
      setLoading(false)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [isOpen, user, section])

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    const result = await saveClientSurveyResponses(user.id, responses)

    if (result.success) {
      onSave?.()
      onClose()
    }
    setSaving(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-wizard-purple border-2 border-wizard-indigo rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-wizard-indigo/50">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg text-wizard-accent"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                CUSTOMIZE {sectionTitle.toUpperCase()}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Answer a few questions to personalize your tasks
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-wizard-indigo/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-wizard-accent border-t-transparent rounded-full" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-3">🔮</span>
              <p className="text-gray-400">
                No customization options available for this section yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <label className="block">
                    <span className="text-xs text-wizard-accent font-semibold">
                      Question {index + 1}
                    </span>
                    <p className="text-white mt-1">{question.question}</p>
                  </label>

                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          responses[question.id] === option.value
                            ? 'border-wizard-accent bg-wizard-accent/10'
                            : 'border-wizard-indigo/50 hover:border-wizard-indigo bg-wizard-dark/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.value}
                          checked={responses[question.id] === option.value}
                          onChange={() => handleResponseChange(question.id, option.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            responses[question.id] === option.value
                              ? 'border-wizard-accent bg-wizard-accent'
                              : 'border-gray-500'
                          }`}
                        >
                          {responses[question.id] === option.value && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            responses[question.id] === option.value
                              ? 'text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {questions.length > 0 && !loading && (
          <div className="p-6 border-t border-wizard-indigo/50 bg-wizard-dark/30">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-400 hover:text-white border-2 border-wizard-indigo hover:border-wizard-accent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-wizard-accent hover:bg-wizard-glow text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
