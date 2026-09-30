import { Coffee, Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
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
          fontSize: '6rem',
          fontFamily: 'var(--font-playfair)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          marginBottom: '1rem',
        }}>
          404
        </div>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 30px var(--color-primary-glow)',
        }}>
          <Coffee size={28} color="white" />
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          fontFamily: 'var(--font-playfair)',
          color: 'var(--color-text)',
          marginBottom: '0.75rem',
        }}>
          Halaman Tidak Ditemukan
        </h2>
        <p style={{
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-inter)',
          lineHeight: 1.7,
          marginBottom: '2rem',
          fontSize: '0.9rem',
        }}>
          Sepertinya kopi yang kamu cari belum tersedia di lorong ini. Yuk kembali ke beranda!
        </p>
        <Link
          href="/"
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Home size={16} />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
