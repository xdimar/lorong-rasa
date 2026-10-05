'use client'

import { useEffect, useState, useMemo, useRef, Suspense, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Coffee,
  Tag,
  CheckCircle2,
  Sparkles,
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
  Maximize2,
  X,
  RotateCw,
  Store,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { useCart, AppliedVoucher } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { parseProductPool, getOrDrawAwardedProduct } from '@/lib/voucher-draw'
import { BarcodeSVG } from '@/components/voucher/BarcodeSVG'
import { PhysicalVoucherModal } from '@/components/voucher/PhysicalVoucherModal'

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

interface MenuItemRecord {
  id: string
  name: string
  price: number
  category: string
  image_url: string | null
  description?: string | null
}

// Sound effects menggunakan Web Audio API
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
  } catch {}
}

function playTickSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.04)
  } catch {}
}

// Animasi Confetti ringan & murni JavaScript
function triggerConfetti() {
  try {
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.inset = '0'
    container.style.pointerEvents = 'none'
    container.style.zIndex = '9999'
    container.style.overflow = 'hidden'
    document.body.appendChild(container)

    const colors = ['#d4a04a', '#c96427', '#e85a4a', '#4a9e6a', '#3b82f6', '#f59e0b', '#ec4899']
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('div')
      const size = Math.random() * 8 + 6
      el.style.position = 'absolute'
      el.style.width = `${size}px`
      el.style.height = `${size * (Math.random() > 0.5 ? 1.6 : 1)}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      el.style.top = '-20px'
      el.style.left = `${Math.random() * 100}vw`
      el.style.opacity = '1'
      el.style.transform = `rotate(${Math.random() * 360}deg)`
      el.style.transition = `all ${Math.random() * 1.5 + 1.4}s cubic-bezier(0.25, 1, 0.5, 1)`
      container.appendChild(el)

      requestAnimationFrame(() => {
        el.style.top = `${Math.random() * 70 + 25}vh`
        el.style.left = `calc(${el.style.left} + ${(Math.random() - 0.5) * 160}px)`
        el.style.opacity = '0'
        el.style.transform = `rotate(${Math.random() * 720}deg) scale(0.5)`
      })
    }

    setTimeout(() => {
      container.remove()
    }, 3200)
  } catch {}
}

function VoucherDetailContent({ token }: { token: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isScan = searchParams.get('scan') === '1'

  const { applyVoucher, addItem } = useCart()
  const { showToast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [voucher, setVoucher] = useState<VoucherRecord | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null)
  const [claimStatus, setClaimStatus] = useState<
    'idle' | 'claiming' | 'claimed' | 'already_claimed' | 'already_used'
  >('idle')
  const [copied, setCopied] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [userClaimId, setUserClaimId] = useState<string | null>(null)

  // Status Tab Redeem Mode: 'cashier' atau 'online'
  const [redeemTab, setRedeemTab] = useState<'cashier' | 'online'>('cashier')

  // Lucky Draw / Gacha Animation States
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinIndex, setSpinIndex] = useState(0)
  const [hasRevealed, setHasRevealed] = useState(false)
  const [awardedItemName, setAwardedItemName] = useState<string | null>(null)

  // 1. Fetch Voucher, Menu Items, & User Session
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setErrorMsg('')

        const cleanToken = decodeURIComponent(token).trim()

        // 1a. Query voucher
        let voucherQuery = supabase.from('vouchers').select('*')
        const { data: byToken } = await voucherQuery.eq('share_token', cleanToken).maybeSingle()

        let foundVoucher: VoucherRecord | null = byToken

        if (!foundVoucher) {
          const { data: byCode } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', cleanToken)
            .maybeSingle()
          foundVoucher = byCode
        }

        if (!foundVoucher) {
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

        // 1b. Fetch Menu Items untuk gambar & harga produk
        const { data: menus } = await supabase
          .from('menu_items')
          .select('id, name, price, category, image_url, description')
          .eq('is_available', true)

        if (menus && isMounted) {
          setMenuItems(menus)
        }

        // 1c. Hitung / Undi Produk Beruntung jika voucher produk
        let initialAwarded: string | null = null
        if (foundVoucher.discount_type === 'product' && foundVoucher.product_name) {
          const pool = parseProductPool(foundVoucher.product_name)
          if (pool.isPool) {
            initialAwarded = getOrDrawAwardedProduct(foundVoucher.code, foundVoucher.product_name)
            setAwardedItemName(initialAwarded)
            // Cek apakah sudah pernah reveal di session ini
            const sessionKey = `lorong_revealed_${foundVoucher.code}`
            const alreadySeen = typeof window !== 'undefined' ? sessionStorage.getItem(sessionKey) : null
            if (alreadySeen) {
              setHasRevealed(true)
            } else {
              // Otomatis jalankan animasi reveal seru pada kunjungan pertama!
              setTimeout(() => {
                triggerLuckySpin(pool.items, initialAwarded)
              }, 400)
            }
          } else {
            setAwardedItemName(foundVoucher.product_name)
            setHasRevealed(true)
          }
        } else {
          setHasRevealed(true)
        }

        // 1d. Cek sesi user saat ini
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted) return

        if (user) {
          setCurrentUser({ id: user.id, email: user.email })
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
      const isExpired = new Date(v.expires_at) < new Date()
      const isQuotaFull = v.max_uses > 0 && v.current_uses >= v.max_uses

      if (!v.is_active || isExpired || isQuotaFull) {
        setLoading(false)
        return
      }

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

  // Fungsi Menjalankan Animasi Slot Machine / Mystery Prize Draw
  const triggerLuckySpin = (poolItems: string[], targetAwarded: string | null) => {
    if (!poolItems || poolItems.length <= 1) {
      setHasRevealed(true)
      return
    }

    setIsSpinning(true)
    setHasRevealed(false)

    const finalTarget = targetAwarded || poolItems[0]
    const targetIdx = poolItems.findIndex(
      (item) => item.toLowerCase() === finalTarget.toLowerCase()
    )
    const effectiveTargetIdx = targetIdx >= 0 ? targetIdx : 0

    let current = 0
    let speed = 65
    let totalTicks = 0
    const maxTicks = 28

    const tick = () => {
      current = (current + 1) % poolItems.length
      setSpinIndex(current)
      playTickSound()
      totalTicks++

      if (totalTicks < maxTicks - 8) {
        // Kecepatan tinggi
        setTimeout(tick, speed)
      } else if (totalTicks < maxTicks) {
        // Melambat (deceleration)
        speed += 40
        setTimeout(tick, speed)
      } else {
        // SNAP ke item target pemenang!
        setSpinIndex(effectiveTargetIdx)
        setAwardedItemName(finalTarget)
        setIsSpinning(false)
        setHasRevealed(true)

        // Mainkan sound & semburkan confetti
        playVoucherChime()
        triggerConfetti()

        if (voucher) {
          try {
            sessionStorage.setItem(`lorong_revealed_${voucher.code}`, '1')
          } catch {}
        }
      }
    }

    setTimeout(tick, speed)
  }

  // Pool info & item pemenang
  const productPool = useMemo(() => {
    return voucher ? parseProductPool(voucher.product_name) : { isPool: false, items: [], count: 0 }
  }, [voucher])

  const awardedProductInfo = useMemo(() => {
    const name = awardedItemName || (voucher?.discount_type === 'product' ? voucher.product_name : null)
    if (!name) return null
    return (
      menuItems.find((m) => m.name.toLowerCase() === name.toLowerCase()) || {
        id: voucher?.product_menu_item_id || 'prod-voucher',
        name,
        price: 15000,
        category: 'Specialty',
        image_url: null,
      }
    )
  }, [awardedItemName, voucher, menuItems])

  // Tombol 1: Tukarkan Langsung Checkout di Website (Online)
  const handleDirectOnlineCheckout = () => {
    if (!voucher) return

    const effectiveProductName = awardedItemName || voucher.product_name

    // 1. Jika voucher produk, masukkan menu pemenang ke keranjang jika belum ada
    if (voucher.discount_type === 'product' && effectiveProductName) {
      const targetItem = awardedProductInfo || {
        id: voucher.product_menu_item_id || 'prod-voucher',
        name: effectiveProductName,
        price: 15000,
        category: 'Specialty',
        image_url: null,
      }

      addItem(
        {
          id: targetItem.id,
          name: targetItem.name,
          price: targetItem.price,
          category: targetItem.category,
          image_url: targetItem.image_url,
        },
        1
      )
    }

    // 2. Pasang voucher ke CartProvider
    const applied: AppliedVoucher = {
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_order: voucher.min_order,
      product_name: effectiveProductName,
      product_menu_item_id: awardedProductInfo ? awardedProductInfo.id : voucher.product_menu_item_id,
    }

    applyVoucher(applied, true)

    try {
      localStorage.setItem('lorong_applied_voucher_code', voucher.code)
    } catch {}

    showToast(`🎉 Diskon voucher ${voucher.code} terpasang! Membuka halaman checkout...`, 'success')

    // 3. Langsung arahkan ke halaman checkout
    router.push('/checkout')
  }

  // Tombol Salin Kode
  const handleCopyCode = () => {
    if (!voucher) return
    navigator.clipboard.writeText(voucher.code)
    setCopied(true)
    showToast(`Kode voucher "${voucher.code}" berhasil disalin!`, 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = voucher ? new Date(voucher.expires_at) < new Date() : false
  const isQuotaFull = voucher ? voucher.max_uses > 0 && voucher.current_uses >= voucher.max_uses : false
  const isInactive = voucher ? !voucher.is_active : false

  const siteOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://www.lorong-rasa.my.id'
  const shareUrl = voucher
    ? `${siteOrigin}/voucher/${voucher.share_token || voucher.code}`
    : siteOrigin

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <Navbar />

      <main style={{ flex: 1, paddingTop: '86px', paddingBottom: '5rem' }}>
        <div className="container-custom" style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1rem' }}>
          {/* Header Banner jika berasal dari Scan Barcode */}
          {isScan && (
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.12)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <QrCode size={22} color="var(--color-gold)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.86rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                <strong>QR Code Berhasil Dipindai!</strong> Anda diarahkan ke halaman klaim resmi Lorong Rasa.
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
                Memeriksa & Menyiapkan Voucher...
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                Menghubungkan tiket voucher dengan sistem kafe Lorong Rasa
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Alert Status (Klaim berhasil / sudah dipakai / kadaluarsa) */}
              {claimStatus === 'claimed' && (
                <div
                  style={{
                    background: 'rgba(74, 158, 106, 0.12)',
                    border: '1.5px solid rgba(74, 158, 106, 0.4)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <PartyPopper size={22} style={{ color: '#4a9e6a', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#4a9e6a' }}>
                      🎉 Selamat! Voucher Tersimpan di Akun Anda
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text)', marginTop: '2px' }}>
                      Voucher <strong>{voucher.code}</strong> telah otomatis disimpan dan siap digunakan saat memesan.
                    </div>
                  </div>
                </div>
              )}

              {(isExpired || isQuotaFull || isInactive) && (
                <div
                  style={{
                    background: 'rgba(232, 90, 74, 0.08)',
                    border: '1px solid rgba(232, 90, 74, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <AlertCircle size={22} style={{ color: '#e85a4a', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                    {isExpired
                      ? 'Voucher ini sudah melewati tanggal kadaluarsa.'
                      : isQuotaFull
                      ? 'Kuota penggunaan voucher ini sudah habis.'
                      : 'Voucher ini saat ini sedang dinonaktifkan oleh kafe.'}
                  </div>
                </div>
              )}

              {/* === SECTION 1: ANIMASI LUCKY REVEAL / PRIZE SHOWCASE === */}
              {voucher.discount_type === 'product' && (
                <div
                  style={{
                    background: 'linear-gradient(145deg, rgba(32, 20, 13, 0.95), rgba(18, 12, 8, 0.98))',
                    border: '1.5px solid rgba(212, 160, 74, 0.45)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                    textAlign: 'center',
                  }}
                >
                  {/* Efek Lingkaran Cahaya Glow */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '20%',
                      transform: 'translate(-50%, -50%)',
                      width: '240px',
                      height: '240px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Header Undian / Hadiah */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: 'rgba(212, 160, 74, 0.2)',
                      border: '1px solid rgba(212, 160, 74, 0.5)',
                      color: '#f5c369',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Sparkles size={12} />
                    {productPool.isPool ? 'LUCKY PRIZE DRAW' : 'HADIAH SPESIAL VOUCHER'}
                  </div>

                  {/* KONDISI A: Sedang Memutar Animasi (Spinning / Decelerating) */}
                  {isSpinning && (
                    <div style={{ padding: '1.5rem 0' }}>
                      <div
                        style={{
                          width: '130px',
                          height: '130px',
                          margin: '0 auto 1.25rem',
                          borderRadius: '24px',
                          background: 'rgba(212, 160, 74, 0.15)',
                          border: '2px dashed #d4a04a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
                          transform: 'scale(1.05)',
                          transition: 'transform 0.1s',
                        }}
                      >
                        {/* Gambar item bergulir cepat */}
                        {(() => {
                          const currentName = productPool.items[spinIndex] || 'Menu'
                          const currentItem = menuItems.find(
                            (m) => m.name.toLowerCase() === currentName.toLowerCase()
                          )
                          return currentItem?.image_url ? (
                            <Image
                              src={currentItem.image_url}
                              alt={currentName}
                              fill
                              sizes="130px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Coffee size={56} style={{ color: '#d4a04a' }} />
                          )
                        })()}
                      </div>

                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          letterSpacing: '0.04em',
                          minHeight: '32px',
                        }}
                      >
                        {productPool.items[spinIndex]}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#d4a04a', marginTop: '4px' }}>
                        Mengundi hadiah acak spesialmu...
                      </div>
                    </div>
                  )}

                  {/* KONDISI B: Sudah Terungkap (Revealed / Single Product) */}
                  {!isSpinning && hasRevealed && awardedProductInfo && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <h2
                        style={{
                          fontFamily: 'var(--font-playfair), Georgia, serif',
                          fontSize: '1.35rem',
                          color: '#ffffff',
                          margin: '0 0 0.85rem',
                          fontWeight: 800,
                        }}
                      >
                        🎉 Selamat! Anda Mendapatkan:
                      </h2>

                      {/* Card Gambar & Info Produk Pemenang */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '380px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1.5px solid rgba(212, 160, 74, 0.4)',
                          borderRadius: '18px',
                          padding: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          textAlign: 'left',
                          marginBottom: '1rem',
                        }}
                      >
                        {/* Foto Produk */}
                        <div
                          style={{
                            width: '84px',
                            height: '84px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            position: 'relative',
                            flexShrink: 0,
                            background: 'rgba(212, 160, 74, 0.15)',
                            border: '1px solid rgba(212, 160, 74, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {awardedProductInfo.image_url ? (
                            <Image
                              src={awardedProductInfo.image_url}
                              alt={awardedProductInfo.name}
                              fill
                              sizes="84px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <Coffee size={36} style={{ color: '#d4a04a' }} />
                          )}
                        </div>

                        {/* Nama & Harga Promo */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              color: '#5cd685',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            {productPool.isPool ? '🎲 Hadiah Acak Terpilih' : '✨ Menu Spesial'}
                          </span>
                          <h3
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              margin: '2px 0 6px',
                              lineHeight: 1.3,
                            }}
                          >
                            {awardedProductInfo.name}
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            {awardedProductInfo.price > 0 && (
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'rgba(255,255,255,0.45)',
                                  textDecoration: 'line-through',
                                }}
                              >
                                Rp {awardedProductInfo.price.toLocaleString('id-ID')}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '1.05rem',
                                fontWeight: 900,
                                color: '#5cd685',
                              }}
                            >
                              {voucher.discount_value === 100
                                ? 'GRATIS (Rp 0)'
                                : `Diskon ${voucher.discount_value}%`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Putar Ulang jika Multi-product Pool */}
                      {productPool.isPool && (
                        <button
                          type="button"
                          onClick={() => triggerLuckySpin(productPool.items, awardedItemName)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'rgba(255, 255, 255, 0.75)',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <RotateCw size={13} /> Putar Ulang Animasi Undian
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === SECTION 2: DUA OPSI PENUKARAN (KASIR vs ONLINE CHECKOUT) === */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {/* Tab Switcher: Kasir vs Checkout Website */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-bg-secondary)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRedeemTab('cashier')}
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      background: redeemTab === 'cashier' ? 'var(--color-bg-card)' : 'transparent',
                      color: redeemTab === 'cashier' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: 'none',
                      borderBottom: redeemTab === 'cashier' ? '3px solid var(--color-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Store size={18} />
                    Tukarkan di Kasir
                  </button>

                  <button
                    type="button"
                    onClick={() => setRedeemTab('online')}
                    style={{
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      background: redeemTab === 'online' ? 'var(--color-bg-card)' : 'transparent',
                      color: redeemTab === 'online' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: 'none',
                      borderBottom: redeemTab === 'online' ? '3px solid var(--color-primary)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <ShoppingBag size={18} />
                    Pesan di Website
                  </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* === OPSI A: PENUKARAN DI KASIR VIA BARCODE / KODE VOUCHER === */}
                  {redeemTab === 'cashier' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          SCAN BARCODE ATAU TUNJUKKAN KODE KE BARISTA
                        </span>
                        <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', margin: '4px 0 8px' }}>
                          Tunjukkan ke Kasir Lorong Rasa
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                          Barista akan memindai barcode / QR code di bawah ini atau menginput kode voucher untuk memotong total pesanan Anda.
                        </p>
                      </div>

                      {/* Box Barcode 1D & QR Code Kasir */}
                      <div
                        style={{
                          background: '#ffffff',
                          borderRadius: '16px',
                          border: '1.5px solid #e0d8cc',
                          padding: '1.25rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '1rem',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* Barcode 1D */}
                        <div style={{ width: '100%', maxWidth: '340px' }}>
                          <BarcodeSVG code={voucher.code} height={60} width="100%" />
                        </div>

                        {/* Baris Kode Voucher + QR Code Kecil */}
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '340px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.85rem',
                            background: '#faf7f2',
                            borderRadius: '10px',
                            border: '1px dashed #c96427',
                          }}
                        >
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.62rem', color: '#888', fontWeight: 700, letterSpacing: '0.08em' }}>
                              KODE VOUCHER
                            </div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.25rem', color: '#c96427', letterSpacing: '0.12em' }}>
                              {voucher.code}
                            </div>
                          </div>

                          <div
                            onClick={() => setShowQrModal(true)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              background: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #ddd',
                              cursor: 'pointer',
                            }}
                            title="Perbesar QR"
                          >
                            <QRCodeSVG
                              value={userClaimId ? `VOUCHER_CLAIM:${userClaimId}|${voucher.code}` : `VOUCHER:${voucher.code}`}
                              size={38}
                              bgColor="#ffffff"
                              fgColor="#1a1412"
                              level="M"
                            />
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#333' }}>Perbesar</div>
                              <div style={{ fontSize: '0.58rem', color: '#888' }}>QR Kasir</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Salin Kode & Perbesar Layar */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: copied ? '#4a9e6a' : 'var(--color-bg-secondary)',
                            border: copied ? '1px solid #4a9e6a' : '1px solid var(--color-border)',
                            color: copied ? '#ffffff' : 'var(--color-text)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? 'Kode Tersalin!' : 'Salin Kode Voucher'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Maximize2 size={16} /> Mode Layar Kasir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* === OPSI B: LANGSUNG CHECKOUT DI WEBSITE === */}
                  {redeemTab === 'online' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div
                        style={{
                          background: 'rgba(201, 100, 39, 0.08)',
                          border: '1px solid rgba(201, 100, 39, 0.25)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px' }}>
                          <ShoppingBag size={18} />
                          Pesan Online &amp; Diskon Terpasang Otomatis
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>
                          {voucher.discount_type === 'product' ? (
                            <>
                              Menu <strong>{awardedProductInfo?.name || voucher.product_name}</strong> akan otomatis dimasukkan ke keranjang dengan diskon potongan <strong>{voucher.discount_value === 100 ? 'GRATIS 100%' : `${voucher.discount_value}%`}</strong>!
                            </>
                          ) : (
                            <>
                              Voucher <strong>{voucher.code}</strong> akan langsung terpasang pada ringkasan pesanan Anda saat checkout.
                            </>
                          )}
                        </p>
                      </div>

                      {/* Tombol Utama Langsung Checkout */}
                      <button
                        type="button"
                        onClick={handleDirectOnlineCheckout}
                        disabled={isExpired || isQuotaFull || isInactive}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.95rem 1.25rem',
                          fontSize: '0.96rem',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-lg)',
                          boxShadow: '0 6px 20px rgba(201, 100, 39, 0.35)',
                        }}
                      >
                        <ShoppingBag size={18} />
                        Pesan &amp; Langsung Checkout Sekarang
                      </button>

                      {/* Opsi Buka Katalog Menu Dulu */}
                      <Link
                        href="/menu"
                        className="btn-outline"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.8rem 1.25rem',
                          fontSize: '0.86rem',
                        }}
                      >
                        <Coffee size={16} /> Buka Menu Lain Terlebih Dahulu
                      </Link>
                    </div>
                  )}

                  {/* Garis Pembatas Syarat & Ketentuan */}
                  <div
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '0.85rem',
                      fontSize: '0.76rem',
                      color: 'var(--color-text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div>• <strong>Masa Berlaku:</strong> Hingga {new Date(voucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div>• <strong>Minimal Order:</strong> {voucher.min_order > 0 ? `Rp ${voucher.min_order.toLocaleString('id-ID')}` : 'Tanpa minimal order'}</div>
                    {voucher.description && <div>• <strong>Ketentuan:</strong> {voucher.description}</div>}
                  </div>

                  {/* Tombol Bagikan ke WhatsApp (Munculkan Kartu Voucher Fisik) */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowShareModal(true)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '0.8rem 1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(37, 211, 102, 0.12)',
                        border: '1.5px solid rgba(37, 211, 102, 0.4)',
                        color: '#25D366',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <Share2 size={17} /> Bagikan Kartu Voucher ke WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* === MODAL FULLSCREEN QR & BARCODE KASIR (HIGH CONTRAST & SCROLLABLE) === */}
      {showQrModal && voucher && (
        <div
          onClick={() => setShowQrModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 1rem',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '1.75rem 1.25rem 1.5rem',
              maxWidth: '390px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              color: '#1a1412',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 'auto',
            }}
          >
            {/* Tombol Tutup X di Pojok Kanan Atas */}
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              aria-label="Tutup"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#f2ece4',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2c1a0e',
                cursor: 'pointer',
                transition: 'background 0.2s',
                zIndex: 2,
              }}
            >
              <X size={18} />
            </button>

            <div style={{ fontSize: '0.68rem', color: '#888', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '2px', paddingRight: '28px' }}>
              TUNJUKKAN KEPADA BARISTA
            </div>
            <h3 style={{ fontSize: '1.35rem', color: '#1a1412', fontFamily: 'var(--font-playfair)', margin: '0 0 0.85rem' }}>
              {voucher.code}
            </h3>

            {/* Barcode 1D */}
            <div style={{ marginBottom: '0.85rem', width: '100%' }}>
              <BarcodeSVG code={voucher.code} height={56} width="100%" />
            </div>

            {/* QR Code */}
            <div
              style={{
                display: 'inline-block',
                padding: '10px',
                background: '#f9f9f9',
                borderRadius: '16px',
                border: '1px solid #eee',
                marginBottom: '0.85rem',
              }}
            >
              <QRCodeSVG
                value={userClaimId ? `VOUCHER_CLAIM:${userClaimId}|${voucher.code}` : `VOUCHER:${voucher.code}`}
                size={150}
                bgColor="#f9f9f9"
                fgColor="#1a1412"
                level="H"
              />
            </div>

            <div style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.4, marginBottom: '1rem' }}>
              Barista akan memindai barcode / QR code ini di mesin kasir POS Lorong Rasa untuk memotong pesanan Anda.
            </div>

            {/* Aksi di dalam modal: Share ke WhatsApp, Salin Kode, & Tutup */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false)
                  setShowShareModal(true)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(37, 211, 102, 0.35)',
                }}
              >
                <Share2 size={16} />
                Bagikan Voucher ke WhatsApp
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: copied ? '#4a9e6a' : '#f4ede4',
                    border: '1px solid #e0d8cc',
                    color: copied ? '#ffffff' : '#2c1a0e',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Tersalin!' : 'Salin Kode'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: '#2c1a0e',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Tutup Kasir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL SHARE KARTU VOUCHER FISIK === */}
      {voucher && (
        <PhysicalVoucherModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          voucher={voucher}
          awardedProduct={awardedItemName}
          productPoolItems={productPool.items}
          siteUrl={siteOrigin}
        />
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
