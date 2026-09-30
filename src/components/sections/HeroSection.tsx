'use client'

import Link from 'next/link'
import { ArrowDown, Star, Clock, MapPin } from 'lucide-react'

export function HeroSection() {
  return (
    <section
      id="home"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 20% 50%, var(--color-primary-glow) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(212, 160, 74, 0.15) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Coffee ring decorations */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '8%',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        border: '1px solid var(--color-border)',
        opacity: 0.4,
        animation: 'float 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '12%',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        border: '2px solid var(--color-primary)',
        opacity: 0.2,
        animation: 'float 4s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '5%',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        border: '1px solid var(--color-gold)',
        opacity: 0.2,
        animation: 'float 5s ease-in-out infinite',
      }} />

      {/* Blob background */}
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '15%',
        width: '500px',
        height: '500px',
        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite',
      }} />

      <div className="container-custom hero-container" style={{ position: 'relative', zIndex: 1, padding: '7.5rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: '700px' }}>
          {/* Badge */}
          <div
            className="animate-fade-in-up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '50px',
              padding: '6px 16px',
              marginBottom: '1.75rem',
            }}
          >
            <Star size={14} style={{ color: 'var(--color-gold)', fill: 'var(--color-gold)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', fontWeight: 500 }}>
              Rated #1 Coffee in Town
            </span>
          </div>

          {/* Heading */}
          <h1
            className="animate-fade-in-up delay-100"
            style={{
              fontSize: 'clamp(2.4rem, 6.5vw, 5.2rem)',
              fontFamily: 'var(--font-playfair)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: '1.25rem',
              opacity: 0,
            }}
          >
            Setiap Tegukan,{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Sebuah Cerita
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-fade-in-up delay-200"
            style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
              color: 'var(--color-text-secondary)',
              marginBottom: '2rem',
              lineHeight: 1.8,
              maxWidth: '520px',
              opacity: 0,
              fontFamily: 'var(--font-inter)',
            }}
          >
            Lorong Rasa hadir dengan cita rasa kopi pilihan yang diracik oleh barista berpengalaman.
            Temukan ketenangan di setiap cangkir.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-in-up delay-300 hero-cta-group"
            style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '2.5rem', opacity: 0 }}
          >
            <Link href="/menu" className="btn-primary" style={{ fontSize: '0.95rem' }}>
              Lihat Menu Lengkap
            </Link>
            <a href="#voucher" className="btn-outline" style={{ fontSize: '0.95rem' }}>
              Klaim Voucher
            </a>
          </div>

          {/* Stats */}
          <div
            className="animate-fade-in-up delay-400"
            style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              opacity: 0,
            }}
          >
            {[
              { value: '50+', label: 'Menu Pilihan' },
              { value: '10K+', label: 'Pelanggan Puas' },
              { value: '4.9★', label: 'Rating Google' },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{
                  fontSize: '1.6rem',
                  fontFamily: 'var(--font-playfair)',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-inter)',
                  marginTop: '4px',
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Info Pills */}
          <div className="hero-info-mobile animate-fade-in-up delay-500" style={{ display: 'none', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap', opacity: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-inter)',
            }}>
              <Clock size={14} style={{ color: 'var(--color-primary)' }} />
              Buka 07:00 - 22:00
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-inter)',
            }}>
              <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
              Jl. Lorong Rasa No. 1
            </div>
          </div>
        </div>

        {/* Desktop Info pills */}
        <div
          className="animate-fade-in-up delay-500 hero-info-desktop"
          style={{
            position: 'absolute',
            bottom: '2rem',
            right: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            opacity: 0,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '10px 16px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <Clock size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
              Buka 07:00 - 22:00
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '10px 16px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
              Jl. Lorong Rasa No. 1
            </span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#menu"
        className="hero-scroll-indicator"
        style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-text-muted)',
          textDecoration: 'none',
          animation: 'float 2s ease-in-out infinite',
        }}
      >
        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-inter)' }}>Scroll</span>
        <ArrowDown size={14} />
      </a>

      <style jsx>{`
        @media (max-width: 900px) {
          .hero-info-desktop { display: none !important; }
          .hero-info-mobile { display: flex !important; }
        }
        @media (max-width: 640px) {
          .hero-container {
            padding: 5.5rem 1rem 3.5rem !important;
          }
          .hero-scroll-indicator {
            display: none !important;
          }
        }
      `}</style>
    </section>
  )
}
