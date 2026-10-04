'use client'

import Link from 'next/link'
import { Award, Heart, Coffee, Users } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

const values = [
  {
    icon: Coffee,
    title: 'Biji Kopi Pilihan',
    desc: 'Kami hanya menggunakan biji kopi single origin dari petani lokal Aceh, Toraja, dan Flores.',
  },
  {
    icon: Heart,
    title: 'Diracik dengan Cinta',
    desc: 'Setiap minuman diproses dengan perhatian penuh oleh barista bersertifikat internasional kami.',
  },
  {
    icon: Award,
    title: 'Kualitas Terjamin',
    desc: 'Proses roasting kami menggunakan mesin profesional untuk memastikan konsistensi rasa.',
  },
  {
    icon: Users,
    title: 'Komunitas Kopi',
    desc: 'Bergabunglah dengan ribuan pecinta kopi yang menjadikan Lorong Rasa sebagai rumah kedua.',
  },
]

export function AboutSection() {
  return (
    <section id="about" className="section-padding" style={{ background: 'var(--color-bg)' }}>
      <div className="container-custom">
        <div className="about-main-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '3rem',
          alignItems: 'center',
        }}>
          {/* Left Content */}
          <AnimateOnScroll animation="fade-left">
            <div>
              <span style={{
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-inter)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                — Tentang Kami —
              </span>
              <h2 style={{
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                marginTop: '0.75rem',
                marginBottom: '1.5rem',
                lineHeight: 1.2,
              }}>
                Perjalanan Kopi{' '}
                <span style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  dari Hulu ke Hilir
                </span>
              </h2>
              <p style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.9,
                marginBottom: '1.25rem',
                fontFamily: 'var(--font-inter)',
              }}>
                Lorong Rasa lahir dari kecintaan mendalam terhadap kopi Indonesia. Kami percaya bahwa secangkir kopi
                yang baik bisa mengubah hari yang biasa menjadi luar biasa.
              </p>
              <p style={{
                color: 'var(--color-text-muted)',
                lineHeight: 1.9,
                marginBottom: '2rem',
                fontFamily: 'var(--font-inter)',
              }}>
                Sejak 2019, kami telah melayani ribuan pelanggan dengan dedikasi penuh, menjaga kualitas,
                dan terus berinovasi untuk menghadirkan pengalaman kopi terbaik.
              </p>
              <Link href="/menu" className="btn-primary">
                Jelajahi Menu Lengkap →
              </Link>
            </div>
          </AnimateOnScroll>

          {/* Right - Values Grid */}
          <div className="about-values-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '1rem',
          }}>
            {values.map((val, i) => {
              const Icon = val.icon
              return (
                <AnimateOnScroll key={val.title} animation="fade-right" delay={i * 100}>
                  <div
                    style={{
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      transition: 'all 0.3s ease',
                      height: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 4px 12px var(--color-primary-glow)',
                    }}>
                      <Icon size={18} color="white" />
                    </div>
                    <h4 style={{
                      fontSize: '0.95rem',
                      marginBottom: '0.5rem',
                      color: 'var(--color-text)',
                    }}>
                      {val.title}
                    </h4>
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.6,
                      fontFamily: 'var(--font-inter)',
                    }}>
                      {val.desc}
                    </p>
                  </div>
                </AnimateOnScroll>
              )
            })}
          </div>
        </div>
      </div>

    </section>
  )
}
