'use client'

import { useEffect, useState, useMemo, Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Coffee,
  Tag,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Share2,
  Copy,
  Check,
  ShoppingBag,
  LogIn,
  AlertCircle,
  QrCode,
  Gift,
  User,
  ExternalLink,
  Loader2,
  PartyPopper,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { useCart, AppliedVoucher } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { parseProductPool, getOrDrawAwardedProduct } from '@/lib/voucher-draw'

interface VoucherRecord {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed' | 'product'
  discount_value: number
  product_name: string | null
  product_menu_item_id: string | null
  share_token: string | null
  min_order: number
  max_uses: number
  current_uses: number
  expires_at: string
  is_active: boolean
  created_at: string
}

function playVoucherChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Celebratory chord: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)
      gain.gain.setValueAtTime(0, now + idx * 0.08)
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.08)
      osc.stop(now + idx * 0.08 + 0.65)
    })
  } catch {
    // audio not supported or blocked by browser policy
  }
}

function VoucherDetailContent({ token }: { token: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isScan = searchParams.get('scan') === '1'
  const autoClaimParam = searchParams.get('claim') === '1'

  const { applyVoucher } = useCart()
  const { showToast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [voucher, setVoucher] = useState<VoucherRecord | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null)
  const [claimStatus, setClaimStatus] = useState<
    'idle' | 'claiming' | 'claimed' | 'already_claimed' | 'already_used'
  >('idle')
  const [copied, setCopied] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [userClaimId, setUserClaimId] = useState<string | null>(null)

  // 1. Fetch Voucher and User Session
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setErrorMsg('')

        // Ambil info voucher dari Supabase
        // Bisa query lewat share_token, kode uppercase, atau id
        const cleanToken = decodeURIComponent(token).trim()

        let voucherQuery = supabase.from('vouchers').select('*')

        // Cari berdasarkan share_token terlebih dahulu
        const { data: byToken } = await voucherQuery.eq('share_token', cleanToken).maybeSingle()

        let foundVoucher: VoucherRecord | null = byToken

        if (!foundVoucher) {
          // Cari berdasarkan code
          const { data: byCode } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', cleanToken)
            .maybeSingle()
          foundVoucher = byCode
        }

        if (!foundVoucher) {
          // Fallback toleransi jika kode di database memiliki spasi ekstra (contoh: "GRANDOPENING ")
          const { data: fuzzyCodes } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', `%${cleanToken}%`)

          if (fuzzyCodes && fuzzyCodes.length > 0) {
            const exactTrimmed = fuzzyCodes.find(
              (v: VoucherRecord) => (v.code || '').trim().toUpperCase() === cleanToken.toUpperCase()
            )
            foundVoucher = exactTrimmed || fuzzyCodes[0]
          }
        }

        if (!foundVoucher && cleanToken.length === 36) {
          // Cari berdasarkan UUID id
          const { data: byId } = await supabase
            .from('vouchers')
            .select('*')
            .eq('id', cleanToken)
            .maybeSingle()
          foundVoucher = byId
        }

        if (!isMounted) return

        if (!foundVoucher) {
          setErrorMsg(`Voucher dengan tautan "${cleanToken}" tidak ditemukan atau sudah dihapus.`)
          setLoading(false)
          return
        }

        foundVoucher = {
          ...foundVoucher,
          code: foundVoucher.code.trim(),
        }

        setVoucher(foundVoucher)

        // Cek sesi user saat ini
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) return

        if (user) {
          setCurrentUser({ id: user.id, email: user.email })
          // Jika user login, jalankan proses klaim langsung (auto-claim)
          await handleAutoClaimForUser(foundVoucher, user.id)
        } else {
          setLoading(false)
        }
      } catch (err: unknown) {
        if (!isMounted) return
        console.error('Error loading voucher:', err)
        setErrorMsg('Terjadi kendala saat memuat voucher. Silakan periksa koneksi internet Anda.')
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [token, supabase])

  // Otomatis klaim ke akun jika user sudah login
  const handleAutoClaimForUser = async (v: VoucherRecord, userId: string) => {
    try {
      // 1. Cek masa berlaku & kuota
      const isExpired = new Date(v.expires_at) < new Date()
      const isQuotaFull = v.max_uses > 0 && v.current_uses >= v.max_uses

      if (!v.is_active || isExpired || isQuotaFull) {
        setLoading(false)
        return
      }

      // 2. Cek apakah sudah pernah diklaim sebelumnya
      const { data: existing } = await supabase
        .from('user_vouchers')
        .select('id, status')
        .eq('user_id', userId)
        .eq('voucher_id', v.id)
        .maybeSingle()

      if (existing) {
        setUserClaimId(existing.id)
        if (existing.status === 'used') {
          setClaimStatus('already_used')
        } else {
          setClaimStatus('already_claimed')
        }
        setLoading(false)
        return
      }

      // 3. Masukkan ke user_vouchers
      setClaimStatus('claiming')
      const { data: inserted, error: insertErr } = await supabase
        .from('user_vouchers')
        .insert({
          user_id: userId,
          voucher_id: v.id,
          voucher_code: v.code,
          status: 'claimed',
        })
        .select('id')
        .maybeSingle()

      if (insertErr) {
        console.warn('Auto claim insert err:', insertErr)
        setClaimStatus('idle')
      } else {
        if (inserted?.id) {
          setUserClaimId(inserted.id)
        }
        setClaimStatus('claimed')
        playVoucherChime()
        showToast(`🎉 Voucher ${v.code} berhasil diklaim ke akun Anda!`, 'success')
      }
    } catch (err) {
      console.error('Auto claim exception:', err)
    } finally {
      setLoading(false)
    }
  }

  // Gunakan langsung untuk pesan (Tamu / Guest / Tanpa Login)
  const handleApplyToCartAndOrder = () => {
    if (!voucher) return

    const luckyProduct =
      voucher.discount_type === 'product' && voucher.product_name
        ? getOrDrawAwardedProduct(voucher.code, voucher.product_name)
        : null

    const applied: AppliedVoucher = {
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_order: voucher.min_order,
      product_name: luckyProduct || voucher.product_name,
      product_menu_item_id: voucher.product_menu_item_id,
    }

    applyVoucher(applied, true)
    if (luckyProduct) {
      showToast(`🎉 Voucher ${voucher.code} dipasang untuk menu ${luckyProduct}!`, 'success')
    } else {
      showToast(`Voucher ${voucher.code} berhasil dipasang ke pesanan Anda!`, 'success')
    }

    // Simpan ke localStorage agar tidak hilang saat reload
    try {
      localStorage.setItem('lorong_applied_voucher_code', voucher.code)
    } catch {
      // ignore
    }

    router.push('/menu')
  }

  const handleCopyCode = () => {
    if (!voucher) return
    navigator.clipboard.writeText(voucher.code)
    setCopied(true)
    showToast(`Kode voucher "${voucher.code}" berhasil disalin!`, 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWa = () => {
    if (!voucher) return
    const currentOrigin =
      typeof window !== 'undefined' ? window.location.origin : 'https://www.lorong-rasa.my.id'
    const link = `${currentOrigin}/voucher/${voucher.share_token || voucher.code}`
    const text =
      `🎉 *Voucher Diskon Lorong Rasa!*\n\n` +
      `Gunakan voucher *${voucher.code}* untuk menikmati promo spesial di Lorong Rasa.\n` +
      `Klaim & pesan menu di sini 👉 ${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const productPool = voucher ? parseProductPool(voucher.product_name) : { isPool: false, items: [], count: 0 }
  const luckyProduct = voucher && productPool.isPool ? getOrDrawAwardedProduct(voucher.code, voucher.product_name) : null

  const discountLabel = voucher
    ? voucher.discount_type === 'percentage'
      ? `${voucher.discount_value}% OFF`
      : voucher.discount_type === 'fixed'
      ? `POTONGAN Rp ${voucher.discount_value.toLocaleString('id-ID')}`
      : productPool.isPool
      ? `${voucher.discount_value}% — 🎲 Hadiah: ${luckyProduct || 'Acak 1 Menu'}`
      : `${voucher.discount_value}% — ${voucher.product_name || 'Menu Spesial'}`
    : ''

  const isExpired = voucher ? new Date(voucher.expires_at) < new Date() : false
  const isQuotaFull = voucher ? voucher.max_uses > 0 && voucher.current_uses >= voucher.max_uses : false
  const isInactive = voucher ? !voucher.is_active : false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '90px', paddingBottom: '4rem' }}>
        <div className="container-custom" style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1rem' }}>
          {/* Header Banner jika berasal dari Scan Barcode */}
          {isScan && (
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <QrCode size={22} color="var(--color-gold)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.86rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                <strong>QR Code Berhasil Dipindai!</strong> Anda diarahkan langsung ke halaman klaim resmi voucher Lorong Rasa.
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '4rem 2rem',
                textAlign: 'center',
              }}
            >
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.5rem' }}>
                Memeriksa & Mengklaim Voucher...
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                Menghubungkan tiket voucher dengan sistem Lorong Rasa
              </p>
            </div>
          )}

          {/* Error / Not Found State */}
          {!loading && errorMsg && (
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '3rem 2rem',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={44} style={{ color: '#e85a4a', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.75rem' }}>
                Voucher Tidak Ditemukan
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-inter)', marginBottom: '2rem' }}>
                {errorMsg}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/#voucher" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                  <Tag size={16} /> Lihat Promo Aktif
                </Link>
                <Link href="/menu" className="btn-outline" style={{ fontSize: '0.85rem' }}>
                  <Coffee size={16} /> Katalog Menu
                </Link>
              </div>
            </div>
          )}

          {/* Valid Voucher View */}
          {!loading && voucher && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Status Alert (Jika berhasil diklaim, sudah ada di akun, kadaluarsa, dll) */}
              {claimStatus === 'claimed' && (
                <div
                  style={{
                    background: 'rgba(74, 158, 106, 0.12)',
                    border: '1.5px solid rgba(74, 158, 106, 0.4)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'fadeIn 0.3s ease',
                  }}
                >
                  <PartyPopper size={24} style={{ color: '#4a9e6a', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#4a9e6a', fontFamily: 'var(--font-inter)' }}>
                      🎉 Selamat! Voucher Berhasil Diklaim
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)', marginTop: '2px' }}>
                      Voucher <strong>{voucher.code}</strong> telah otomatis disimpan ke akun profil Anda dan siap digunakan saat memesan.
                    </div>
                  </div>
                </div>
              )}

              {claimStatus === 'already_claimed' && (
                <div
                  style={{
                    background: 'rgba(74, 158, 106, 0.08)',
                    border: '1px solid rgba(74, 158, 106, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <CheckCircle2 size={22} style={{ color: '#4a9e6a', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                    Voucher ini <strong>sudah tersimpan di akun Anda</strong>. Anda bisa langsung memakainya saat memesan menu!
                  </div>
                </div>
              )}

              {claimStatus === 'already_used' && (
                <div
                  style={{
                    background: 'rgba(232, 90, 74, 0.08)',
                    border: '1px solid rgba(232, 90, 74, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertCircle size={22} style={{ color: '#e85a4a', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                    Voucher ini sudah pernah Anda gunakan sebelumnya pada transaksi Anda.
                  </div>
                </div>
              )}

              {(isExpired || isQuotaFull || isInactive) && (
                <div
                  style={{
                    background: 'rgba(232, 90, 74, 0.08)',
                    border: '1px solid rgba(232, 90, 74, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertCircle size={22} style={{ color: '#e85a4a', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                    {isExpired
                      ? 'Voucher ini sudah melewati tanggal kadaluarsa.'
                      : isQuotaFull
                      ? 'Kuota penggunaan voucher ini sudah habis.'
                      : 'Voucher ini saat ini sedang dinonaktifkan oleh pengelola kafe.'}
                  </div>
                </div>
              )}

              {/* === MAIN PAPER VOUCHER CARD === */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  position: 'relative',
                }}
              >
                {/* Header Strip */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary), #d4a04a)',
                    padding: '1.5rem',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: '-30px',
                      top: '-30px',
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          opacity: 0.85,
                          fontFamily: 'monospace',
                        }}
                      >
                        OFFICIAL VOUCHER • LORONG RASA
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-playfair)', marginTop: '2px' }}>
                        {voucher.discount_type === 'product'
                          ? 'Voucher Menu Spesial'
                          : voucher.discount_type === 'percentage'
                          ? 'Voucher Diskon Persentase'
                          : 'Voucher Potongan Tunai'}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Tag size={22} color="white" />
                    </div>
                  </div>
                </div>

                {/* Perforation holes */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 -2px', background: 'var(--color-bg-card)' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-bg)', flexShrink: 0, marginLeft: '-11px' }} />
                  <div style={{ flex: 1, borderTop: '2px dashed var(--color-border)', margin: '0 8px' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-bg)', flexShrink: 0, marginRight: '-11px' }} />
                </div>

                {/* Voucher Body Details */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        NILAI KEUNTUNGAN
                      </div>
                      <div
                        style={{
                          fontSize: '2.4rem',
                          fontWeight: 900,
                          color: 'var(--color-primary)',
                          fontFamily: 'var(--font-playfair)',
                          lineHeight: 1,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {voucher.discount_type === 'percentage'
                          ? `${voucher.discount_value}% OFF`
                          : voucher.discount_type === 'fixed'
                          ? `Rp ${(voucher.discount_value / 1000).toFixed(0)}rb OFF`
                          : `${voucher.discount_value}% OFF`}
                      </div>

                      {voucher.product_name && (() => {
                        return productPool.isPool ? (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'rgba(147, 51, 234, 0.12)',
                                border: '1px solid rgba(147, 51, 234, 0.3)',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                color: '#9333ea',
                                fontWeight: 700,
                                width: 'fit-content',
                              }}
                            >
                              <span>🎲</span> Hadiah Acak Terpilih: <strong>{luckyProduct}</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              Diundi secara acak dari pilihan: {productPool.items.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(201, 100, 39, 0.1)',
                              border: '1px solid rgba(201, 100, 39, 0.25)',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '0.78rem',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                              marginTop: '8px',
                            }}
                          >
                            <Coffee size={13} />
                            Khusus Menu: {voucher.product_name}
                          </div>
                        )
                      })()}
                    </div>

                    {/* QR Code thumbnail for barista */}
                    <div
                      onClick={() => setShowQrModal(true)}
                      style={{
                        cursor: 'pointer',
                        padding: '6px',
                        background: 'white',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      title="Klik untuk perbesar QR Barista"
                    >
                      <QRCodeSVG
                        value={userClaimId ? `VOUCHER_CLAIM:${userClaimId}|${voucher.code}` : `VOUCHER:${voucher.code}`}
                        size={84}
                        bgColor="#ffffff"
                        fgColor="#2c1a0e"
                        level="M"
                      />
                      <div style={{ fontSize: '0.62rem', color: '#666', marginTop: '3px', fontWeight: 600 }}>
                        Scan di Kasir
                      </div>
                    </div>
                  </div>

                  {/* Deskripsi & Syarat */}
                  <div
                    style={{
                      background: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)', margin: '0 0 0.5rem', lineHeight: 1.45 }}>
                      {voucher.description || 'Gunakan voucher diskon ini untuk mendapatkan potongan harga spesial pada setiap pembelian Anda di Lorong Rasa.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      <div>• Minimal Belanja: {voucher.min_order > 0 ? `Rp ${voucher.min_order.toLocaleString('id-ID')}` : 'Tanpa minimum belanja'}</div>
                      <div>• Berlaku Hingga: {new Date(voucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div>• Kuota: {voucher.max_uses > 0 ? `Tersisa ${Math.max(0, voucher.max_uses - voucher.current_uses)} dari ${voucher.max_uses} kuota` : 'Tidak terbatas'}</div>
                    </div>
                  </div>

                  {/* Voucher Code Box */}
                  <div
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '2px dashed var(--color-primary)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.85rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
                        KODE VOUCHER
                      </div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.35rem', color: 'var(--color-primary)', letterSpacing: '0.12em' }}>
                        {voucher.code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: copied ? '#4a9e6a' : 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Tersalin!' : 'Salin Kode'}
                    </button>
                  </div>
                </div>

                {/* Voucher Footer Action Buttons */}
                <div
                  style={{
                    background: 'var(--color-bg-secondary)',
                    borderTop: '1px solid var(--color-border)',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {/* Action 1: Jika User Belum Login */}
                  {!currentUser && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={handleApplyToCartAndOrder}
                        disabled={isExpired || isQuotaFull || isInactive}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.85rem 1.25rem',
                          fontSize: '0.92rem',
                        }}
                      >
                        <ShoppingBag size={18} /> Pakai Sekarang & Buka Menu
                      </button>

                      <Link
                        href={`/login?redirect=${encodeURIComponent(`/voucher/${token}?scan=1`)}`}
                        className="btn-outline"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.8rem 1.25rem',
                          fontSize: '0.86rem',
                        }}
                      >
                        <LogIn size={16} /> Masuk Akun untuk Simpan Voucher Permanen
                      </Link>
                    </div>
                  )}

                  {/* Action 2: Jika User Sudah Login */}
                  {currentUser && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <button
                        type="button"
                        onClick={handleApplyToCartAndOrder}
                        disabled={isExpired || isQuotaFull || isInactive}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.85rem 1.25rem',
                          fontSize: '0.92rem',
                        }}
                      >
                        <ShoppingBag size={18} /> Gunakan Diskon & Pesan Menu
                      </button>

                      <Link
                        href="/profile"
                        className="btn-outline"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.8rem 1.25rem',
                          fontSize: '0.86rem',
                        }}
                      >
                        <User size={16} /> Buka Dompet Voucher di Profil
                      </Link>
                    </div>
                  )}

                  {/* WhatsApp Share Button */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={handleShareWa}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.6rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1px solid rgba(37, 211, 102, 0.3)',
                        color: '#25D366',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <Share2 size={14} /> Bagikan ke WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.6rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <QrCode size={14} /> Tunjukkan ke Kasir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal QR Code Besar untuk Barista / Kasir */}
      {showQrModal && voucher && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '2rem',
              maxWidth: '360px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              TUNJUKKAN KEPADA BARISTA
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#2c1a0e', fontFamily: 'var(--font-playfair)', margin: '0 0 1.25rem' }}>
              {voucher.code}
            </h3>

            <div style={{ display: 'inline-block', padding: '12px', background: '#f9f9f9', borderRadius: '16px', border: '1px solid #eee', marginBottom: '1.25rem' }}>
              <QRCodeSVG
                value={userClaimId ? `VOUCHER_CLAIM:${userClaimId}|${voucher.code}` : `VOUCHER:${voucher.code}`}
                size={210}
                bgColor="#f9f9f9"
                fgColor="#2c1a0e"
                level="H"
              />
            </div>

            <div style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.4, marginBottom: '1.5rem' }}>
              Barista akan memindai QR code ini di mesin POS kasir Lorong Rasa untuk memotong total pesanan Anda.
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Tutup QR
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default function VoucherPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        </div>
      }
    >
      <VoucherDetailContent token={resolvedParams.token} />
    </Suspense>
  )
}
