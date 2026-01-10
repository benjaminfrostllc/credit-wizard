interface PixelCoinProps {
  size?: number
  className?: string
}

export function PixelCoin({ size = 64, className = '' }: PixelCoinProps) {
  // 16x16 pixel art bronze coin, scaled to desired size
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Outer dark edge */}
      <rect x="5" y="0" width="6" height="1" fill="#5C4033" />
      <rect x="3" y="1" width="2" height="1" fill="#5C4033" />
      <rect x="11" y="1" width="2" height="1" fill="#5C4033" />
      <rect x="2" y="2" width="1" height="1" fill="#5C4033" />
      <rect x="13" y="2" width="1" height="1" fill="#5C4033" />
      <rect x="1" y="3" width="1" height="2" fill="#5C4033" />
      <rect x="14" y="3" width="1" height="2" fill="#5C4033" />
      <rect x="0" y="5" width="1" height="6" fill="#5C4033" />
      <rect x="15" y="5" width="1" height="6" fill="#5C4033" />
      <rect x="1" y="11" width="1" height="2" fill="#5C4033" />
      <rect x="14" y="11" width="1" height="2" fill="#5C4033" />
      <rect x="2" y="13" width="1" height="1" fill="#5C4033" />
      <rect x="13" y="13" width="1" height="1" fill="#5C4033" />
      <rect x="3" y="14" width="2" height="1" fill="#5C4033" />
      <rect x="11" y="14" width="2" height="1" fill="#5C4033" />
      <rect x="5" y="15" width="6" height="1" fill="#5C4033" />

      {/* Main bronze fill */}
      <rect x="5" y="1" width="6" height="1" fill="#CD7F32" />
      <rect x="3" y="2" width="10" height="1" fill="#CD7F32" />
      <rect x="2" y="3" width="12" height="2" fill="#CD7F32" />
      <rect x="1" y="5" width="14" height="6" fill="#CD7F32" />
      <rect x="2" y="11" width="12" height="2" fill="#CD7F32" />
      <rect x="3" y="13" width="10" height="1" fill="#CD7F32" />
      <rect x="5" y="14" width="6" height="1" fill="#CD7F32" />

      {/* Highlight (top-left shine) */}
      <rect x="5" y="2" width="4" height="1" fill="#E8A862" />
      <rect x="3" y="3" width="3" height="1" fill="#E8A862" />
      <rect x="2" y="4" width="2" height="1" fill="#E8A862" />
      <rect x="2" y="5" width="1" height="3" fill="#E8A862" />
      <rect x="3" y="4" width="1" height="2" fill="#F4C486" />

      {/* Shadow (bottom-right) */}
      <rect x="12" y="10" width="2" height="1" fill="#8B5A2B" />
      <rect x="13" y="8" width="1" height="2" fill="#8B5A2B" />
      <rect x="11" y="11" width="2" height="1" fill="#8B5A2B" />
      <rect x="10" y="12" width="2" height="1" fill="#8B5A2B" />
      <rect x="8" y="13" width="3" height="1" fill="#8B5A2B" />

      {/* Center "C" for Credit */}
      <rect x="6" y="5" width="1" height="6" fill="#5C4033" />
      <rect x="7" y="4" width="3" height="1" fill="#5C4033" />
      <rect x="7" y="11" width="3" height="1" fill="#5C4033" />
      <rect x="10" y="5" width="1" height="2" fill="#5C4033" />
      <rect x="10" y="9" width="1" height="2" fill="#5C4033" />
    </svg>
  )
}

export function PixelCoinAnimated({ size = 64, className = '' }: PixelCoinProps) {
  return (
    <div className={`inline-block animate-bounce ${className}`} style={{ animationDuration: '2s' }}>
      <PixelCoin size={size} />
    </div>
  )
}
