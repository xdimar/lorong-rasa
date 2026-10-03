'use client'

import React, { useState } from 'react'

interface DynamicCoffeeLogoProps {
  scrolled?: boolean
  className?: string
}

export function DynamicCoffeeLogo({ scrolled = false, className = '' }: DynamicCoffeeLogoProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`dynamic-coffee-logo ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: scrolled ? '38px' : '44px',
        height: scrolled ? '38px' : '44px',
        borderRadius: scrolled ? '12px' : '14px',
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        boxShadow: isHovered
          ? '0 8px 24px var(--color-primary-glow), 0 0 16px rgba(212, 160, 74, 0.4)'
          : scrolled
          ? '0 4px 14px var(--color-primary-glow)'
          : '0 6px 20px var(--color-primary-glow)',
        border: '1px solid rgba(255, 255, 255, 0.22)',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isHovered
          ? 'translateY(-2px) scale(1.08) rotate(-3deg)'
          : scrolled
          ? 'scale(0.95)'
          : 'scale(1)',
        cursor: 'pointer',
        overflow: 'visible',
      }}
    >
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: scrolled ? '24px' : '28px',
          height: scrolled ? '24px' : '28px',
          transition: 'all 0.35s ease',
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Clip path for the interior of the coffee cup */}
          <clipPath id="coffee-cup-interior">
            <path d="M12 21 H28 L26.2 31.5 C26 33.2 24.6 34.5 22.8 34.5 H17.2 C15.4 34.5 14 33.2 13.8 31.5 Z" />
          </clipPath>

          {/* Coffee liquid gradient */}
          <linearGradient id="coffee-liquid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a04a" />
            <stop offset="45%" stopColor="#8c4e20" />
            <stop offset="100%" stopColor="#3d1d0c" />
          </linearGradient>

          {/* Crema foam gradient */}
          <linearGradient id="crema-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255, 238, 209, 0.9)" />
            <stop offset="50%" stopColor="rgba(244, 203, 138, 0.95)" />
            <stop offset="100%" stopColor="rgba(255, 238, 209, 0.85)" />
          </linearGradient>
        </defs>

        {/* --- 1. Organic Rising Steam Trails --- */}
        <g className="steam-group">
          {/* Steam Left */}
          <path
            d="M16 16 C14 13 18 10 16 7 C14.5 4.5 17 2 16 0.5"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            style={{
              animation: `steamFloat 2.4s ease-in-out infinite`,
              transformOrigin: '16px 16px',
            }}
          />
          {/* Steam Center (Taller) */}
          <path
            d="M20 15 C22.5 12 18.5 8.5 21 5 C22.5 2.5 19.5 0.5 20.5 -1.5"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            style={{
              animation: `steamFloat 2.8s ease-in-out infinite 0.4s`,
              transformOrigin: '20px 15px',
            }}
          />
          {/* Steam Right */}
          <path
            d="M24 16 C26 13 22 10 24 7 C25.5 4.5 23 2 24 0.5"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            style={{
              animation: `steamFloat 2.2s ease-in-out infinite 0.8s`,
              transformOrigin: '24px 16px',
            }}
          />
        </g>

        {/* --- 2. Liquid Wave Inside Cup (Clipped) --- */}
        <g clipPath="url(#coffee-cup-interior)">
          {/* Deep Base Liquid */}
          <rect x="10" y="21" width="22" height="15" fill="url(#coffee-liquid-grad)" />

          {/* Primary Rolling Liquid Wave */}
          <path
            d="M -10 24.5 Q -3 22, 4 24.5 T 18 24.5 T 32 24.5 T 46 24.5 T 60 24.5 V 36 H -10 Z"
            fill="url(#coffee-liquid-grad)"
            opacity="0.95"
            style={{
              animation: isHovered ? 'waveMove 1.4s linear infinite' : 'waveMove 3.2s linear infinite',
            }}
          />

          {/* Secondary Golden Crema Wave (Slightly offset) */}
          <path
            d="M -10 25.2 Q -4 23.5, 3 25.2 T 17 25.2 T 31 25.2 T 45 25.2 T 59 25.2 V 36 H -10 Z"
            fill="url(#crema-grad)"
            opacity="0.45"
            style={{
              animation: isHovered ? 'waveMoveReverse 1.8s linear infinite' : 'waveMoveReverse 4s linear infinite',
            }}
          />

          {/* Micro Latte Art Heart (Gently Bobs on Wave) */}
          <g
            style={{
              animation: 'latteBob 2.5s ease-in-out infinite',
              transformOrigin: '20px 24px',
            }}
          >
            <path
              d="M20 23.2 C19.2 22 17.8 22.3 18.2 23.5 C18.5 24.3 20 25.6 20 25.6 C20 25.6 21.5 24.3 21.8 23.5 C22.2 22.3 20.8 22 20 23.2 Z"
              fill="rgba(255, 245, 230, 0.92)"
              filter="drop-shadow(0 1px 1px rgba(0,0,0,0.25))"
            />
          </g>
        </g>

        {/* --- 3. Coffee Cup Ceramic Body & Saucer Outline --- */}
        {/* Cup Handle */}
        <path
          d="M26.5 23 C29.8 23 32 25 32 27.5 C32 30 29.5 31.8 25.5 31.8"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cup Body Silhouette */}
        <path
          d="M11 20.5 H29 L26.8 32 C26.5 33.6 25 34.8 23.2 34.8 H16.8 C15 34.8 13.5 33.6 13.2 32 Z"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Saucer Base */}
        <path
          d="M10 38.5 Q20 39.8 30 38.5"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Subtle Rim Specular Reflection */}
        <path
          d="M13.5 21.5 H19"
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
