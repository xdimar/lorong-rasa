'use client'

import { CSSProperties } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

type AnimationType = 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'zoom-in' | 'slide-up'

interface AnimateOnScrollProps {
  children: React.ReactNode
  animation?: AnimationType
  delay?: number
  duration?: number
  className?: string
  style?: CSSProperties
  threshold?: number
  /** Jika true, animasi akan berulang setiap kali elemen masuk/keluar viewport */
  repeat?: boolean
}

const animations: Record<AnimationType, { hidden: CSSProperties; visible: CSSProperties }> = {
  'fade-up': {
    hidden: { opacity: 0, transform: 'translateY(48px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
  'fade-in': {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  'fade-left': {
    hidden: { opacity: 0, transform: 'translateX(-48px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  'fade-right': {
    hidden: { opacity: 0, transform: 'translateX(48px)' },
    visible: { opacity: 1, transform: 'translateX(0)' },
  },
  'zoom-in': {
    hidden: { opacity: 0, transform: 'scale(0.82)' },
    visible: { opacity: 1, transform: 'scale(1)' },
  },
  'slide-up': {
    hidden: { opacity: 0, transform: 'translateY(70px)' },
    visible: { opacity: 1, transform: 'translateY(0)' },
  },
}

export function AnimateOnScroll({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 650,
  className,
  style,
  threshold,
  repeat = false,
}: AnimateOnScrollProps) {
  // Gunakan once=false agar bisa animasi keluar-masuk
  const { ref, isVisible } = useScrollAnimation({ threshold, once: !repeat })
  const anim = animations[animation]

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...(isVisible ? anim.visible : anim.hidden),
        transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
