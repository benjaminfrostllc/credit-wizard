import { useState, useRef, useEffect } from 'react'
import { getOracleResponse } from '../services/oracle'

interface ChatMessage {
  role: 'user' | 'oracle'
  text: string
}

interface TheOracleProps {
  isOpen: boolean
  onClose: () => void
}

export function TheOracle({ isOpen, onClose }: TheOracleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'oracle',
      text: 'Greetings, seeker. I am The Oracle, your mystical guide through the realm of credit repair and business funding. Ask me anything about your journey, and I shall illuminate the path forward.',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    try {
      const response = await getOracleResponse(userMessage, messages)
      setMessages((prev) => [...prev, { role: 'oracle', text: response }])
    } catch (error) {
      console.error('Oracle error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'oracle',
          text: 'A disturbance in the magical realm prevents my response. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-gradient-to-b from-wizard-purple to-wizard-dark rounded-2xl border border-oracle-blue/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-wizard-indigo/50 border-b border-oracle-blue/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-oracle-glow to-oracle-blue animate-pulse shadow-lg shadow-oracle-blue/30" />
            <div>
              <h3 className="font-bold text-white">The Oracle</h3>
              <p className="text-xs text-oracle-glow">AI Credit Guide • GPT-4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-wizard-accent text-white rounded-br-none'
                    : 'bg-wizard-indigo/50 text-gray-200 rounded-bl-none border border-oracle-blue/30'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-wizard-indigo/50 text-gray-200 rounded-2xl rounded-bl-none border border-oracle-blue/30 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-oracle-glow rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-oracle-glow rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-oracle-glow rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-wizard-indigo/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask The Oracle..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-wizard-dark border border-wizard-indigo rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-oracle-blue disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-oracle-blue text-white rounded-xl hover:bg-oracle-glow transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
