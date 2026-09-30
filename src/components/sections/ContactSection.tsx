'use client'

import { MapPin, Phone, Mail, Clock, Share2, ExternalLink } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

export function ContactSection() {
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
              — Hubungi Kami —
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
          </div>
        </AnimateOnScroll>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '2rem',
        }}>
          {/* Contact info */}
          <AnimateOnScroll animation="fade-left">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { icon: MapPin, label: 'Alamat', value: 'Jl. Lorong Rasa No. 1, Kota Kopi, Indonesia' },
              { icon: Phone, label: 'Telepon', value: '+62 812 3456 7890' },
              { icon: Mail, label: 'Email', value: 'hello@lorongrasa.id' },
              { icon: Clock, label: 'Jam Buka', value: 'Senin – Minggu: 07.00 – 22.00' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'none'
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
              </div>
            ))}

            {/* Social links */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              {[
                { icon: Share2, label: '@lorongrasa' },
                { icon: ExternalLink, label: 'Lorong Rasa' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1.25rem',
                    textDecoration: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-inter)',
                    transition: 'all 0.2s ease',
                    flex: 1,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.color = 'var(--color-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.color = 'var(--color-text-secondary)'
                  }}
                >
                  <Icon size={16} />
                  {label}
                </a>
              ))}
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
              onSubmit={e => { e.preventDefault(); alert('Pesan terkirim! Kami akan segera menghubungi kamu.') }}
            >
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                Kirim Pesan
              </h3>
              {[
                { id: 'name', label: 'Nama', type: 'text', placeholder: 'Nama kamu' },
                { id: 'email', label: 'Email', type: 'email', placeholder: 'email@kamu.com' },
              ].map(field => (
                <div key={field.id}>
                  <label htmlFor={field.id} style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '6px',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 500,
                  }}>
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
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
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="message" style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 500,
                }}>
                  Pesan
                </label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Tulis pesanmu di sini..."
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
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Kirim Pesan
              </button>
            </form>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  )
}
