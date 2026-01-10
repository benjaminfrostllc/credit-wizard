import { useEffect, useState, useRef } from 'react'

interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  delay: number
}

export function SparkleEffect({ active }: { active: boolean }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (active) {
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.5,
      }))
      // Use requestAnimationFrame to batch the state update
      requestAnimationFrame(() => {
        setSparkles(newSparkles)
      })

      timerRef.current = setTimeout(() => setSparkles([]), 1500)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [active])

  if (!active || sparkles.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            animationDelay: `${sparkle.delay}s`,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <path
              d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
              fill="#fbbf24"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
