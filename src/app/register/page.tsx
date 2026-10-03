'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Coffee,
  User,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('redirect')
      if (param && param.startsWith('/')) {
        setRedirectPath(param)
      }
    }
  }, [])

  // Kalkulasi kekuatan kata sandi
  const passwordStrength = () => {
    if (password.length === 0) return 0
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const strengthColors = ['', '#e85a4a', '#e8a04a', '#e8d04a', '#4a9e6a']
  const strengthLabels = ['', 'Lemah', 'Cukup', 'Bagus', 'Sangat Kuat']

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Harap periksa kembali.')
      return
    }
    if (password.length < 8) {
      setError('Kata sandi harus minimal 8 karakter.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    })

    if (signUpErr) {
      const msg = signUpErr.message || ''
      const isRateLimit =
        signUpErr.status === 429 ||
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('too many') ||
        msg.toLowerCase().includes('over_email_send_rate_limit')

      if (isRateLimit) {
        setError(
          'Terlalu banyak permintaan pendaftaran (Rate Limit). Supabase membatasi pengiriman email konfirmasi (maks. 2-3 per jam pada free tier). Harap tunggu 2-5 menit, atau matikan opsi "Confirm email" di Dashboard Supabase untuk pendaftaran instan.'
        )
      } else if (msg.includes('Database error saving new user')) {
        setError('Terjadi kendala pada pemicu database saat menyimpan pengguna. Silakan jalankan script fix-register-trigger.sql di Supabase SQL Editor.')
      } else if (msg.toLowerCase().includes('already registered')) {
        setError('Email ini sudah terdaftar. Silakan masuk menggunakan akun Anda.')
      } else {
        setError(msg || 'Pendaftaran gagal. Silakan coba kembali.')
      }
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  const loginHref = redirectPath
    ? `/login?redirect=${encodeURIComponent(redirectPath)}`
    : '/login'

  // Layar Sukses Pendaftaran
  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(4rem, 10vh, 6rem) 1.25rem 3rem',
          position: 'relative',
          overflowX: 'hidden',
        }}
      >
        <div className="auth-ambient-orb-1" />
        <div className="auth-ambient-orb-2" />

        <div
          className="auth-card-glass animate-fade-in-up"
          style={{
            maxWidth: '460px',
            width: '100%',
            padding: 'clamp(2rem, 5vw, 3rem) 2rem',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10,
            margin: 'auto 0',
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #4a9e6a, #2a7e4a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 30px rgba(74, 158, 106, 0.35)',
              color: '#ffffff',
              animation: 'float 5s ease-in-out infinite',
            }}
          >
            <Check size={40} />
          </div>

          <span
            style={{
              fontSize: '0.78rem',
              color: '#4a9e6a',
              fontFamily: 'var(--font-inter)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            — Pendaftaran Berhasil —
          </span>

          <h1
            style={{
              fontSize: '1.75rem',
              fontFamily: 'var(--font-playfair)',
              fontWeight: 700,
              margin: '0.5rem 0 0.85rem',
              color: 'var(--color-text)',
            }}
          >
            Selamat Bergabung!
          </h1>

          <p
            style={{
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
              fontSize: '0.92rem',
              lineHeight: 1.65,
              marginBottom: '1.75rem',
            }}
          >
            Tautan konfirmasi aktivasi akun telah kami kirimkan ke email{' '}
            <strong style={{ color: 'var(--color-primary)' }}>{email}</strong>. Silakan periksa inbox atau folder spam Anda.
          </p>

          <Link
            href={loginHref}
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.95rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Lanjut Masuk ke Akun
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    )
  }

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
          top: '12%',
          right: '8%',
          opacity: 0.18,
          pointerEvents: 'none',
          animation: 'float 7s ease-in-out infinite',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 0,
        }}
      >
        <Sparkles size={40} color="var(--color-gold)" />
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: '15%',
          left: '7%',
          opacity: 0.18,
          pointerEvents: 'none',
          animation: 'float 6s ease-in-out infinite 1s',
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          zIndex: 0,
        }}
      >
        <Coffee size={42} color="var(--color-primary)" />
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
          maxWidth: '470px',
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
            Mulai nikmati racikan kopi &amp; diskon eksklusif member
          </p>
        </div>

        {/* Glass Card */}
        <div className="auth-card-glass" style={{ padding: 'clamp(1.75rem, 5vw, 2.5rem)' }}>
          {/* Segmented Switcher Tab */}
          <div className="auth-tabs-nav">
            <Link href={loginHref} className="auth-tab-btn">
              <Coffee size={16} />
              Masuk
            </Link>
            <button type="button" className="auth-tab-btn active">
              <Sparkles size={16} />
              Daftar
            </button>
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
              Daftar Akun Baru
            </h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-inter)',
                margin: 0,
              }}
            >
              Lengkapi data untuk membuat akun dan mengumpulkan poin
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
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="reg-name"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Nama Lengkap
              </label>
              <div className="auth-input-wrapper">
                <User
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
                  id="reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama lengkap kamu"
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
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
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  required
                  className="auth-input-field"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Kata Sandi
              </label>
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
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
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

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div style={{ marginTop: '8px', animation: 'fadeInUp 0.2s ease' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          height: '5px',
                          borderRadius: '4px',
                          background:
                            step <= passwordStrength()
                              ? strengthColors[passwordStrength()]
                              : 'var(--color-border)',
                          transition: 'background-color 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>Keamanan Kata Sandi</span>
                    <span
                      style={{
                        color: strengthColors[passwordStrength()],
                        fontWeight: 700,
                      }}
                    >
                      {strengthLabels[passwordStrength()]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reg-confirm"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Konfirmasi Kata Sandi
              </label>
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
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  required
                  className="auth-input-field"
                  style={{
                    borderColor:
                      confirmPassword && confirmPassword !== password
                        ? '#e85a4a'
                        : undefined,
                  }}
                />
                {confirmPassword && confirmPassword === password && (
                  <CheckCircle2
                    size={18}
                    color="#4a9e6a"
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Security Assurance Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              <ShieldCheck size={16} color="var(--color-primary)" />
              <span>Data &amp; kata sandi Anda terenkripsi standar industri.</span>
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
                marginTop: '0.4rem',
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
                  Mendaftarkan...
                </>
              ) : (
                <>
                  Daftar Sekarang
                  <Sparkles size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border)',
              fontSize: '0.88rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            Sudah punya akun Lorong Rasa?{' '}
            <Link
              href={loginHref}
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
              Masuk di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
