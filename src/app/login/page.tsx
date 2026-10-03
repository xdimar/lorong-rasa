'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Coffee, ArrowLeft, ArrowRight, Loader2, Sparkles, HelpCircle, MessageCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [showForgotModal, setShowForgotModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('redirect')
      if (param && param.startsWith('/')) {
        setRedirectPath(param)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
        setError('Terlalu banyak percobaan masuk (Rate Limit). Harap tunggu beberapa menit sebelum mencoba lagi.')
      } else if (error.message === 'Invalid login credentials') {
        setError('Email atau password belum tepat. Silakan periksa kembali.')
      } else {
        setError(error.message)
      }
      setLoading(false)
    } else {
      if (redirectPath) {
        router.push(redirectPath)
      } else if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()

        if (profile?.role === 'admin') {
          router.push('/admin')
        } else if (profile?.role === 'cashier') {
          router.push('/admin/pos')
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
      router.refresh()
    }
  }

  const registerHref = redirectPath
    ? `/register?redirect=${encodeURIComponent(redirectPath)}`
    : '/register'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 'clamp(5.5rem, 11vh, 7.5rem) 1.25rem 3rem',
        overflowX: 'hidden',
      }}
    >
      {/* Dynamic Ambient Glow Orbs */}
      <div className="auth-ambient-orb-1" />
      <div className="auth-ambient-orb-2" />

      {/* Floating decorative elements */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '8%',
          opacity: 0.18,
          pointerEvents: 'none',
          animation: 'float 6s ease-in-out infinite',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 0,
        }}
      >
        <Coffee size={42} color="var(--color-primary)" />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: '18%',
          right: '8%',
          opacity: 0.18,
          pointerEvents: 'none',
          animation: 'float 7s ease-in-out infinite 1s',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 0,
        }}
      >
        <Sparkles size={38} color="var(--color-gold)" />
      </div>

      {/* Top Floating Navigation */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          padding: '1rem clamp(1rem, 3.5vw, 2.5rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontFamily: 'var(--font-inter)',
              fontWeight: 500,
              padding: '8px 16px',
              borderRadius: '50px',
              background: 'color-mix(in srgb, var(--color-bg-card) 85%, transparent)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary)'
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.transform = 'translateX(-3px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary)'
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>
        </div>

        <div
          style={{
            pointerEvents: 'auto',
            background: 'color-mix(in srgb, var(--color-bg-card) 85%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '50px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <div
        className="animate-fade-in-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          position: 'relative',
          zIndex: 10,
          margin: 'auto 0',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 10px 28px var(--color-primary-glow)',
              transform: 'rotate(-4deg)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(-4deg) scale(1)')}
          >
            <Coffee size={30} color="white" />
          </div>

          <h1
            style={{
              fontSize: '1.9rem',
              fontFamily: 'var(--font-playfair)',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '0.35rem',
              letterSpacing: '-0.02em',
            }}
          >
            Lorong Rasa
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Hadirkan kehangatan kopi pilihan Nusantara
          </p>
        </div>

        {/* Glass Card */}
        <div className="auth-card-glass" style={{ padding: 'clamp(1.75rem, 5vw, 2.5rem)' }}>
          {/* Segmented Switcher Tab */}
          <div className="auth-tabs-nav">
            <button type="button" className="auth-tab-btn active">
              <Coffee size={16} />
              Masuk
            </button>
            <Link href={registerHref} className="auth-tab-btn">
              <Sparkles size={16} />
              Daftar
            </Link>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontFamily: 'var(--font-playfair)',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: '0 0 0.3rem',
              }}
            >
              Masuk ke Akun
            </h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-inter)',
                margin: 0,
              }}
            >
              Masukkan email &amp; kata sandi untuk melanjutkan transaksi
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: 'rgba(232, 90, 74, 0.12)',
                border: '1.5px solid rgba(232, 90, 74, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                color: '#e85a4a',
                fontFamily: 'var(--font-inter)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeInUp 0.2s ease',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e85a4a', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Alamat Email
              </label>
              <div className="auth-input-wrapper">
                <Mail
                  size={18}
                  className="input-icon"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    transition: 'color 0.2s ease',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 500,
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Lupa kata sandi?
                </button>
              </div>

              <div className="auth-input-wrapper">
                <Lock
                  size={18}
                  className="input-icon"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    transition: 'color 0.2s ease',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="auth-input-field"
                  style={{ paddingRight: '46px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s, background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)'
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.95rem',
                fontSize: '0.98rem',
                fontWeight: 700,
                marginTop: '0.5rem',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Akun
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Belum punya akun Lorong Rasa?{' '}
            <Link
              href={registerHref}
              style={{
                color: 'var(--color-primary)',
                fontWeight: 700,
                textDecoration: 'none',
                marginLeft: '4px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* Modal Bantuan Lupa Kata Sandi */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 200,
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
              animation: 'fadeInUp 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'var(--color-bg-secondary)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '16px',
                background: 'var(--color-primary-glow)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <HelpCircle size={26} />
            </div>

            <h3
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-playfair)',
                margin: '0 0 0.5rem',
                color: 'var(--color-text)',
              }}
            >
              Bantuan Reset Kata Sandi
            </h3>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                fontFamily: 'var(--font-inter)',
                marginBottom: '1.5rem',
              }}
            >
              Untuk menjaga keamanan akun Anda, silakan hubungi owner/barista Lorong Rasa (Kak Ratna) melalui WhatsApp untuk konfirmasi reset akun secara instan.
            </p>

            <a
              href={`https://wa.me/6285196671398?text=${encodeURIComponent(
                'Halo Kak Ratna, saya membutuhkan bantuan untuk reset kata sandi akun Lorong Rasa saya.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageCircle size={18} />
              Hubungi WhatsApp Ratna
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
