'use client'

import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Share2, Send, MessageCircle } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

export function ContactSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const ownerName = 'Ratna'
  const ownerPhone = '085196671398'
  const waDirectUrl = `https://wa.me/6285196671398?text=${encodeURIComponent(
    'Halo Kak Ratna (Owner Lorong Rasa), saya ingin bertanya seputar menu & info Lorong Rasa...'
  )}`

  const handleSendViaWhatsApp = (e: React.FormEvent) => {
    e.preventDefault()
    const text = `Halo Kak Ratna (Owner Lorong Rasa),\n\nNama: ${name || '-'}\nEmail: ${email || '-'}\nPesan: ${message || 'Halo, saya ingin menanyakan info menu/reservasi.'}`
    const url = `https://wa.me/6285196671398?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <section id="contact" className="section-padding" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="container-custom">
        <AnimateOnScroll animation="fade-up">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              — Kontak &amp; Lokasi —
            </span>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginTop: '0.75rem',
            }}>
              Kami Siap{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Melayani Kamu
              </span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Punya pertanyaan seputar menu, reservasi meja, atau kerjasama? Hubungi kami langsung.
            </p>
          </div>
        </AnimateOnScroll>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '2rem',
        }}>
          {/* Contact info column */}
          <AnimateOnScroll animation="fade-left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* WhatsApp Owner Utama (Ratna) - Featured Card */}
              <a
                href={waDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, var(--color-bg-card) 100%)',
                  border: '1.5px solid #25D366',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 18px rgba(37, 211, 102, 0.15)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.28)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(37, 211, 102, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
                      color: '#ffffff',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#128C7E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        WhatsApp Owner Utama
                      </span>
                      <span style={{ background: '#25D366', width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block' }} />
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
                      {ownerName} — {ownerPhone}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Respon cepat seputar pesanan &amp; reservasi
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '50px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  Chat ➔
                </div>
              </a>

              {/* Other Info Items */}
              {[
                {
                  icon: MapPin,
                  label: 'Alamat Gerai',
                  value: 'Dadapan, Wajak, RT.15 RW.05',
                  href: 'https://maps.google.com/?q=Dadapan+Wajak+Malang',
                },
                {
                  icon: Phone,
                  label: 'Telepon / WhatsApp',
                  value: `${ownerPhone} (${ownerName})`,
                  href: waDirectUrl,
                },
                {
                  icon: Mail,
                  label: 'Email Resmi',
                  value: 'lorongrasa30@gmail.com',
                  href: 'mailto:lorongrasa30@gmail.com',
                },
                {
                  icon: Clock,
                  label: 'Jam Buka Gerai',
                  value: 'Senin – Minggu: 10.00 – 22.00 WIB',
                },
              ].map(({ icon: Icon, label, value, href }) => {
                const ItemTag = href ? 'a' : 'div'
                return (
                  <ItemTag
                    key={label}
                    href={href}
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.25s ease',
                      cursor: href ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      if (href) e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.boxShadow = 'none'
                      if (href) e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px var(--color-primary-glow)',
                    }}>
                      <Icon size={18} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '2px' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)', fontWeight: 500 }}>
                        {value}
                      </div>
                    </div>
                  </ItemTag>
                )
              })}

              {/* Social & Channel Links */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <a
                  href={waDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid #25D366',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    textDecoration: 'none',
                    color: '#128C7E',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-inter)',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <MessageCircle size={16} color="#25D366" />
                  WhatsApp {ownerName}
                </a>

                <a
                  href="https://www.instagram.com/rasalorong?stkn=c3N4Y2wwNzV1cHI3"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    textDecoration: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-inter)',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                >
                  <Share2 size={16} />
                  @rasalorong
                </a>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Contact Form */}
          <AnimateOnScroll animation="fade-right">
            <form
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(1.25rem, 4vw, 2rem)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                height: '100%',
              }}
              onSubmit={handleSendViaWhatsApp}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', margin: '0 0 0.35rem' }}>
                  Kirim Pesan ke Owner
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Isi pesan di bawah untuk terhubung langsung ke WhatsApp Kak {ownerName}.
                </p>
              </div>

              <div>
                <label htmlFor="name" style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                }}>
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nama kamu..."
                  required
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                }}>
                  Nomor HP / WhatsApp Kamu
                </label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div>
                <label htmlFor="message" style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                }}>
                  Pesan / Pertanyaan
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tulis pesan atau pertanyaan seputar menu, pesanan, atau reservasi..."
                  required
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: 'auto' }}>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Send size={16} />
                  Kirim Pesan via WhatsApp ke Kak {ownerName}
                </button>
              </div>
            </form>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  )
}
