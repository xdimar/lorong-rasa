'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  ArrowRight,
  Star,
  Sparkles,
  ShoppingBag,
  Award,
  Tag,
  Coffee,
  Check,
  Zap,
} from 'lucide-react'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'

interface HeroDrink {
  id: string
  name: string
  shortTitle: string
  subtitle: string
  tastingNotes: string
  price: number
  category: string
  image: string
  badgeText: string
  rating: string
  reviews: string
  accentColor: string
  glowColor: string
}

const heroDrinks: HeroDrink[] = [
  {
    id: 'signature-iced-latte',
    name: 'Signature Iced Latte Lorong',
    shortTitle: 'Signature Latte',
    subtitle: 'Diracik dengan Gula Aren Asli & Double Shot',
    tastingNotes: 'Gula Aren • Karamel • Mandheling Espresso',
    price: 28000,
    category: 'Signature',
    image: '/hero-coffee.jpg',
    badgeText: 'Best Seller #1',
    rating: '4.9 ★★★★★',
    reviews: '1.2k+ ulasan',
    accentColor: '#d4a04a',
    glowColor: 'rgba(212, 160, 74, 0.4)',
  },
  {
    id: 'artisan-cold-brew',
    name: 'Cold Brew 18 Jam Spesial',
    shortTitle: 'Cold Brew 18h',
    subtitle: 'Seduh Lambat dengan Crystal Ice Sphere & Citrus Twist',
    tastingNotes: 'Dark Chocolate • Citrus • Roasted Almond',
    price: 32000,
    category: 'Cold Brew',
    image: '/hero-cold-brew.jpg',
    badgeText: 'Paling Segar',
    rating: '4.9 ★★★★★',
    reviews: '850+ ulasan',
    accentColor: '#e8a04a',
    glowColor: 'rgba(232, 160, 74, 0.4)',
  },
  {
    id: 'kyoto-matcha-fusion',
    name: 'Kyoto Matcha Espresso Fusion',
    shortTitle: 'Matcha Fusion',
    subtitle: 'Perpaduan Uji Matcha Jepang & Espresso Nusantara',
    tastingNotes: 'Velvety Matcha • Sweet Cream • Rich Crema',
    price: 34000,
    category: 'Signature',
    image: '/hero-matcha.jpg',
    badgeText: 'Favorit Baru',
    rating: '5.0 ★★★★★',
    reviews: '640+ ulasan',
    accentColor: '#4a9e6a',
    glowColor: 'rgba(74, 158, 106, 0.4)',
  },
]

export function HeroSection() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const currentDrink = heroDrinks[selectedIdx]

  const { addItem, openCart } = useCart()
  const { showToast } = useToast()

  // 3D Gyroscopic & Mouse Tilt Physics with Framer Motion
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 18 })
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 18 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['14deg', '-14deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-14deg', '14deg'])
  const glareOpacity = useTransform(mouseXSpring, [-0.5, 0, 0.5], [0.35, 0.1, 0.35])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const handleOrderCurrent = () => {
    addItem({
      id: currentDrink.id,
      name: currentDrink.name,
      price: currentDrink.price,
      category: currentDrink.category,
      image_url: currentDrink.image,
    })
    showToast(`${currentDrink.name} berhasil ditambahkan ke keranjang!`, 'cart')
    openCart()
  }

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
      {/* Dynamic Ambient Background Glows */}
      <motion.div
        animate={{
          background: `radial-gradient(circle, ${currentDrink.glowColor} 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'absolute',
          top: '-5%',
          right: '5%',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
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
              RIGHT COLUMN: 3D INTERACTIVE FRAMER MOTION SHOWCASE
              =================================================== */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* 3D Drink Switcher Tabs */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(28, 19, 11, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(212, 160, 74, 0.25)',
                borderRadius: '50px',
                padding: '4px',
                marginBottom: '1.5rem',
                gap: '4px',
                boxShadow: 'var(--shadow-md)',
                zIndex: 20,
              }}
            >
              {heroDrinks.map((drink, idx) => {
                const isActive = idx === selectedIdx
                return (
                  <button
                    key={drink.id}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      position: 'relative',
                      border: 'none',
                      background: 'none',
                      padding: '8px 16px',
                      borderRadius: '50px',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'white' : 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-inter)',
                      transition: 'color 0.2s',
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeHeroPill"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50px',
                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                          boxShadow: '0 4px 15px var(--color-primary-glow)',
                          zIndex: -1,
                        }}
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    {drink.shortTitle}
                  </button>
                )
              })}
            </div>

            {/* 3D Perspective Stage */}
            <div
              style={{
                perspective: '1200px',
                width: '100%',
                maxWidth: '430px',
                display: 'flex',
                justifyContent: 'center',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <motion.div
                style={{
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                  width: '100%',
                  position: 'relative',
                  cursor: 'grab',
                }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {/* 3D Ambient Outer Frame */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '34px',
                    padding: '10px',
                    background: 'linear-gradient(145deg, rgba(212, 160, 74, 0.4), rgba(28, 19, 11, 0.75))',
                    boxShadow: '0 30px 70px rgba(0, 0, 0, 0.6), 0 0 45px var(--color-primary-glow)',
                    border: '1px solid rgba(212, 160, 74, 0.35)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Dynamic Interactive Sheen / Glare */}
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '34px',
                      background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.4) 0%, transparent 60%)',
                      opacity: glareOpacity,
                      pointerEvents: 'none',
                      zIndex: 30,
                    }}
                  />

                  {/* Image Viewport Container */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '26px',
                      overflow: 'hidden',
                      transform: 'translateZ(20px)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentDrink.id}
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                        style={{ position: 'absolute', inset: 0 }}
                      >
                        <Image
                          src={currentDrink.image}
                          alt={currentDrink.name}
                          fill
                          priority
                          sizes="(max-width: 768px) 100vw, 430px"
                          style={{
                            objectFit: 'cover',
                          }}
                        />

                        {/* Subtle bottom vignette */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, transparent 40%, rgba(15, 11, 8, 0.88) 100%)',
                            pointerEvents: 'none',
                          }}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Bottom Glass Pill inside Image (translateZ for 3D elevation) */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '14px',
                        left: '14px',
                        right: '14px',
                        background: 'rgba(20, 14, 9, 0.88)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(212, 160, 74, 0.4)',
                        borderRadius: '20px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transform: 'translateZ(45px)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                        zIndex: 40,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: 'white',
                            fontFamily: 'var(--font-inter)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {currentDrink.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-gold)',
                            fontFamily: 'var(--font-inter)',
                            marginTop: '2px',
                          }}
                        >
                          {currentDrink.tastingNotes}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOrderCurrent}
                        className="hero-quick-add-btn"
                        title="Pesan menu ini langsung ke keranjang"
                      >
                        <span>+ Pesan</span>
                        <span style={{ opacity: 0.9, fontSize: '0.72rem' }}>
                          {(currentDrink.price / 1000).toFixed(0)}K
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ===================================================
                    FLOATING 3D SATELLITE CARDS (ELEVATED IN Z-SPACE)
                    =================================================== */}

                {/* Satellite 1: Top-Right (Best Seller / Badge) */}
                <motion.div
                  className="glass-floating-card"
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transform: 'translateZ(80px)',
                  }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px var(--color-primary-glow)',
                    }}
                  >
                    <Award size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-inter)' }}>
                      {currentDrink.badgeText}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                      {currentDrink.rating} ({currentDrink.reviews})
                    </div>
                  </div>
                </motion.div>

                {/* Satellite 2: Bottom-Left (100% Single Origin) */}
                <motion.div
                  className="glass-floating-card"
                  style={{
                    position: 'absolute',
                    bottom: '25px',
                    left: '-24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transform: 'translateZ(70px)',
                  }}
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(74, 158, 106, 0.25)',
                      border: '1px solid rgba(74, 158, 106, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={18} color="#4a9e6a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-inter)' }}>
                      100% Single Origin
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Aceh Gayo & Mandheling
                    </div>
                  </div>
                </motion.div>

                {/* Satellite 3: Top-Left (Handcrafted Pill) */}
                <motion.div
                  className="glass-floating-card"
                  style={{
                    position: 'absolute',
                    top: '35px',
                    left: '-20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '50px',
                    transform: 'translateZ(60px)',
                  }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                >
                  <Coffee size={14} style={{ color: 'var(--color-primary)' }} />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    Handcrafted Live
                  </span>
                </motion.div>
              </motion.div>
            </div>
            
            {/* Interactive hint */}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-inter)',
                marginTop: '1.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.8,
              }}
            >
              <Zap size={13} style={{ color: 'var(--color-gold)' }} />
              Gerakkan kursor untuk efek 3D interaktif • Pilih tab di atas untuk ganti racikan
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
