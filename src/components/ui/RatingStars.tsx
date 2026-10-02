'use client'

import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { RATING_LABELS } from '@/lib/reviews'

interface RatingStarsProps {
  rating: number // 1 to 5
  interactive?: boolean
  onChange?: (rating: number) => void
  size?: number
  showScore?: boolean
  showCount?: boolean
  count?: number
  showLabel?: boolean
}

export function RatingStars({
  rating,
  interactive = false,
  onChange,
  size = 16,
  showScore = false,
  showCount = false,
  count = 0,
  showLabel = false,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const activeRating = interactive && hoverRating !== null ? hoverRating : rating

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: interactive ? '4px' : '2px',
        }}
        role={interactive ? 'group' : undefined}
        aria-label={interactive ? 'Pilih rating' : `Rating: ${rating} dari 5 bintang`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating
          const isHovered = interactive && hoverRating === star

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(star)}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              aria-label={interactive ? RATING_LABELS[star] : (rating + ' Bintang')}
              style={{
                background: 'none',
                border: 'none',
                padding: interactive ? '2px' : 0,
                cursor: interactive ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFilled ? 'var(--color-gold)' : 'var(--color-border)',
                transition: isHovered ? 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), color 0.15s ease' : 'transform 0.2s cubic-bezier(0.4,0,0.2,1), color 0.15s ease',
                transform: interactive && hoverRating === star ? 'scale(1.28)' : 'scale(1)',
                pointerEvents: interactive ? undefined : 'none',
              }}
            >
              <Star
                size={size}
                style={{
                  fill: isFilled ? 'var(--color-gold)' : 'transparent',
                  stroke: isFilled ? 'var(--color-gold)' : 'var(--color-border)',
                  strokeWidth: 1.8,
                  transition: 'fill 0.15s ease, stroke 0.15s ease',
                }}
              />
            </button>
          )
        })}
      </div>

      {showScore && (
        <span
          style={{
            fontWeight: 800,
            fontSize: size >= 18 ? '0.95rem' : '0.82rem',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-inter)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rating > 0 ? rating.toFixed(1) : '-'}
        </span>
      )}

      {showCount && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-inter)',
          }}
        >
          ({count})
        </span>
      )}

      {showLabel && activeRating > 0 && (
        <React.Fragment key={activeRating}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--color-gold)',
              marginLeft: '4px',
              fontFamily: 'var(--font-inter)',
              animation: 'fadeIn 0.18s ease forwards',
            }}
          >
            {RATING_LABELS[activeRating] || ''}
          </span>
        </React.Fragment>
      )}
    </div>
  )
}
