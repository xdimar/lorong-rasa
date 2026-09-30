'use client'

import Link from 'next/link'
import { Coffee, Share2, ExternalLink, Mail } from 'lucide-react'

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
              {[Share2, ExternalLink, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
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
                  <Icon size={16} />
                </a>
              ))}
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
                {col.links.map(link => (
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
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  >
                    {link.label}
                  </Link>
                ))}
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
