'use client'

import Link from 'next/link'
import { Coffee, Share2, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer style={{
      background: 'var(--color-bg)',
      borderTop: '1px solid var(--color-border)',
      padding: '3rem 0 2rem',
    }}>
      <div className="container-custom">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Coffee size={18} color="white" />
              </div>
              <span style={{
                fontFamily: 'var(--font-playfair)',
                fontWeight: 700,
                fontSize: '1.2rem',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Lorong Rasa
              </span>
            </div>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.7,
              fontFamily: 'var(--font-inter)',
              maxWidth: '220px',
            }}>
              Hadirkan pengalaman kopi terbaik dari biji pilihan lokal untuk setiap tegukan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <a
                href="https://wa.me/6285196671398?text=Halo%20Kak%20Ratna,%20saya%20menghubungi%20dari%20website%20Lorong%20Rasa"
                target="_blank"
                rel="noopener noreferrer"
                title="Chat WhatsApp Owner (Ratna)"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(37, 211, 102, 0.12)',
                  border: '1px solid #25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#25D366',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#25D366'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(37, 211, 102, 0.12)'
                  e.currentTarget.style.color = '#25D366'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </a>

              <a
                href="mailto:hello@lorongrasa.id"
                title="Kirim Email ke hello@lorongrasa.id"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-primary)'
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
              >
                <Mail size={16} />
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram @lorongrasa"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-primary)'
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
              >
                <Share2 size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: 'Katalog Menu',
              links: [
                { href: '/menu', label: 'Semua Menu' },
                { href: '/menu?category=Makanan%20berat', label: 'Makanan Berat' },
                { href: '/menu?category=Snack', label: 'Snack & Cemilan' },
                { href: '/menu?category=Coffee%20series', label: 'Coffee Series' },
                { href: '/menu?category=Milky%20series', label: 'Milky Series' },
              ],
            },
            {
              title: 'Layanan & Bantuan',
              links: [
                { href: '/#about', label: 'Tentang Lorong Rasa' },
                { href: '/#voucher', label: 'Klaim Voucher Diskon' },
                { href: '/kebijakan-privasi', label: 'Kebijakan Privasi' },
                { href: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
                { href: '/login', label: 'Login Pelanggan / Kasir' },
              ],
            },
            {
              title: 'Kontak Owner',
              links: [
                { href: 'https://wa.me/6285196671398?text=Halo%20Kak%20Ratna,%20saya%20menghubungi%20dari%20website%20Lorong%20Rasa', label: '💬 WhatsApp: 0851-9667-1398 (Ratna)', external: true },
                { href: '/#contact', label: '📍 Jl. Lorong Rasa No. 1' },
                { href: '/#contact', label: '⏰ Buka: 07.00 – 22.00 WIB' },
                { href: 'mailto:hello@lorongrasa.id', label: '✉️ hello@lorongrasa.id', external: true },
              ],
            },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '1rem',
                fontFamily: 'var(--font-inter)',
              }}>
                {col.title}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {col.links.map(link => {
                  const isExternal = (link as { external?: boolean }).external || link.href.startsWith('http') || link.href.startsWith('mailto:')
                  if (isExternal) {
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.875rem',
                          color: link.label.includes('WhatsApp') ? '#25D366' : 'var(--color-text-muted)',
                          fontWeight: link.label.includes('WhatsApp') ? 600 : 400,
                          textDecoration: 'none',
                          fontFamily: 'var(--font-inter)',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = link.label.includes('WhatsApp') ? '#25D366' : 'var(--color-text-muted)')}
                      >
                        {link.label}
                      </a>
                    )
                  }
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-inter)',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <p style={{
            fontSize: '0.82rem',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-inter)',
          }}>
            © {new Date().getFullYear()} Lorong Rasa Coffee Shop. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/kebijakan-privasi"
              style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Kebijakan Privasi
            </Link>
            <Link
              href="/syarat-ketentuan"
              style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
