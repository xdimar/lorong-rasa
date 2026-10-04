'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Star,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import dynamic from 'next/dynamic'

const CoffeeCup3D = dynamic(
  () => import('@/components/ui/CoffeeCup3D').then((mod) => mod.CoffeeCup3D),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(212, 160, 74, 0.2)',
            borderTopColor: '#d4a04a',
          }}
          className="animate-spin"
        />
      </div>
    ),
  }
)

export function HeroSection() {
  const marqueeItems = [
    'Specialty Coffee',
    '100% Arabica Nusantara',
    'Artisan Roastery',
    'Freshly Handcrafted',
    'Free Wi-Fi & Cozy Vibes',
    'Dine In & Take Away',
    'Lorong Rasa',
  ]

  return (
    <section
      id="home"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-bg)',
        paddingTop: '90px',
      }}
    >
      {/* Ambient Background Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-5%',
          right: '5%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 160, 74, 0.35) 0%, transparent 70%)',
          filter: 'blur(90px)',
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 65%)',
          filter: 'blur(80px)',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Main Hero Container */}
      <div className="container-custom" style={{ position: 'relative', zIndex: 2, padding: '3.5rem 1.5rem 5rem' }}>
        <div className="hero-split-grid">
          {/* ===================================================
              LEFT COLUMN: Brand Story & Call to Actions
              =================================================== */}
          <div className="hero-left-content" style={{ maxWidth: '640px' }}>
            {/* Top Heritage Pill with live pulse */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '50px',
                padding: '6px 16px',
                marginBottom: '1.75rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4a9e6a',
                  boxShadow: '0 0 10px #4a9e6a',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Specialty Coffee Roastery • Est. 2019
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--color-bg-secondary)',
                  padding: '2px 8px',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--color-gold)',
                }}
              >
                <Star size={12} fill="var(--color-gold)" color="var(--color-gold)" />
                4.9★
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                fontSize: 'clamp(2.5rem, 5.5vw, 4.4rem)',
                fontFamily: 'var(--font-playfair)',
                fontWeight: 700,
                lineHeight: 1.12,
                marginBottom: '1.25rem',
                color: 'var(--color-text)',
                letterSpacing: '-0.02em',
              }}
            >
              Setiap Tegukan,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >
                Sebuah Cerita Rasa
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                fontSize: 'clamp(0.95rem, 2vw, 1.12rem)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.8,
                marginBottom: '2.25rem',
                fontFamily: 'var(--font-inter)',
                maxWidth: '540px',
              }}
            >
              Biji kopi single origin pilihan Nusantara, dipanggang dengan profil presisi
              dan diracik sepenuh hati oleh barista kami. Rasakan kehangatan dan ketenangan di setiap cangkir.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="hero-cta-group"
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: '3rem',
              }}
            >
              <Link
                href="/menu"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.9rem 2rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <ShoppingBag size={18} />
                Jelajahi Menu & Pesan
                <ArrowRight size={16} />
              </Link>

              <a
                href="#voucher"
                className="btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.9rem 1.6rem',
                  fontSize: '0.95rem',
                }}
              >
                <Tag size={16} />
                Klaim Voucher Diskon
              </a>
            </motion.div>

            {/* Social Proof & Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hero-stats-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2.5rem',
                flexWrap: 'wrap',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontFamily: 'var(--font-playfair)',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    lineHeight: 1,
                  }}
                >
                  50+
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                    marginTop: '4px',
                    fontWeight: 500,
                  }}
                >
                  Varian Menu Pilihan
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontFamily: 'var(--font-playfair)',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    lineHeight: 1,
                  }}
                >
                  100%
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                    marginTop: '4px',
                    fontWeight: 500,
                  }}
                >
                  Single Origin Lokal
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontFamily: 'var(--font-playfair)',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    lineHeight: 1,
                  }}
                >
                  ~5 Mnt
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                    marginTop: '4px',
                    fontWeight: 500,
                  }}
                >
                  Rata-rata Waktu Seduh
                </div>
              </div>
            </motion.div>
          </div>

          {/* ===================================================
              RIGHT COLUMN: PURE CLEAN 3D COFFEE CUP
              =================================================== */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '480px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CoffeeCup3D />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          INFINITE RUNNING MARQUEE TICKER (TRANSITION STRIP)
          =================================================== */}
      <div className="marquee-container" aria-hidden="true">
        <div className="marquee-track">
          {marqueeItems.concat(marqueeItems).map((text, i) => (
            <span key={i} className="marquee-item">
              <span>{text}</span>
              <span className="marquee-dot">✦</span>
            </span>
          ))}
        </div>
        <div className="marquee-track" aria-hidden="true">
          {marqueeItems.concat(marqueeItems).map((text, i) => (
            <span key={`clone-${i}`} className="marquee-item">
              <span>{text}</span>
              <span className="marquee-dot">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
