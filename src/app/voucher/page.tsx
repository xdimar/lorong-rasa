'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Tag, Coffee, ArrowRight, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

function VoucherIndexContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const code =
    searchParams.get('code') ||
    searchParams.get('token') ||
    searchParams.get('t') ||
    searchParams.get('claim')
  const scan = searchParams.get('scan')

  useEffect(() => {
    if (code) {
      router.replace(`/voucher/${encodeURIComponent(code)}${scan ? '?scan=1' : ''}`)
    }
  }, [code, scan, router])

  if (code) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <Navbar />
      <main style={{ flex: 1, paddingTop: '100px', paddingBottom: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Tag size={42} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.75rem' }}>
            Klaim Voucher Lorong Rasa
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', fontFamily: 'var(--font-inter)', marginBottom: '1.75rem' }}>
            Masukkan kode voucher atau pilih promo menarik yang sedang berlangsung di Lorong Rasa.
          </p>

          <form
            onSubmit={e => {
              e.preventDefault()
              const input = (e.currentTarget.elements.namedItem('vcode') as HTMLInputElement)?.value?.trim()
              if (input) {
                router.push(`/voucher/${encodeURIComponent(input)}`)
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}
          >
            <input
              name="vcode"
              type="text"
              placeholder="Contoh: HEMAT20, SENINCERIA"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '1rem',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                outline: 'none',
              }}
              required
            />
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '0.85rem' }}>
              Cari & Klaim Voucher <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/#voucher" className="btn-outline" style={{ fontSize: '0.82rem' }}>
              Lihat Semua Voucher
            </Link>
            <Link href="/menu" className="btn-outline" style={{ fontSize: '0.82rem' }}>
              <Coffee size={14} /> Buka Menu
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function VoucherIndexPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      }
    >
      <VoucherIndexContent />
    </Suspense>
  )
}
