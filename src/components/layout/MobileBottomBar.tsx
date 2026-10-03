'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coffee, Tag, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/components/providers/CartProvider'

export function MobileBottomBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { totalItems, isCartOpen, toggleCart } = useCart()
  const [isMobile, setIsMobile] = useState(false)

  // Deteksi ukuran layar — hanya aktif di smartphone (< 768px), sembunyikan di tablet & desktop
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Sembunyikan jika di halaman admin, login, register, ATAU jika bukan perangkat mobile ponsel
  if (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    !isMobile
  ) {
    return null
  }

  const isHome = pathname === '/'
  const isMenu = pathname.startsWith('/menu')
  const isProfile = pathname.startsWith('/profile')

  const handleVoucherClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault()
      const el = document.getElementById('voucher')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      } else {
        router.push('/#voucher')
      }
    } else {
      router.push('/#voucher')
    }
  }

  // Gaya seragam untuk setiap slot icon kaca bernuansa warm amber/espresso
  const getSlotStyle = (isActive: boolean) => ({
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    background: isActive
      ? 'linear-gradient(135deg, rgba(212, 160, 74, 0.32), rgba(196, 122, 46, 0.18))'
      : 'transparent',
    border: isActive
      ? '1.5px solid rgba(212, 160, 74, 0.65)'
      : '1.5px solid transparent',
    color: isActive ? '#ffffff' : 'rgba(245, 230, 210, 0.78)',
    boxShadow: isActive
      ? '0 0 16px rgba(212, 160, 74, 0.38), inset 0 1px 2px rgba(245, 218, 170, 0.3)'
      : 'none',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
    margin: 0,
    WebkitTapHighlightColor: 'transparent',
  })

  // Spring animation settings untuk hover & tap
  const iconMotionProps = {
    whileHover: {
      scale: 1.15,
      y: -3,
      background: 'rgba(212, 160, 74, 0.2)',
      borderColor: 'rgba(212, 160, 74, 0.6)',
      boxShadow:
        '0 8px 22px rgba(196, 122, 46, 0.35), inset 0 1px 2px rgba(245, 218, 170, 0.25)',
      color: '#ffffff',
    },
    whileTap: {
      scale: 0.88,
      y: 1,
    },
    transition: {
      type: 'spring' as const,
      stiffness: 450,
      damping: 18,
    },
  }

  return (
    /* Outer Fixed Wrapper — kelas .mobile-bottom-bar-container strictly menyembunyikan pada tablet dan desktop */
    <div
      className="mobile-bottom-bar-container"
      style={{
        position: 'fixed',
        bottom: 'max(14px, env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 998,
        pointerEvents: 'none',
      }}
    >
      <motion.nav
        initial={{ y: 60, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 25 }}
        aria-label="Navigasi Cepat Mobile"
        style={{
          pointerEvents: 'auto',
          width: 'min(300px, calc(100vw - 32px))',
        }}
      >
        {/* Warm Espresso Glass Dock Container — warna hangat konsisten dengan tema cafe */}
        <div
          style={{
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, rgba(46, 24, 7, 0.88) 0%, rgba(24, 12, 2, 0.94) 100%)',
            backdropFilter: 'blur(24px) saturate(190%)',
            WebkitBackdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(212, 160, 74, 0.38)',
            borderTop: '1.5px solid rgba(245, 218, 170, 0.48)',
            borderBottom: '1px solid rgba(196, 122, 46, 0.3)',
            borderRadius: '50px',
            padding: '6px 8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            alignItems: 'center',
            justifyItems: 'center',
            boxShadow:
              '0 18px 44px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(245, 218, 170, 0.35), 0 0 22px rgba(196, 122, 46, 0.18)',
          }}
        >
          {/* Warm Champagne Light Streak (Pantulan kilau atas) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '12%',
              right: '12%',
              height: '1px',
              background:
                'linear-gradient(90deg, transparent, rgba(245, 218, 170, 0.65), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* 1. Menu — Mengarah ke Halaman Menu */}
          <Link
            href="/menu"
            aria-label="Daftar Menu"
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
          >
            <motion.div
              {...iconMotionProps}
              style={getSlotStyle(isMenu)}
            >
              <Coffee size={22} strokeWidth={2} />
            </motion.div>
          </Link>

          {/* 2. Voucher — Mengarah ke Section Voucher */}
          <Link
            href="/#voucher"
            onClick={handleVoucherClick}
            aria-label="Section Voucher Promo"
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
          >
            <motion.div
              {...iconMotionProps}
              style={getSlotStyle(false)}
            >
              <Tag size={22} strokeWidth={2} />
              {/* Indikator promo dot — diposisikan presisi */}
              <span
                style={{
                  position: 'absolute',
                  top: '9px',
                  right: '9px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#e85a4a',
                  boxShadow: '0 0 8px #e85a4a',
                  pointerEvents: 'none',
                }}
              />
            </motion.div>
          </Link>

          {/* 3. Pesanan — Mengarah ke Keranjang */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <motion.button
              id="mobile-cart-btn"
              type="button"
              {...iconMotionProps}
              onClick={toggleCart}
              aria-label="Buka Keranjang Pesanan"
              style={getSlotStyle(isCartOpen)}
            >
              <ShoppingBag size={22} strokeWidth={2} />

              {/* Badge Counter Pesanan — presisi tidak mengubah pusat lingkaran */}
              {totalItems > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    borderRadius: '50%',
                    minWidth: '17px',
                    height: '17px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    border: '1.5px solid rgba(24, 12, 2, 0.95)',
                    pointerEvents: 'none',
                  }}
                >
                  {totalItems}
                </span>
              )}
            </motion.button>
          </div>

          {/* 4. Profil — Mengarah ke Halaman Profil */}
          <Link
            href="/profile"
            aria-label="Profil Akun"
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
          >
            <motion.div
              {...iconMotionProps}
              style={getSlotStyle(isProfile)}
            >
              <User size={22} strokeWidth={2} />
            </motion.div>
          </Link>
        </div>
      </motion.nav>
    </div>
  )
}
