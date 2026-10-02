'use client'

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Coffee } from 'lucide-react'

interface FlyingItem {
  id: string
  startX: number
  startY: number
  targetX: number
  targetY: number
  imageUrl?: string | null
}

interface FlyToCartContextType {
  flyToCart: (
    source: HTMLElement | DOMRect | React.MouseEvent | { clientX: number; clientY: number },
    imageUrl?: string | null
  ) => void
}

const FlyToCartContext = createContext<FlyToCartContextType>({
  flyToCart: () => {},
})

export function useFlyToCart() {
  return useContext(FlyToCartContext)
}

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([])

  const flyToCart = useCallback(
    (
      source: HTMLElement | DOMRect | React.MouseEvent | { clientX: number; clientY: number },
      imageUrl?: string | null
    ) => {
      if (typeof window === 'undefined') return

      let startX = 0
      let startY = 0

      if ('clientX' in source && 'clientY' in source) {
        startX = source.clientX
        startY = source.clientY
      } else if ('getBoundingClientRect' in source) {
        const rect = source.getBoundingClientRect()
        startX = rect.left + rect.width / 2
        startY = rect.top + rect.height / 2
      } else if ('left' in source) {
        startX = source.left + source.width / 2
        startY = source.top + source.height / 2
      }

      // Find target: on mobile try #mobile-cart-btn first, otherwise #navbar-cart-btn
      let targetEl = document.getElementById('mobile-cart-btn')
      if (!targetEl || targetEl.offsetParent === null) {
        targetEl = document.getElementById('navbar-cart-btn')
      }

      let targetX = window.innerWidth - 60
      let targetY = 30

      if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect()
        targetX = targetRect.left + targetRect.width / 2
        targetY = targetRect.top + targetRect.height / 2
      }

      const id = `${Date.now()}-${Math.random()}`
      setFlyingItems((prev) => [
        ...prev,
        { id, startX, startY, targetX, targetY, imageUrl },
      ])
    },
    []
  )

  const handleComplete = useCallback((id: string) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id))

    // Trigger bounce on cart icon
    let targetEl = document.getElementById('mobile-cart-btn')
    if (!targetEl || targetEl.offsetParent === null) {
      targetEl = document.getElementById('navbar-cart-btn')
    }
    if (targetEl) {
      targetEl.classList.remove('cart-bounce')
      void targetEl.offsetWidth
      targetEl.classList.add('cart-bounce')
      setTimeout(() => {
        targetEl?.classList.remove('cart-bounce')
      }, 600)
    }

    // Trigger subtle mobile haptic
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15)
      } catch {
        // ignore
      }
    }
  }, [])

  return (
    <FlyToCartContext.Provider value={{ flyToCart }}>
      {children}
      {/* Overlay for flying items */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence>
          {flyingItems.map((item) => {
            const deltaX = item.targetX - item.startX
            const deltaY = item.targetY - item.startY
            // Arc curve: rise upwards first, then curve down/to target
            const midX = deltaX * 0.45
            const midY = Math.min(-60, deltaY * 0.3 - 80)

            return (
              <motion.div
                key={item.id}
                initial={{
                  x: item.startX - 22,
                  y: item.startY - 22,
                  scale: 0.6,
                  opacity: 0.9,
                }}
                animate={{
                  x: [item.startX - 22, item.startX + midX, item.targetX - 22],
                  y: [item.startY - 22, item.startY + midY, item.targetY - 22],
                  scale: [0.6, 1.25, 0.22],
                  opacity: [1, 1, 0.3],
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={() => handleComplete(item.id)}
                style={{
                  position: 'absolute',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d4a04a, #9e5f1a)',
                  boxShadow:
                    '0 0 20px rgba(212, 160, 74, 0.8), 0 4px 12px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.85)',
                  overflow: 'hidden',
                }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Coffee size={22} color="#ffffff" />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </FlyToCartContext.Provider>
  )
}
