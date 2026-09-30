'use client'

import { Coffee, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e85a4a, #c43a2a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 30px rgba(232, 90, 74, 0.3)',
        }}>
          <Coffee size={36} color="white" />
        </div>
        <h2 style={{
          fontSize: '1.75rem',
          fontFamily: 'var(--font-playfair)',
          color: 'var(--color-text)',
          marginBottom: '0.75rem',
        }}>
          Oops, Ada Masalah!
        </h2>
        <p style={{
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.7,
          marginBottom: '2rem',
          fontSize: '0.9rem',
        }}>
          Sepertinya ada yang tidak beres. Jangan khawatir, coba muat ulang halaman atau kembali ke beranda.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} />
            Coba Lagi
          </button>
          <Link
            href="/"
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Home size={16} />
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
