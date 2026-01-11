import { Link } from 'react-router-dom'
import { useApp, type SectionKey } from '../context/AppContext'
import { ProgressBar } from '../components/ProgressBar'
import { TutorialBox } from '../components/InfoTooltip'
import { NotificationBell } from '../components/NotificationBell'
import { DisputeCard } from '../components/DisputeCard'
import logo from '../assets/logo.png'

interface Section {
  path: string
  title: string
  subtitle: string
  icon: string
  description: string
  color: string
  tutorial: string
  stateKey: SectionKey
}

const sections: Section[] = [
  {
    path: '/foundry',
    title: 'The Foundry',
    subtitle: 'Entity Creation',
    icon: '🔨',
    description: 'Where your business is forged',
    color: 'from-purple-600 to-indigo-600',
    tutorial: 'Build your LLC foundation - business name, EIN, registered agent, and more.',
    stateKey: 'foundry',
  },
  {
    path: '/identity',
    title: 'Identity',
    subtitle: 'Public Signals',
    icon: '🔍',
    description: 'How the system recognizes you',
    color: 'from-blue-600 to-cyan-600',
    tutorial: 'D-U-N-S, website, socials, directories - your machine-readable footprint.',
    stateKey: 'identity',
  },
  {
    path: '/treasury',
    title: 'The Treasury',
    subtitle: 'Banking & Capital',
    icon: '🏦',
    description: 'Where money lives and moves',
    color: 'from-emerald-600 to-teal-600',
    tutorial: 'Open bank accounts across major institutions to build relationships.',
    stateKey: 'treasury',
  },
  {
    path: '/credit-core',
    title: 'Credit Core',
    subtitle: 'Credit Infrastructure',
    icon: '💳',
    description: 'The engine of leverage',
    color: 'from-zinc-500 to-slate-600',
    tutorial: 'Build credit with cards, Net-30 accounts, and tradelines.',
    stateKey: 'creditCore',
  },
  {
    path: '/control',
    title: 'Control',
    subtitle: 'Risk & Optimization',
    icon: '🎯',
    description: 'Precision management of leverage',
    color: 'from-amber-600 to-yellow-600',
    tutorial: 'Utilization under 30%, payment timing, score optimization.',
    stateKey: 'control',
  },
  {
    path: '/command',
    title: 'Command',
    subtitle: 'Monitoring & Compliance',
    icon: '📡',
    description: 'Long-term operational command',
    color: 'from-stone-500 to-neutral-600',
    tutorial: 'Credit monitoring, tax compliance, financial statements.',
    stateKey: 'command',
  },
  {
    path: '/the-vault',
    title: 'The Vault',
    subtitle: 'Secure Documents',
    icon: '🔐',
    description: 'Your secure document storage',
    color: 'from-violet-600 to-purple-600',
    tutorial: 'Upload ID, SSN, EIN letter, and LLC documents securely.',
    stateKey: 'theVault',
  },
]

const gettingStartedSteps = [
  { title: 'Forge Your Entity', description: 'Summon your LLC into existence. Name it, register it, claim your EIN. Your empire begins here.', icon: '⚒️' },
  { title: 'Secure The Vault', description: 'Lock away your sacred documents. ID, SSN, EIN letter - the keys to your kingdom.', icon: '🔐' },
  { title: 'Establish Your Identity', description: 'Make yourself known to the credit gods. D-U-N-S, website, socials - leave your mark.', icon: '👁️' },
  { title: 'Unlock The Treasury', description: 'Open the gates to major banks. Chase, BofA, Wells Fargo - build your financial alliances.', icon: '🏦' },
  { title: 'Activate Credit Core', description: 'Power up your credit engine. Net-30 tradelines, business cards - stack your arsenal.', icon: '⚡' },
  { title: 'Seize Control', description: 'Master the art of utilization. Keep it under 30%. Pay early. Watch your score rise.', icon: '🎮' },
  { title: 'Command Your Empire', description: 'You did it. Monitor your domain. Maintain compliance. The throne is yours.', icon: '👑' },
]

export default function Dashboard() {
  const {
    clientName,
    isAdmin,
    getOverallProgress,
    foundry,
    identity,
    treasury,
    creditCore,
    control,
    command,
    theVault,
    logout,
  } = useApp()
  const overallProgress = getOverallProgress()

  // Calculate local progress for sections
  const getLocalProgress = (tasks: { completed: boolean }[]) => {
    const completed = tasks.filter((t) => t.completed).length
    return tasks.length > 0 ? (completed / tasks.length) * 100 : 0
  }

  const sectionTasksMap: Record<SectionKey, { completed: boolean }[]> = {
    foundry,
    identity,
    treasury,
    creditCore,
    control,
    command,
    theVault,
  }

  // Calculate completed steps for tutorial
  const completedSteps: number[] = []
  if (getLocalProgress(foundry) === 100) completedSteps.push(0)
  if (getLocalProgress(theVault) === 100) completedSteps.push(1)
  if (getLocalProgress(identity) === 100) completedSteps.push(2)
  if (getLocalProgress(treasury) === 100) completedSteps.push(3)
  if (getLocalProgress(creditCore) === 100) completedSteps.push(4)
  if (getLocalProgress(control) === 100) completedSteps.push(5)
  if (getLocalProgress(command) === 100) completedSteps.push(6)

  const currentStep = completedSteps.length

  const handleLogout = async () => {
    await logout()
    // ProtectedRoute will automatically redirect to "/" when isAuthenticated becomes false
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Credit Wizard" className="w-12 h-12 rounded-lg" />
            <div>
              <h1
                className="text-xl md:text-2xl font-bold bg-gradient-to-r from-vault-silver-light via-vault-accent to-vault-glow bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                FINANCIAL ASCENT
              </h1>
              <p className="text-vault-silver-dark text-sm">
                Welcome, <span className="text-vault-accent font-semibold">{clientName}</span>!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 text-sm text-vault-silver hover:text-white border border-vault-silver/30 hover:border-vault-silver rounded-lg transition-colors flex items-center gap-2"
              >
                <span>⚡</span>
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
            <Link
              to="/calendar"
              className="px-4 py-2 text-sm text-vault-accent hover:text-white border border-vault-accent/50 hover:border-vault-accent rounded-lg transition-colors flex items-center gap-2"
            >
              <span>📅</span>
              <span className="hidden md:inline">Calendar</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-vault-silver-dark hover:text-white border border-vault-silver/20 hover:border-vault-accent rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Overall Progress */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✨</span>
            <h2
              className="text-sm text-white"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              ASCENT PROGRESS
            </h2>
          </div>
          <ProgressBar progress={overallProgress} label="Overall Journey" />
          <p className="text-sm text-vault-silver-dark mt-3">
            {overallProgress < 25 && "Your ascent begins! Complete tasks to unlock your financial potential."}
            {overallProgress >= 25 && overallProgress < 50 && "Great progress! You're building a strong foundation."}
            {overallProgress >= 50 && overallProgress < 75 && "Halfway there! Your credit empire is taking shape."}
            {overallProgress >= 75 && overallProgress < 100 && "Almost there! The summit is in sight."}
            {overallProgress === 100 && "Congratulations! You've completed your Financial Ascent!"}
          </p>
        </div>

        {/* Getting Started Tutorial */}
        <div className="mb-6">
          <TutorialBox
            title="ASCENT ROADMAP"
            steps={gettingStartedSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {/* Dispute Center Card */}
        <div className="mb-6">
          <DisputeCard />
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {sections.map((section) => {
            const tasks = sectionTasksMap[section.stateKey]
            const progress = getLocalProgress(tasks)
            const taskCount = tasks.length

            return (
              <Link
                key={section.path}
                to={section.path}
                className="group rounded-2xl p-6 hover:scale-[1.02] transition-all"
                style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center text-2xl shadow-lg border border-white/10`}>
                    {section.icon}
                  </div>
                  <div className="text-right">
                    <span
                      className="text-vault-accent font-semibold text-xs block"
                      style={{ fontFamily: 'var(--font-pixel)' }}
                    >
                      {Math.round(progress)}%
                    </span>
                    {taskCount > 0 && (
                      <span className="text-xs text-vault-silver-dark">{taskCount} tasks</span>
                    )}
                  </div>
                </div>

                <h3
                  className="text-xs font-semibold text-white group-hover:text-vault-accent transition-colors mb-0.5"
                  style={{ fontFamily: 'var(--font-pixel)' }}
                >
                  {section.title.toUpperCase()}
                </h3>
                <p className="text-xs text-vault-accent/80 mb-2">{section.subtitle}</p>
                <p className="text-xs text-vault-silver-dark">{section.description}</p>
                <p className="text-xs text-vault-silver-dark/70 mt-2 italic">{section.tutorial}</p>

                <div className="mt-4 h-2 bg-vault-black rounded-full overflow-hidden border border-vault-silver/10">
                  <div
                    className={`h-full bg-gradient-to-r ${section.color} rounded-full transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tips Section */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, rgba(26, 21, 37, 0.8) 0%, rgba(18, 16, 26, 0.8) 100%)', border: '1px solid rgba(157, 140, 255, 0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💡</span>
              <h3
                className="text-xs text-vault-accent"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                ASCENT TIP
              </h3>
            </div>
            <p className="text-sm text-vault-silver">
              Complete <strong className="text-vault-accent-light">The Foundry</strong> first to forge your business entity.
              This is the foundation of your entire credit empire!
            </p>
          </div>

          {/* Need Help */}
          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🔮</span>
              <h3
                className="text-xs text-vault-accent"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                NEED GUIDANCE?
              </h3>
            </div>
            <p className="text-sm text-vault-silver-dark">
              Click the glowing orb in the bottom right corner to consult <strong className="text-vault-accent-light">The Oracle</strong> - your AI credit guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
