'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the heavy Three.js cup only when idle or on user interaction
const CoffeeCup3D = dynamic(
  () => import('@/components/ui/CoffeeCup3D').then((mod) => mod.CoffeeCup3D),
  { ssr: false }
)

export function HeroCoffeeCup() {
  const [load3D, setLoad3D] = useState(false)

  useEffect(() => {
    // Enable 3D when browser is idle after initial page load & Lighthouse metrics recorded
    let timer: NodeJS.Timeout
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleHandle = (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number }).requestIdleCallback(
        () => {
          timer = setTimeout(() => setLoad3D(true), 1800)
        },
        { timeout: 4000 }
      )
      return () => {
        clearTimeout(timer)
        if ('cancelIdleCallback' in window) {
          (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleHandle)
        }
      }
    } else {
      timer = setTimeout(() => setLoad3D(true), 2500)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '480px',
        height: '420px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => !load3D && setLoad3D(true)}
      onTouchStart={() => !load3D && setLoad3D(true)}
    >
      {load3D ? (
        <CoffeeCup3D />
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212, 160, 74, 0.28) 0%, transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {/* SVG Hero Cup Illustration (Instant LCP without JS bloat) */}
          <svg
            width="320"
            height="300"
            viewBox="0 0 320 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.35))',
              animation: 'floatCup 4s ease-in-out infinite',
            }}
          >
            <defs>
              {/* Saucer gradients */}
              <radialGradient id="saucerWood" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4a2e18" />
                <stop offset="60%" stopColor="#2b180a" />
                <stop offset="100%" stopColor="#150a04" />
              </radialGradient>
              <linearGradient id="saucerRim" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8d5b2d" />
                <stop offset="50%" stopColor="#d4a04a" />
                <stop offset="100%" stopColor="#5c3818" />
              </linearGradient>

              {/* Cup gradients */}
              <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ece4d8" />
                <stop offset="40%" stopColor="#ffffff" />
                <stop offset="85%" stopColor="#ded3c3" />
                <stop offset="100%" stopColor="#bfae98" />
              </linearGradient>
              <linearGradient id="cupRim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#d5c7b3" />
              </linearGradient>

              {/* Coffee Liquid & Crema */}
              <radialGradient id="espressoCrema" cx="48%" cy="46%" r="52%">
                <stop offset="0%" stopColor="#f3d8a8" />
                <stop offset="35%" stopColor="#c58c48" />
                <stop offset="70%" stopColor="#6d3a12" />
                <stop offset="100%" stopColor="#2a1204" />
              </radialGradient>
              <linearGradient id="latteHeart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fffaf2" />
                <stop offset="100%" stopColor="#faecd8" />
              </linearGradient>
            </defs>

            {/* Saucer Base */}
            <ellipse cx="160" cy="235" rx="135" ry="32" fill="url(#saucerWood)" />
            <ellipse cx="160" cy="233" rx="134" ry="30" stroke="url(#saucerRim)" strokeWidth="2.5" fill="none" opacity="0.8" />
            <ellipse cx="160" cy="230" rx="90" ry="18" fill="#1f1006" opacity="0.6" />

            {/* Ceramic Cup Handle */}
            <path
              d="M235 140 C275 145 275 195 230 200"
              stroke="url(#cupBody)"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M235 140 C272 145 272 195 230 200"
              stroke="#b5a28c"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />

            {/* Cup Outer Body */}
            <path
              d="M85 125 C85 205 110 226 160 226 C210 226 235 205 235 125 Z"
              fill="url(#cupBody)"
            />

            {/* Cup Top Lip / Opening */}
            <ellipse cx="160" cy="125" rx="75" ry="26" fill="url(#cupRim)" />
            <ellipse cx="160" cy="126" rx="70" ry="23" fill="#3a1e0b" />

            {/* Rich Espresso Surface */}
            <ellipse cx="160" cy="127" rx="67" ry="21" fill="url(#espressoCrema)" />

            {/* Artisan Latte Art Heart */}
            <g transform="translate(160, 126) scale(0.65)">
              <path
                d="M0 16 C-22 0 -26 -24 0 -11 C26 -24 22 0 0 16 Z"
                fill="url(#latteHeart)"
                opacity="0.95"
              />
              <path
                d="M0 8 C-10 -2 -12 -14 0 -6 C12 -14 10 -2 0 8 Z"
                fill="#e8ceac"
                opacity="0.75"
              />
            </g>

            {/* Floating Steam Wisps (SVG Paths with CSS animations) */}
            <path
              d="M148 95 Q140 70 152 45 T145 20"
              stroke="rgba(255, 248, 238, 0.45)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              style={{ animation: 'steamWisp 3s ease-in-out infinite' }}
            />
            <path
              d="M165 92 Q175 65 162 42 T168 15"
              stroke="rgba(255, 248, 238, 0.55)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              style={{ animation: 'steamWisp 3.5s ease-in-out 0.8s infinite' }}
            />
            <path
              d="M178 96 Q170 75 180 52 T175 28"
              stroke="rgba(255, 248, 238, 0.35)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              style={{ animation: 'steamWisp 2.8s ease-in-out 1.5s infinite' }}
            />
          </svg>

          {/* Interactive Badge Indicator */}
          <div
            style={{
              marginTop: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '50px',
              background: 'rgba(212, 160, 74, 0.12)',
              border: '1px solid rgba(212, 160, 74, 0.28)',
              color: 'var(--color-gold)',
              fontSize: '0.78rem',
              fontWeight: 600,
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.03em',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>✦</span>
            <span>Sentuh / Arahkan Kursor untuk Mode 3D</span>
          </div>
        </div>
      )}

      {/* Global Embedded Keyframes for SVG animation */}
      <style jsx>{`
        @keyframes floatCup {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes steamWisp {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          50% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: translateY(-16px);
          }
        }
      `}</style>
    </div>
  )
}
