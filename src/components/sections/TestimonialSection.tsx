'use client'

import { Star, Quote } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

const testimonials = [
  {
    name: 'Andi Pratama',
    role: 'Food Blogger',
    content: 'Lorong Rasa benar-benar mengubah pandangan saya tentang kopi lokal. Espresso mereka adalah yang terbaik yang pernah saya coba di kota ini!',
    rating: 5,
    avatar: 'AP',
  },
  {
    name: 'Sari Dewi',
    role: 'Designer',
    content: 'Tempat favorit untuk work from cafe. Atmosfernya nyaman, wifi kencang, dan Cold Brew Rasa Hitam-nya bikin produktif seharian.',
    rating: 5,
    avatar: 'SD',
  },
  {
    name: 'Budi Santoso',
    role: 'Mahasiswa',
    content: 'Harganya sangat worth it untuk kualitas yang didapat. Cortado Ambar jadi andalan saya setiap pagi sebelum kuliah.',
    rating: 5,
    avatar: 'BS',
  },
  {
    name: 'Maya Kusuma',
    role: 'Ibu Rumah Tangga',
    content: 'Pertama kali ke sini karena voucher, sekarang jadi pelanggan setia. Serai Tubruk-nya bikin kangen terus!',
    rating: 5,
    avatar: 'MK',
  },
]

export function TestimonialSection() {
  return (
    <section className="section-padding" style={{ background: 'var(--color-bg)' }}>
      <div className="container-custom">
        {/* Header */}
        <AnimateOnScroll animation="fade-up">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2rem, 5vw, 4rem)' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              — Kata Pelanggan —
            </span>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginTop: '0.75rem',
            }}>
              Mereka{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Sudah Merasakannya
              </span>
            </h2>
          </div>
        </AnimateOnScroll>

        {/* Testimonials */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
          gap: '1.25rem',
        }}>
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} animation="fade-up" delay={i * 90}>
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <Quote size={28} style={{
                  color: 'var(--color-primary)',
                  opacity: 0.3,
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                }} />

                {/* Stars */}
                <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem' }}>
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} size={14} style={{ color: 'var(--color-gold)', fill: 'var(--color-gold)' }} />
                  ))}
                </div>

                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.8,
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--font-inter)',
                  fontStyle: 'italic',
                  flex: 1,
                }}>
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'var(--font-inter)',
                    flexShrink: 0,
                  }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      {t.name}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
