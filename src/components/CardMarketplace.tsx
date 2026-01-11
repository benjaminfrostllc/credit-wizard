import { useState } from 'react'

interface CardOffer {
  id: string
  name: string
  issuer: string
  issuerLogo: string
  issuerColor: string
  type: 'business' | 'personal'
  introApr: number
  introAprMonths: number
  regularApr: { min: number; max: number }
  annualFee: number
  creditLimit: { min: number; max: number }
  rewards?: string
  signupBonus?: string
  features: string[]
  requirements: {
    minScore: number
    businessAge?: number
    annualRevenue?: number
  }
  recommended?: boolean
}

const cardOffers: CardOffer[] = [
  {
    id: 'chase-ink-unlimited',
    name: 'Ink Business Unlimited',
    issuer: 'Chase',
    issuerLogo: '🏦',
    issuerColor: '#117ACA',
    type: 'business',
    introApr: 0,
    introAprMonths: 12,
    regularApr: { min: 18.49, max: 24.49 },
    annualFee: 0,
    creditLimit: { min: 5000, max: 50000 },
    rewards: '1.5% cash back on all purchases',
    signupBonus: '$750 bonus after $6,000 spend in 3 months',
    features: ['No annual fee', 'Employee cards at no extra cost', 'Purchase protection', 'Extended warranty'],
    requirements: { minScore: 680, businessAge: 6 },
    recommended: true,
  },
  {
    id: 'amex-blue-business',
    name: 'Blue Business Plus',
    issuer: 'American Express',
    issuerLogo: '💎',
    issuerColor: '#006FCF',
    type: 'business',
    introApr: 0,
    introAprMonths: 12,
    regularApr: { min: 18.49, max: 26.49 },
    annualFee: 0,
    creditLimit: { min: 5000, max: 50000 },
    rewards: '2X points on first $50K, then 1X',
    features: ['No annual fee', 'Flexible spending limit', 'Expense management tools'],
    requirements: { minScore: 670 },
  },
  {
    id: 'capital-one-spark',
    name: 'Spark Cash Plus',
    issuer: 'Capital One',
    issuerLogo: '💳',
    issuerColor: '#D03027',
    type: 'business',
    introApr: 0,
    introAprMonths: 9,
    regularApr: { min: 0, max: 0 },
    annualFee: 150,
    creditLimit: { min: 10000, max: 100000 },
    rewards: '2% cash back on all purchases',
    signupBonus: '$1,200 bonus after $30,000 spend in 3 months',
    features: ['Unlimited 2% cash back', 'No preset spending limit', '$200 annual bonus for $200K+ spend'],
    requirements: { minScore: 720, annualRevenue: 100000 },
  },
  {
    id: 'bofa-business-advantage',
    name: 'Business Advantage Unlimited',
    issuer: 'Bank of America',
    issuerLogo: '🔴',
    issuerColor: '#012169',
    type: 'business',
    introApr: 0,
    introAprMonths: 9,
    regularApr: { min: 17.49, max: 27.49 },
    annualFee: 0,
    creditLimit: { min: 3000, max: 25000 },
    rewards: '1.5% cash back on all purchases',
    signupBonus: '$300 bonus after $3,000 spend in 90 days',
    features: ['No annual fee', 'Preferred Rewards bonus', 'Free employee cards'],
    requirements: { minScore: 650 },
  },
  {
    id: 'citi-double-cash',
    name: 'Citi Double Cash Business',
    issuer: 'Citi',
    issuerLogo: '🔵',
    issuerColor: '#003B70',
    type: 'business',
    introApr: 0,
    introAprMonths: 18,
    regularApr: { min: 19.24, max: 29.24 },
    annualFee: 0,
    creditLimit: { min: 5000, max: 30000 },
    rewards: '2% cash back (1% on purchase, 1% on payment)',
    features: ['18-month 0% APR', 'No annual fee', 'Citi Entertainment access'],
    requirements: { minScore: 680 },
  },
  {
    id: 'wells-fargo-signify',
    name: 'Signify Business Cash',
    issuer: 'Wells Fargo',
    issuerLogo: '🟡',
    issuerColor: '#D71E28',
    type: 'business',
    introApr: 0,
    introAprMonths: 12,
    regularApr: { min: 18.24, max: 28.24 },
    annualFee: 0,
    creditLimit: { min: 5000, max: 25000 },
    rewards: '2% on qualified purchases',
    signupBonus: '$500 bonus after $5,000 spend in 3 months',
    features: ['No annual fee', 'Cell phone protection', 'Free employee cards'],
    requirements: { minScore: 670 },
  },
  {
    id: 'discover-it-business',
    name: 'Discover it Business',
    issuer: 'Discover',
    issuerLogo: '🟠',
    issuerColor: '#FF6000',
    type: 'business',
    introApr: 0,
    introAprMonths: 12,
    regularApr: { min: 17.99, max: 26.99 },
    annualFee: 0,
    creditLimit: { min: 2000, max: 20000 },
    rewards: '1.5% cash back + match first year',
    features: ['Cashback Match first year', 'No annual fee', 'Free FICO score'],
    requirements: { minScore: 640 },
  },
  {
    id: 'us-bank-triple-cash',
    name: 'Triple Cash Rewards',
    issuer: 'US Bank',
    issuerLogo: '🏛️',
    issuerColor: '#0C2340',
    type: 'business',
    introApr: 0,
    introAprMonths: 15,
    regularApr: { min: 19.24, max: 28.24 },
    annualFee: 0,
    creditLimit: { min: 3000, max: 25000 },
    rewards: '3% on eligible categories, 1% on all else',
    signupBonus: '$500 bonus after $4,500 spend in 150 days',
    features: ['15-month 0% APR', 'No annual fee', 'Mobile pay rewards'],
    requirements: { minScore: 660 },
  },
]

interface Props {
  userCreditScore?: number
}

export function CardMarketplace({ userCreditScore = 700 }: Props) {
  const [selectedCard, setSelectedCard] = useState<CardOffer | null>(null)
  const [filter, setFilter] = useState<'all' | 'recommended' | 'no-fee'>('all')
  const [sortBy, setSortBy] = useState<'intro-period' | 'credit-limit' | 'rewards'>('intro-period')
  const [preparedCards, setPreparedCards] = useState<Set<string>>(new Set())

  const getApprovalOdds = (card: CardOffer): { label: string; color: string; percent: number } => {
    const scoreDiff = userCreditScore - card.requirements.minScore
    if (scoreDiff >= 50) return { label: 'Excellent', color: 'text-green-400', percent: 90 }
    if (scoreDiff >= 20) return { label: 'Very Good', color: 'text-green-400', percent: 75 }
    if (scoreDiff >= 0) return { label: 'Good', color: 'text-yellow-400', percent: 60 }
    if (scoreDiff >= -30) return { label: 'Fair', color: 'text-orange-400', percent: 40 }
    return { label: 'Low', color: 'text-red-400', percent: 20 }
  }

  const filteredCards = cardOffers
    .filter(card => {
      if (filter === 'recommended') return card.recommended
      if (filter === 'no-fee') return card.annualFee === 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'intro-period') return b.introAprMonths - a.introAprMonths
      if (sortBy === 'credit-limit') return b.creditLimit.max - a.creditLimit.max
      return 0
    })

  const togglePrepare = (cardId: string) => {
    setPreparedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-pixel)' }}>
            0% APR CARD OFFERS
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Pre-qualified offers based on your credit profile
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 bg-wizard-purple/30 border border-wizard-silver/20 rounded-lg text-white text-sm"
          >
            <option value="all">All Cards</option>
            <option value="recommended">Recommended</option>
            <option value="no-fee">No Annual Fee</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-wizard-purple/30 border border-wizard-silver/20 rounded-lg text-white text-sm"
          >
            <option value="intro-period">Longest 0% Period</option>
            <option value="credit-limit">Highest Limit</option>
          </select>
        </div>
      </div>

      {/* Prepared Cards Summary */}
      {preparedCards.size > 0 && (
        <div className="bg-gradient-to-r from-wizard-accent/20 to-wizard-glow/20 rounded-xl p-4 border border-wizard-accent/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎯</span>
            <span className="font-semibold text-wizard-accent">Cards You're Preparing For</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(preparedCards).map(cardId => {
              const card = cardOffers.find(c => c.id === cardId)
              if (!card) return null
              return (
                <span
                  key={cardId}
                  className="px-3 py-1 bg-wizard-accent/20 rounded-full text-sm text-wizard-accent-light"
                >
                  {card.issuer} {card.name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCards.map(card => {
          const odds = getApprovalOdds(card)
          const isPrepared = preparedCards.has(card.id)

          return (
            <div
              key={card.id}
              className="relative rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all"
              style={{ background: 'linear-gradient(145deg, #1a1525 0%, #12101a 100%)', border: '1px solid rgba(192, 192, 192, 0.2)' }}
              onClick={() => setSelectedCard(card)}
            >
              {card.recommended && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-wizard-accent to-wizard-glow text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  RECOMMENDED
                </div>
              )}

              <div className="p-5">
                {/* Card Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: card.issuerColor + '20', border: `2px solid ${card.issuerColor}` }}
                  >
                    {card.issuerLogo}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{card.name}</h3>
                    <p className="text-sm text-gray-400">{card.issuer}</p>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{card.introAprMonths}</div>
                    <div className="text-xs text-gray-400">Months 0%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">${(card.creditLimit.max / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-gray-400">Max Limit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: card.annualFee === 0 ? '#4ade80' : '#fbbf24' }}>
                      ${card.annualFee}
                    </div>
                    <div className="text-xs text-gray-400">Annual Fee</div>
                  </div>
                </div>

                {/* Rewards */}
                {card.rewards && (
                  <p className="text-sm text-wizard-accent mb-3">{card.rewards}</p>
                )}

                {/* Approval Odds */}
                <div className="flex items-center justify-between pt-3 border-t border-wizard-silver/10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Approval Odds:</span>
                    <span className={`font-semibold ${odds.color}`}>{odds.label}</span>
                  </div>
                  <div className="w-20 h-2 bg-wizard-black rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-wizard-accent to-wizard-glow rounded-full"
                      style={{ width: `${odds.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex border-t border-wizard-silver/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(card.issuer + ' ' + card.name + ' apply')}`, '_blank')
                  }}
                  className="flex-1 py-3 text-center text-sm font-semibold text-wizard-accent hover:bg-wizard-accent/10 transition-colors"
                >
                  Apply Now
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePrepare(card.id)
                  }}
                  className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                    isPrepared
                      ? 'bg-wizard-accent/20 text-wizard-accent'
                      : 'text-gray-400 hover:bg-wizard-purple/30'
                  }`}
                >
                  {isPrepared ? '✓ Preparing' : 'Prepare to Apply'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-wizard-dark rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ border: '1px solid rgba(192, 192, 192, 0.3)' }}
          >
            {/* Header */}
            <div
              className="p-6 rounded-t-2xl"
              style={{ background: `linear-gradient(135deg, ${selectedCard.issuerColor}40 0%, transparent 100%)` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: selectedCard.issuerColor + '30', border: `2px solid ${selectedCard.issuerColor}` }}
                >
                  {selectedCard.issuerLogo}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">{selectedCard.name}</h2>
                  <p className="text-gray-400">{selectedCard.issuer}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getApprovalOdds(selectedCard).color} bg-black/30`}>
                      {getApprovalOdds(selectedCard).label} Approval Odds
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Key Terms */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">KEY TERMS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-wizard-purple/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-400">{selectedCard.introAprMonths} months</div>
                    <div className="text-xs text-gray-400">0% Intro APR</div>
                  </div>
                  <div className="bg-wizard-purple/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">{selectedCard.regularApr.min}%-{selectedCard.regularApr.max}%</div>
                    <div className="text-xs text-gray-400">Regular APR</div>
                  </div>
                  <div className="bg-wizard-purple/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-white">${selectedCard.creditLimit.min.toLocaleString()}-${selectedCard.creditLimit.max.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Credit Limit Range</div>
                  </div>
                  <div className="bg-wizard-purple/20 rounded-lg p-3">
                    <div className="text-2xl font-bold" style={{ color: selectedCard.annualFee === 0 ? '#4ade80' : '#fbbf24' }}>
                      ${selectedCard.annualFee}/yr
                    </div>
                    <div className="text-xs text-gray-400">Annual Fee</div>
                  </div>
                </div>
              </div>

              {/* Signup Bonus */}
              {selectedCard.signupBonus && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span>🎁</span>
                    <span className="font-semibold text-yellow-400">Welcome Offer</span>
                  </div>
                  <p className="text-white">{selectedCard.signupBonus}</p>
                </div>
              )}

              {/* Features */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">FEATURES</h3>
                <ul className="space-y-2">
                  {selectedCard.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-white">
                      <span className="text-green-400">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">REQUIREMENTS</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Minimum Credit Score</span>
                    <span className={userCreditScore >= selectedCard.requirements.minScore ? 'text-green-400' : 'text-red-400'}>
                      {selectedCard.requirements.minScore}+ {userCreditScore >= selectedCard.requirements.minScore ? '✓' : '✗'}
                    </span>
                  </div>
                  {selectedCard.requirements.businessAge && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Business Age</span>
                      <span className="text-white">{selectedCard.requirements.businessAge}+ months</span>
                    </div>
                  )}
                  {selectedCard.requirements.annualRevenue && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Annual Revenue</span>
                      <span className="text-white">${selectedCard.requirements.annualRevenue.toLocaleString()}+</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedCard.issuer + ' ' + selectedCard.name + ' apply')}`, '_blank')
                }}
                className="flex-1 py-3 bg-gradient-to-r from-wizard-accent to-wizard-glow text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Apply Now
              </button>
              <button
                onClick={() => {
                  togglePrepare(selectedCard.id)
                  setSelectedCard(null)
                }}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  preparedCards.has(selectedCard.id)
                    ? 'bg-wizard-accent/20 text-wizard-accent border border-wizard-accent/50'
                    : 'bg-wizard-purple/30 text-white border border-wizard-silver/20'
                }`}
              >
                {preparedCards.has(selectedCard.id) ? '✓ Preparing' : 'Prepare to Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
