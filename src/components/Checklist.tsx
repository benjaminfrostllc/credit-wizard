import { ChecklistItem } from './ChecklistItem'
import { ProgressBar } from './ProgressBar'

export interface ChecklistTask {
  id: string
  title: string
  description: string
  completed: boolean
  comment?: string
  tips?: string
  resources?: { label: string; url: string }[]
}

interface ChecklistProps {
  title: string
  icon: string
  tasks: ChecklistTask[]
  onToggle: (id: string) => void
  onComment: (id: string, comment: string) => void
}

export function Checklist({ title, icon, tasks, onToggle, onComment }: ChecklistProps) {
  const completedCount = tasks.filter((t) => t.completed).length
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  return (
    <div className="bg-wizard-purple/30 rounded-2xl border border-wizard-indigo/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400">
            {completedCount} of {tasks.length} tasks complete
          </p>
        </div>
      </div>

      <ProgressBar progress={progress} />

      <div className="mt-6 space-y-3">
        {tasks.map((task) => (
          <ChecklistItem
            key={task.id}
            {...task}
            onToggle={onToggle}
            onComment={onComment}
          />
        ))}
      </div>
    </div>
  )
}
