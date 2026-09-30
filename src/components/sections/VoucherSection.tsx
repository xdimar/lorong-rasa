'use client'

import Link from 'next/link'
import { Tag, Sparkles, QrCode, ShieldCheck, ArrowRight, Gift } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

export function VoucherSection() {
  return (
    <section id="voucher" className="section-padding" style={{ background: 'var(--color-bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, var(--color-primary-glow) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="container-custom" style={{ position: 'relative' }}>
        <AnimateOnScroll animation="fade-up">
          <div style={{
            background: 'linear-gradient(145deg, var(--color-bg-card), var(--color-bg-secondary))',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(2rem, 5vw, 4rem)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Accent badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-primary-glow)',
              color: 'var(--color-primary)',
              borderRadius: '50px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}>
              <Sparkles size={14} />
              Program Promo Eksklusif
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}>
              {/* Left Text */}
              <div>
                <h2 style={{
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  fontFamily: 'var(--font-playfair)',
                  marginBottom: '1rem',
                  lineHeight: 1.2,
                  color: 'var(--color-text)',
                }}>
                  Punya Kode Promo Khusus dari Barista atau Media Sosial?
                </h2>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-inter)',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  marginBottom: '2rem',
                }}>
                  Masuk ke akun Lorong Rasa Anda untuk mengklaim voucher potongan harga spesial. Kode promo dapat digunakan langsung saat checkout online ataupun ditukarkan secara offline di meja kasir.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link
                    href="/profile"
                    className="btn-primary"
                    style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Tag size={17} />
                    Klaim Voucher di Profil
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/menu"
                    className="btn-outline"
                    style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
                  >
                    Lihat Pilihan Menu
                  </Link>
                </div>
              </div>

              {/* Right Feature Highlights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    icon: ShieldCheck,
                    title: '1 Akun 1 Voucher Eksklusif',
                    desc: 'Setiap pelanggan mendapatkan jatah potongan harga yang terjamin dan terlindungi di dalam dompet profil.',
                  },
                  {
                    icon: QrCode,
                    title: 'Bisa Ditukarkan di Kasir Café',
                    desc: 'Cukup tunjukkan QR Code voucher dari layar HP Anda kepada kasir saat bertransaksi di tempat.',
                  },
                  {
                    icon: Gift,
                    title: 'Gunakan Instan Saat Checkout Online',
                    desc: 'Voucher yang telah diklaim otomatis tersedia untuk dipasangkan saat Anda memesan menu secara online.',
                  },
                ].map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--color-primary-glow)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)', fontSize: '0.95rem', marginBottom: '2px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', lineHeight: 1.6 }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
