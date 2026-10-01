// Server Component — no 'use client' needed (no state, no event handlers)
import Link from 'next/link'
import { Coffee, Share2, Mail } from 'lucide-react'

const footerColumns = [
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
      {
        href: 'https://wa.me/6285196671398?text=Halo%20Kak%20Ratna,%20saya%20menghubungi%20dari%20website%20Lorong%20Rasa',
        label: '💬 WhatsApp: 0851-9667-1398 (Ratna)',
        external: true,
        isWa: true,
      },
      {
        href: 'https://maps.google.com/?q=Dadapan+Wajak+Malang',
        label: '📍 Dadapan, Wajak, RT.15 RW.05',
        external: true,
      },
      { href: '/#contact', label: '⏰ Buka: 10.00 – 22.00 WIB' },
      { href: 'mailto:lorongrasa30@gmail.com', label: '✉️ lorongrasa30@gmail.com', external: true },
    ],
  },
] satisfies {
  title: string
  links: { href: string; label: string; external?: boolean; isWa?: boolean }[]
}[]

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

            {/* Social icons — hover via CSS class, no JS event handlers needed */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <a
                href="https://wa.me/6285196671398?text=Halo%20Kak%20Ratna,%20saya%20menghubungi%20dari%20website%20Lorong%20Rasa"
                target="_blank"
                rel="noopener noreferrer"
                title="Chat WhatsApp Owner (Ratna)"
                className="social-btn social-btn-wa"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                </svg>
              </a>

              <a
                href="mailto:lorongrasa30@gmail.com"
                title="Kirim Email ke lorongrasa30@gmail.com"
                className="social-btn social-btn-default"
              >
                <Mail size={16} />
              </a>

              <a
                href="https://www.instagram.com/rasalorong?stkn=c3N4Y2wwNzV1cHI3"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram @rasalorong"
                className="social-btn social-btn-default"
              >
                <Share2 size={16} />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map(col => (
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
                  const isExternal = link.external || link.href.startsWith('http') || link.href.startsWith('mailto:')

                  if (isExternal) {
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        className={link.isWa ? 'footer-link-wa' : 'footer-link'}
                      >
                        {link.label}
                      </a>
                    )
                  }

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="footer-link"
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
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
            © {new Date().getFullYear()} Lorong Rasa by Ratna. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link href="/kebijakan-privasi" className="footer-bottom-link">
              Kebijakan Privasi
            </Link>
            <Link href="/syarat-ketentuan" className="footer-bottom-link">
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
