import { useState } from 'react'
import { SparkleEffect } from './SparkleEffect'

interface ChecklistItemProps {
  id: string
  title: string
  description: string
  completed: boolean
  comment?: string
  onToggle: (id: string) => void
  onComment: (id: string, comment: string) => void
}

export function ChecklistItem({
  id,
  title,
  description,
  completed,
  comment,
  onToggle,
  onComment,
}: ChecklistItemProps) {
  const [showComment, setShowComment] = useState(false)
  const [localComment, setLocalComment] = useState(comment || '')
  const [justCompleted, setJustCompleted] = useState(false)

  const handleToggle = () => {
    if (!completed) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 1500)
    }
    onToggle(id)
  }

  const handleSaveComment = () => {
    onComment(id, localComment)
    setShowComment(false)
  }

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all duration-300 ${
        completed
          ? 'bg-wizard-indigo/30 border-gold/30'
          : 'bg-wizard-purple/50 border-wizard-indigo/30 hover:border-wizard-accent/50'
      }`}
    >
      <SparkleEffect active={justCompleted} />

      <div className="flex items-start gap-4">
        <button
          onClick={handleToggle}
          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
            completed
              ? 'bg-gold border-gold text-wizard-dark'
              : 'border-wizard-accent/50 hover:border-gold hover:bg-wizard-accent/10'
          }`}
        >
          {completed && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <h4
            className={`font-semibold transition-all ${
              completed ? 'text-gold line-through opacity-75' : 'text-white'
            }`}
          >
            {title}
          </h4>
          <p className="text-sm text-gray-400 mt-1">{description}</p>

          {comment && !showComment && (
            <div className="mt-3 p-2 bg-wizard-dark/50 rounded-lg text-sm text-gray-300 italic">
              "{comment}"
            </div>
          )}

          <button
            onClick={() => setShowComment(!showComment)}
            className="mt-2 text-xs text-wizard-accent hover:text-wizard-glow transition-colors"
          >
            {showComment ? 'Cancel' : comment ? 'Edit Comment' : 'Add Comment'}
          </button>

          {showComment && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={localComment}
                onChange={(e) => setLocalComment(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 bg-wizard-dark border border-wizard-indigo rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wizard-accent"
              />
              <button
                onClick={handleSaveComment}
                className="px-4 py-2 bg-wizard-accent text-white text-sm rounded-lg hover:bg-wizard-glow transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
