'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Sparkles,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Gift,
  Copy,
  Check,
  Clock,
  Flame,
  Share2,
  ChevronLeft,
  ChevronRight,
  X,
  Coffee,
  CheckCircle2,
  Smartphone,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { parseProductPool, getOrDrawAwardedProduct } from '@/lib/voucher-draw'

// Synthesize realistic paper tear sound via Web Audio API
function playTicketTearSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const bufferSize = Math.floor(ctx.sampleRate * 0.22)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1600, ctx.currentTime)
    filter.Q.setValueAtTime(3.5, ctx.currentTime)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.01, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start()
    noise.stop(ctx.currentTime + 0.22)
  } catch {
    // Ignore audio error
  }
}

// Synthesize pleasant celebratory chime on voucher claim
function playSuccessChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Harmonious chord notes (C6, E6, G6)
    const notes = [1046.5, 1318.5, 1567.98]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + idx * 0.07)

      gain.gain.setValueAtTime(0, now + idx * 0.07)
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.07 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.55)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.07)
      osc.stop(now + idx * 0.07 + 0.6)
    })
  } catch {
    // Ignore audio error
  }
}

function triggerTicketHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([18, 40, 25])
    } catch {
      // Ignore
    }
  }
}

type DiscountType = 'percentage' | 'fixed' | 'product'

interface Voucher {
  id: string
  code: string
  description: string
  discount_type: DiscountType
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

function formatIndoDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getDaysRemaining(dateStr: string) {
  try {
    const diff = new Date(dateStr).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Hari terakhir!'
    if (days === 1) return 'Tersisa 1 hari lagi!'
    return `Tersisa ${days} hari`
  } catch {
    return ''
  }
}

interface MenuItemInfo {
  id: string
  name: string
  price: number
  category: string
  image_url: string | null
  description?: string | null
}

export function VoucherSection() {
  const router = useRouter()
  const { items, applyVoucher, addItem, openCart } = useCart()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [isTearing, setIsTearing] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)

  // Celebration & Cashier QR modal
  const [activeModal, setActiveModal] = useState<{
    voucher: Voucher
    mode: 'claimed' | 'qr'
    savedToAccount: boolean
    isLuckyDraw?: boolean
    luckyPoolCount?: number
    luckyPoolItems?: string[]
  } | null>(null)
  const [modalTab, setModalTab] = useState<'voucher' | 'qr'>('voucher')

  const modalTargetProduct =
    activeModal && activeModal.voucher.discount_type === 'product'
      ? menuItems.find(
          (m) =>
            (activeModal.voucher.product_menu_item_id &&
              m.id === activeModal.voucher.product_menu_item_id) ||
            (activeModal.voucher.product_name &&
              m.name.toLowerCase() ===
                activeModal.voucher.product_name.toLowerCase())
        ) || null
      : null

  const handleClaimWithAnimation = async (voucher: Voucher) => {
    if (isTearing) return
    setIsTearing(true)
    playTicketTearSound()
    triggerTicketHaptic()

    // 0. Undi produk acak jika voucher produk memiliki beberapa pilihan
    let effectiveVoucher = voucher
    let isLuckyDraw = false
    let luckyPoolCount = 0
    let luckyPoolItems: string[] = []

    if (voucher.discount_type === 'product' && voucher.product_name) {
      const pool = parseProductPool(voucher.product_name)
      if (pool.isPool) {
        isLuckyDraw = true
        luckyPoolCount = pool.count
        luckyPoolItems = pool.items
        const drawn = getOrDrawAwardedProduct(voucher.code, voucher.product_name)
        if (drawn) {
          const matchedItem = menuItems.find(
            (m) => m.name.toLowerCase() === drawn.toLowerCase()
          )
          effectiveVoucher = {
            ...voucher,
            product_name: drawn,
            product_menu_item_id: matchedItem ? matchedItem.id : null,
          }
        }
      }
    }

    // 1. Copy code to clipboard immediately
    try {
      await navigator.clipboard.writeText(voucher.code)
      setCopiedCode(voucher.code)
    } catch {}

    // 2. Pre-apply voucher to cart immediately (menggunakan menu hasil undian acak)
    applyVoucher(
      {
        code: effectiveVoucher.code,
        discount_type: effectiveVoucher.discount_type,
        discount_value: effectiveVoucher.discount_value,
        min_order: effectiveVoucher.min_order,
        product_name: effectiveVoucher.product_name,
        product_menu_item_id: effectiveVoucher.product_menu_item_id,
      },
      true
    )

    // 3. Check Supabase user and silently register to user_vouchers if logged in
    let savedToAccount = false
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: existing } = await supabase
          .from('user_vouchers')
          .select('id')
          .eq('user_id', user.id)
          .eq('voucher_id', voucher.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('user_vouchers').insert({
            user_id: user.id,
            voucher_id: voucher.id,
            voucher_code: voucher.code,
            status: 'claimed',
          })
        }
        savedToAccount = true
      } else {
        try {
          const guestVouchers = JSON.parse(
            localStorage.getItem('lorong-rasa-guest-vouchers') || '[]'
          )
          if (!guestVouchers.includes(voucher.code)) {
            guestVouchers.push(voucher.code)
            localStorage.setItem(
              'lorong-rasa-guest-vouchers',
              JSON.stringify(guestVouchers)
            )
          }
        } catch {}
      }
    } catch (err) {
      console.error('Silent voucher sync error:', err)
    }

    // 4. Ticket tear animation finishes and stamp slams
    setTimeout(() => {
      setIsClaimed(true)
    }, 380)

    // 5. Open Celebration Modal right on the landing page!
    setTimeout(() => {
      playSuccessChime()
      setModalTab('voucher')
      setActiveModal({
        voucher: effectiveVoucher,
        mode: 'claimed',
        savedToAccount,
        isLuckyDraw,
        luckyPoolCount,
        luckyPoolItems,
      })
      setIsTearing(false)
    }, 900)
  }

  const handleOpenQRModal = (voucher: Voucher) => {
    let effectiveVoucher = voucher
    let isLuckyDraw = false
    let luckyPoolCount = 0
    let luckyPoolItems: string[] = []

    if (voucher.discount_type === 'product' && voucher.product_name) {
      const pool = parseProductPool(voucher.product_name)
      if (pool.isPool) {
        isLuckyDraw = true
        luckyPoolCount = pool.count
        luckyPoolItems = pool.items
        const drawn = getOrDrawAwardedProduct(voucher.code, voucher.product_name)
        if (drawn) {
          const matchedItem = menuItems.find(
            (m) => m.name.toLowerCase() === drawn.toLowerCase()
          )
          effectiveVoucher = {
            ...voucher,
            product_name: drawn,
            product_menu_item_id: matchedItem ? matchedItem.id : null,
          }
        }
      }
    }

    setModalTab('qr')
    setActiveModal({
      voucher: effectiveVoucher,
      mode: 'qr',
      savedToAccount: false,
      isLuckyDraw,
      luckyPoolCount,
      luckyPoolItems,
    })
  }

  const handleUseProductVoucher = (
    voucher: Voucher,
    product?: MenuItemInfo | null
  ) => {
    // 1. Tentukan target item menu yang akan ditambahkan ke keranjang
    const targetItem = product || {
      id: voucher.product_menu_item_id || 'prod-voucher',
      name: voucher.product_name || 'Menu Spesial',
      price: 10000,
      category: 'Snack',
      image_url: null,
    }

    // 2. Tambahkan ke keranjang (jika belum ada di keranjang)
    const existing = items.find(
      (i) =>
        i.id === targetItem.id ||
        (targetItem.name && i.name.toLowerCase() === targetItem.name.toLowerCase())
    )
    if (!existing) {
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

    // 3. Pasangkan voucher ke CartProvider
    applyVoucher(
      {
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_order: voucher.min_order,
        product_name: voucher.product_name,
        product_menu_item_id: targetItem.id,
      },
      true
    )

    // 4. Tutup pop-up
    setActiveModal(null)

    // 5. Langsung buka keranjang belanja (CartDrawer) dengan nominal terpotong voucher
    setTimeout(() => {
      openCart()
    }, 120)
  }

  const handleOrderNow = (voucher: Voucher) => {
    setActiveModal(null)
    if (items.length > 0) {
      openCart()
    } else {
      const menuEl = document.getElementById('menu')
      if (menuEl) {
        menuEl.scrollIntoView({ behavior: 'smooth' })
      } else {
        router.push('/menu')
      }
    }
  }

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.lorong-rasa.my.id'

  useEffect(() => {
    async function loadActiveVouchers() {
      try {
        const supabase = createClient()
        const [{ data: vData, error: vErr }, { data: mData }] =
          await Promise.all([
            supabase
              .from('vouchers')
              .select('*')
              .eq('is_active', true)
              .order('created_at', { ascending: false }),
            supabase
              .from('menu_items')
              .select('id, name, price, category, image_url, description')
              .eq('is_available', true),
          ])

        if (!vErr && vData) {
          const now = new Date()
          const activeList = (vData as Voucher[]).filter((v) => {
            const exp = new Date(v.expires_at)
            return exp >= now
          })
          setVouchers(activeList)
        }
        if (mData) {
          setMenuItems(mData as MenuItemInfo[])
        }
      } catch (err) {
        console.error('Error fetching vouchers/menu for landing page:', err)
      } finally {
        setLoading(false)
      }
    }

    loadActiveVouchers()
  }, [])

  const currentVoucher = vouchers[activeIndex] || null

  const maxDiscountHighlight = useMemo(() => {
    if (!vouchers.length) return null
    // Cek apakah ada diskon produk 100%
    const productPromo = vouchers.find(
      (v) => v.discount_type === 'product' && v.discount_value === 100
    )
    if (productPromo) return { type: 'product', text: 'Gratis Menu Spesial' }

    // Cari diskon persentase tertinggi
    const pct = vouchers
      .filter((v) => v.discount_type === 'percentage')
      .sort((a, b) => b.discount_value - a.discount_value)[0]
    if (pct) return { type: 'percentage', text: `${pct.discount_value}%` }

    // Fixed amount tertinggi
    const fixed = vouchers
      .filter((v) => v.discount_type === 'fixed')
      .sort((a, b) => b.discount_value - a.discount_value)[0]
    if (fixed)
      return {
        type: 'fixed',
        text: `Rp ${fixed.discount_value.toLocaleString('id-ID')}`,
      }

    return null
  }, [vouchers])

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleShareLink = (voucher: Voucher) => {
    const claimLink = `${siteUrl}/profile?claim=${encodeURIComponent(voucher.code)}`
    navigator.clipboard.writeText(claimLink)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  const features = [
    {
      icon: ShieldCheck,
      title: '1 Akun, 1 Kuota Terverifikasi',
      desc: 'Setiap klaim tercatat secara valid, adil, dan tersimpan aman di dompet profil akunmu.',
      color: '#4a9e6a',
    },
    {
      icon: QrCode,
      title: 'Scan & Tukar Langsung di Kasir Cafe',
      desc: 'Cukup tunjukkan kode voucher atau barcode di layar HP kepada barista saat bertransaksi di kasir Lorong Rasa Wajak.',
      color: 'var(--color-primary)',
    },
    {
      icon: Gift,
      title: 'Otomatis di Pesanan Online',
      desc: 'Voucher yang telah diklaim otomatis muncul dan dapat langsung dipasangkan saat checkout menu dine-in maupun delivery.',
      color: 'var(--color-gold)',
    },
  ]

  return (
    <section
      id="voucher"
      className="section-padding"
      style={{
        background: 'var(--color-bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, var(--color-primary-glow) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-custom" style={{ position: 'relative' }}>
        <AnimateOnScroll animation="fade-up">
          <div
            style={{
              background:
                'linear-gradient(145deg, var(--color-bg-card), var(--color-bg-secondary))',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(2rem, 5vw, 3.5rem)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Decorative corner glow */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 65%)',
                transform: 'translate(30%, -30%)',
                pointerEvents: 'none',
              }}
            />

            {/* Badges Bar — Real Database Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '1.5rem',
              }}
            >
              {/* Status Indicator */}
              {!loading && vouchers.length > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(74, 158, 106, 0.12)',
                    color: '#4a9e6a',
                    border: '1px solid rgba(74, 158, 106, 0.3)',
                    borderRadius: '50px',
                    padding: '5px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-inter)',
                    letterSpacing: '0.04em',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4a9e6a',
                      boxShadow: '0 0 10px #4a9e6a',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  {vouchers.length} Voucher Aktif
                </div>
              )}

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-primary-glow)',
                  color: 'var(--color-primary)',
                  borderRadius: '50px',
                  padding: '5px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-inter)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={13} />
                Promo Resmi Cafe
              </div>

              {currentVoucher && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(232, 90, 74, 0.1)',
                    color: '#e85a4a',
                    border: '1px solid rgba(232, 90, 74, 0.25)',
                    borderRadius: '50px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <Flame size={13} />
                  {getDaysRemaining(currentVoucher.expires_at)}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
                gap: '2.5rem',
                alignItems: 'center',
              }}
            >
              {/* Left Column: Heading, Subtitle & Interactive Real Voucher Card */}
              <div>
                <h2
                  style={{
                    fontSize: 'clamp(1.75rem, 3.8vw, 2.7rem)',
                    fontFamily: 'var(--font-playfair)',
                    marginBottom: '0.75rem',
                    lineHeight: 1.2,
                    color: 'var(--color-text)',
                  }}
                >
                  {maxDiscountHighlight ? (
                    <>
                      Nikmati{' '}
                      <span
                        style={{
                          background:
                            'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {maxDiscountHighlight.text}
                      </span>{' '}
                      &mdash; Voucher Resmi Lorong Rasa
                    </>
                  ) : (
                    <>
                      Klaim Voucher Resmi{' '}
                      <span
                        style={{
                          background:
                            'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        Lorong Rasa
                      </span>
                    </>
                  )}
                </h2>

                <p
                  style={{
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '0.93rem',
                    lineHeight: 1.7,
                    marginBottom: '1.5rem',
                    maxWidth: '460px',
                  }}
                >
                  {vouchers.length > 0
                    ? 'Voucher resmi yang siap kamu gunakan. Salin kodenya, klaim langsung ke dompet akun profilmu, atau scan saat transaksi di kasir cafe!'
                    : 'Nantikan promo spesial berikutnya! Daftar akun sekarang agar kamu siap mengklaim voucher begitu periode rilis tiba.'}
                </p>

                {/* Multiple Vouchers Switcher Tabs (if more than 1 voucher exists) */}
                {vouchers.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '1.25rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-inter)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Pilih Promo:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {vouchers.map((v, i) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setActiveIndex(i)
                            setIsClaimed(false)
                            setIsTearing(false)
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            border:
                              activeIndex === i
                                ? '1.5px solid var(--color-primary)'
                                : '1px solid var(--color-border)',
                            background:
                              activeIndex === i
                                ? 'var(--color-primary-glow)'
                                : 'var(--color-bg)',
                            color:
                              activeIndex === i
                                ? 'var(--color-primary)'
                                : 'var(--color-text)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {v.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                  <div
                    style={{
                      background: 'var(--color-bg-secondary)',
                      borderRadius: '16px',
                      padding: '2rem',
                      maxWidth: '420px',
                      border: '1px dashed var(--color-border)',
                      marginBottom: '1.75rem',
                      animation: 'pulse 1.5s infinite',
                    }}
                  >
                    <div
                      style={{
                        height: '14px',
                        width: '40%',
                        background: 'var(--color-border)',
                        borderRadius: '4px',
                        marginBottom: '12px',
                      }}
                    />
                    <div
                      style={{
                        height: '36px',
                        width: '70%',
                        background: 'var(--color-border)',
                        borderRadius: '6px',
                        marginBottom: '16px',
                      }}
                    />
                    <div
                      style={{
                        height: '12px',
                        width: '90%',
                        background: 'var(--color-border)',
                        borderRadius: '4px',
                        marginBottom: '8px',
                      }}
                    />
                    <div
                      style={{
                        height: '12px',
                        width: '60%',
                        background: 'var(--color-border)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                )}

                {/* REAL VOUCHER CARD (Ticket / Paper Voucher Style) */}
                {!loading && currentVoucher && (
                  <div
                    style={{
                      background:
                        'linear-gradient(135deg, #1f140a, #2e1a0b)',
                      borderRadius: '20px',
                      padding: '1.5rem',
                      marginBottom: '1.75rem',
                      position: 'relative',
                      boxShadow:
                        '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(212, 160, 74, 0.25)',
                      maxWidth: '430px',
                      border: '1px solid rgba(212, 160, 74, 0.3)',
                    }}
                  >
                    {/* Left and Right Perforated Ticket Notches */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-12px',
                        top: '55%',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-bg-card)',
                        borderRight: '1px solid rgba(212, 160, 74, 0.3)',
                        boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: '-12px',
                        top: '55%',
                        transform: 'translateY(-50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-bg-card)',
                        borderLeft: '1px solid rgba(212, 160, 74, 0.3)',
                        boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    />

                    {/* Voucher Card Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '0.85rem',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.7rem',
                            color: '#d4a04a',
                            fontFamily: 'var(--font-inter)',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          <Coffee size={12} />
                          Lorong Rasa &bull; Tiket Resmi
                        </div>
                        <div
                          style={{
                            fontSize: '0.86rem',
                            color: '#ffffff',
                            fontFamily: 'var(--font-inter)',
                            fontWeight: 600,
                          }}
                        >
                          {currentVoucher.description || 'Voucher Promo Eksklusif'}
                        </div>
                      </div>

                      {/* Badge Tipe Diskon */}
                      <div
                        style={{
                          background:
                            currentVoucher.discount_type === 'product'
                              ? 'rgba(212, 160, 74, 0.25)'
                              : 'rgba(255, 255, 255, 0.12)',
                          border: '1px solid rgba(212, 160, 74, 0.4)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#f5e6c8',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-inter)',
                          flexShrink: 0,
                        }}
                      >
                        {currentVoucher.discount_type === 'product' ? (
                          <>
                            <Gift size={13} color="#d4a04a" />
                            Menu Spesial
                          </>
                        ) : currentVoucher.discount_type === 'percentage' ? (
                          <>
                            <Tag size={13} color="#d4a04a" />
                            Diskon %
                          </>
                        ) : (
                          <>
                            <Tag size={13} color="#d4a04a" />
                            Potongan Rp
                          </>
                        )}
                      </div>
                    </div>

                    {/* Value & Discount Focus */}
                    <div
                      style={{
                        margin: '0.75rem 0',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize:
                              currentVoucher.discount_type === 'fixed'
                                ? '1.8rem'
                                : '2.3rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            fontFamily: 'var(--font-playfair)',
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          }}
                        >
                          {currentVoucher.discount_type === 'product'
                            ? `${currentVoucher.discount_value}% OFF`
                            : currentVoucher.discount_type === 'percentage'
                            ? `${currentVoucher.discount_value}% OFF`
                            : `Rp ${currentVoucher.discount_value.toLocaleString('id-ID')}`}
                        </div>

                        {currentVoucher.product_name && (() => {
                          const pool = parseProductPool(currentVoucher.product_name)
                          return pool.isPool ? (
                            <div style={{ marginTop: '6px' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(147, 51, 234, 0.22)',
                                  border: '1px solid rgba(147, 51, 234, 0.45)',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '0.74rem',
                                  color: '#d8b4fe',
                                  fontWeight: 700,
                                  marginBottom: '3px',
                                }}
                              >
                                <span>🎲</span> Acak 1 dari {pool.count} Menu Pilihan
                              </div>
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'rgba(255, 255, 255, 0.72)',
                                  lineHeight: 1.4,
                                }}
                              >
                                Opsi: {pool.items.join(', ')}
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: '#d4a04a',
                                fontFamily: 'var(--font-inter)',
                                fontWeight: 700,
                                marginTop: '4px',
                              }}
                            >
                              Khusus Menu: {currentVoucher.product_name}
                            </div>
                          )
                        })()}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.7)',
                            fontFamily: 'var(--font-inter)',
                          }}
                        >
                          {currentVoucher.min_order > 0
                            ? `Min. beli Rp ${currentVoucher.min_order.toLocaleString('id-ID')}`
                            : 'Tanpa min. pembelian'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'rgba(212, 160, 74, 0.9)',
                            fontFamily: 'var(--font-inter)',
                            marginTop: '2px',
                          }}
                        >
                          Berlaku s/d {formatIndoDate(currentVoucher.expires_at)}
                        </div>
                      </div>
                    </div>

                    {/* Perforation Divider Line with Tear Effect */}
                    <div style={{ position: 'relative', margin: '1rem 0' }}>
                      <div
                        style={{
                          borderTop: isTearing
                            ? '2px dashed #e85a4a'
                            : '2px dashed rgba(212, 160, 74, 0.35)',
                          boxShadow: isTearing ? '0 0 12px rgba(232, 90, 74, 0.8)' : 'none',
                          transition: 'all 0.3s ease',
                        }}
                      />
                      {/* Radiating tear particles */}
                      {isTearing && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            pointerEvents: 'none',
                            overflow: 'visible',
                          }}
                        >
                          {[-120, -80, -40, 0, 40, 80, 120].map((offset, i) => (
                            <motion.span
                              key={i}
                              initial={{
                                opacity: 1,
                                scale: 1,
                                x: `calc(50% + ${offset}px)`,
                                y: 0,
                              }}
                              animate={{
                                opacity: 0,
                                scale: 0.2,
                                x: `calc(50% + ${offset * 1.4}px)`,
                                y: (i % 2 === 0 ? -1 : 1) * (20 + Math.random() * 25),
                              }}
                              transition={{ duration: 0.55, ease: 'easeOut' }}
                              style={{
                                position: 'absolute',
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#d4a04a',
                                boxShadow: '0 0 10px #d4a04a',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lower Stub Section: Quota + Stamped Code (Tears Away on Claim) */}
                    <div
                      style={{
                        transform: isTearing ? 'translateY(16px) rotate(2.4deg)' : 'none',
                        opacity: isTearing ? 0.9 : 1,
                        transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transformOrigin: 'left top',
                        position: 'relative',
                      }}
                    >
                      {/* Quota Progress Bar (Urgency & Trust) */}
                      {currentVoucher.max_uses > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.7rem',
                              color: 'rgba(255,255,255,0.7)',
                              fontFamily: 'var(--font-inter)',
                              marginBottom: '4px',
                            }}
                          >
                            <span>Kuota Tersedia</span>
                            <span style={{ color: '#d4a04a', fontWeight: 700 }}>
                              {Math.max(
                                0,
                                currentVoucher.max_uses - currentVoucher.current_uses
                              )}{' '}
                              / {currentVoucher.max_uses} voucher
                            </span>
                          </div>
                          <div
                            style={{
                              height: '5px',
                              background: 'rgba(255,255,255,0.15)',
                              borderRadius: '10px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    10,
                                    ((currentVoucher.max_uses -
                                      currentVoucher.current_uses) /
                                      currentVoucher.max_uses) *
                                      100
                                  )
                                )}%`,
                                background:
                                  'linear-gradient(90deg, #4a9e6a, #d4a04a)',
                                borderRadius: '10px',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Voucher Code Box & Quick Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          background: 'rgba(0, 0, 0, 0.35)',
                          border: '1.5px dashed rgba(212, 160, 74, 0.5)',
                          borderRadius: '12px',
                          padding: '8px 12px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.62rem',
                              color: 'rgba(255,255,255,0.5)',
                              fontFamily: 'var(--font-inter)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            Kode Promo
                          </div>
                          <div
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              fontFamily: 'monospace',
                              letterSpacing: '0.12em',
                            }}
                          >
                            {currentVoucher.code}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={(e) => handleCopyCode(currentVoucher.code, e)}
                            title="Salin Kode Promo"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background:
                                copiedCode === currentVoucher.code
                                  ? '#4a9e6a'
                                  : 'rgba(255,255,255,0.15)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-inter)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {copiedCode === currentVoucher.code ? (
                              <>
                                <Check size={13} />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                Salin
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenQRModal(currentVoucher)}
                            title="Tampilkan QR Barcode untuk Kasir"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(212, 160, 74, 0.2)',
                              color: '#d4a04a',
                              border: '1px solid rgba(212, 160, 74, 0.4)',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-inter)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <QrCode size={14} />
                            Barcode
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stamped Ink Seal: Appears when claimed with stamp slam */}
                    {isClaimed && (
                      <div
                        className="stamp-slam"
                        style={{
                          position: 'absolute',
                          top: '25%',
                          right: '12%',
                          zIndex: 25,
                          border: '3px solid #e85a4a',
                          borderRadius: '12px',
                          padding: '6px 14px',
                          color: '#e85a4a',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          fontSize: '0.95rem',
                          boxShadow: '0 0 20px rgba(232, 90, 74, 0.6)',
                          background: 'rgba(26, 16, 0, 0.92)',
                          backdropFilter: 'blur(4px)',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={16} />
                        TERKLAIM
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State when no active vouchers in DB */}
                {!loading && vouchers.length === 0 && (
                  <div
                    style={{
                      background: 'var(--color-bg)',
                      border: '1px dashed var(--color-border)',
                      borderRadius: '16px',
                      padding: '1.75rem',
                      maxWidth: '420px',
                      marginBottom: '1.75rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-glow)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <Coffee size={22} />
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--color-text)',
                        marginBottom: '6px',
                      }}
                    >
                      Semua Kuota Voucher Sedang Terpenuhi
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.6,
                        marginBottom: '14px',
                      }}
                    >
                      Promo batch ini sedang disiapkan oleh barista kami. Daftar akun
                      sekarang agar kamu siap mengklaim saat promo rilis berikutnya!
                    </div>
                    <Link
                      href="/register"
                      className="btn-primary"
                      style={{
                        fontSize: '0.82rem',
                        padding: '6px 16px',
                        display: 'inline-flex',
                      }}
                    >
                      Daftar Akun Member
                    </Link>
                  </div>
                )}

                {/* CTA Buttons */}
                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {currentVoucher ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isClaimed) {
                          let effectiveVoucher = currentVoucher
                          let isLuckyDraw = false
                          let luckyPoolCount = 0
                          let luckyPoolItems: string[] = []

                          if (currentVoucher.discount_type === 'product' && currentVoucher.product_name) {
                            const pool = parseProductPool(currentVoucher.product_name)
                            if (pool.isPool) {
                              isLuckyDraw = true
                              luckyPoolCount = pool.count
                              luckyPoolItems = pool.items
                              const drawn = getOrDrawAwardedProduct(currentVoucher.code, currentVoucher.product_name)
                              if (drawn) {
                                const matchItem = menuItems.find(
                                  (m) => m.name.toLowerCase() === drawn.toLowerCase()
                                )
                                effectiveVoucher = {
                                  ...currentVoucher,
                                  product_name: drawn,
                                  product_menu_item_id: matchItem ? matchItem.id : null,
                                }
                              }
                            }
                          }

                          setModalTab('voucher')
                          setActiveModal({
                            voucher: effectiveVoucher,
                            mode: 'claimed',
                            savedToAccount: false,
                            isLuckyDraw,
                            luckyPoolCount,
                            luckyPoolItems,
                          })
                        } else {
                          handleClaimWithAnimation(currentVoucher)
                        }
                      }}
                      disabled={isTearing}
                      className="btn-primary"
                      style={{
                        padding: '0.85rem 1.65rem',
                        fontSize: '0.92rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: isTearing ? 'wait' : 'pointer',
                        boxShadow: isTearing
                          ? '0 0 25px rgba(212, 160, 74, 0.7)'
                          : isClaimed
                          ? '0 0 20px rgba(74, 158, 106, 0.5)'
                          : 'var(--shadow-md)',
                        background: isClaimed
                          ? 'linear-gradient(135deg, #2e7d32, #1b5e20)'
                          : undefined,
                        borderColor: isClaimed ? '#4caf50' : undefined,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isClaimed ? (
                        <>
                          <CheckCircle2 size={16} />
                          Voucher Terklaim! Buka Pilihan
                          <ArrowRight size={15} />
                        </>
                      ) : (
                        <>
                          <Tag size={16} />
                          {isTearing
                            ? 'Menyobek Tiket...'
                            : parseProductPool(currentVoucher.product_name).isPool
                            ? '🎲 Klaim & Undi 1 Menu Acak'
                            : 'Klaim Voucher Sekarang'}
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href="/profile"
                      className="btn-primary"
                      style={{
                        padding: '0.85rem 1.65rem',
                        fontSize: '0.92rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Tag size={16} />
                      Buka Dompet Voucher
                      <ArrowRight size={15} />
                    </Link>
                  )}

                  <Link
                    href="/menu"
                    className="btn-outline"
                    style={{ padding: '0.85rem 1.35rem', fontSize: '0.92rem' }}
                  >
                    Lihat Daftar Menu
                  </Link>
                </div>
              </div>

              {/* Right Column: 3 Authentic Feature Highlights */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {features.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.2rem 1.35rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '1.1rem',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'default',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = item.color
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: item.color + '18',
                          color: item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid ' + item.color + '35',
                        }}
                      >
                        <Icon size={21} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--color-text)',
                            fontFamily: 'var(--font-inter)',
                            fontSize: '0.94rem',
                            marginBottom: '4px',
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-inter)',
                            lineHeight: 1.6,
                          }}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>

      {/* MODAL: Interactive Celebration & Cashier QR Action Sheet */}
      <AnimatePresence>
        {activeModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10, 5, 2, 0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem 1rem',
              overflowY: 'auto',
            }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              style={{
                background: 'linear-gradient(160deg, #241205 0%, #150902 100%)',
                color: '#ffffff',
                borderRadius: '26px',
                maxWidth: '430px',
                width: '100%',
                maxHeight: '88vh',
                overflowY: 'auto',
                margin: 'auto',
                boxShadow:
                  '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 160, 74, 0.15)',
                border: '1.5px solid rgba(212, 160, 74, 0.35)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Strip with close button & Tab Switcher */}
              <div
                style={{
                  padding: '1.15rem 1.25rem 0.85rem',
                  borderBottom: '1px solid rgba(212, 160, 74, 0.15)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {/* Modern Pill Switcher */}
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: '3px',
                    borderRadius: '12px',
                    border: '1px solid rgba(212, 160, 74, 0.2)',
                    gap: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setModalTab('voucher')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease',
                      background:
                        modalTab === 'voucher'
                          ? 'linear-gradient(135deg, #c47a2e, #d4a04a)'
                          : 'transparent',
                      color: modalTab === 'voucher' ? '#180a01' : '#d4a04a',
                      boxShadow:
                        modalTab === 'voucher'
                          ? '0 2px 10px rgba(212, 160, 74, 0.3)'
                          : 'none',
                    }}
                  >
                    <Sparkles size={13} />
                    Voucher
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('qr')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease',
                      background:
                        modalTab === 'qr'
                          ? 'linear-gradient(135deg, #c47a2e, #d4a04a)'
                          : 'transparent',
                      color: modalTab === 'qr' ? '#180a01' : '#d4a04a',
                      boxShadow:
                        modalTab === 'qr'
                          ? '0 2px 10px rgba(212, 160, 74, 0.3)'
                          : 'none',
                    }}
                  >
                    <QrCode size={13} />
                    Barcode Kasir
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content Area */}
              <div style={{ padding: '1.25rem 1.35rem 1.5rem' }}>
                {modalTab === 'voucher' ? (
                  <div>
                        {/* Celebration Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.15rem' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: activeModal.isLuckyDraw
                                ? 'rgba(147, 51, 234, 0.22)'
                                : 'rgba(74, 158, 106, 0.18)',
                              color: activeModal.isLuckyDraw ? '#c084fc' : '#5cd685',
                              border: `1px solid ${
                                activeModal.isLuckyDraw
                                  ? 'rgba(147, 51, 234, 0.45)'
                                  : 'rgba(74, 158, 106, 0.35)'
                              }`,
                              padding: '4px 14px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              marginBottom: '8px',
                            }}
                          >
                            {activeModal.isLuckyDraw ? <span>🎲</span> : <CheckCircle2 size={14} />}
                            {activeModal.isLuckyDraw
                              ? 'Lucky Pick: Menu Acak Berhasil Diundi!'
                              : 'Klaim Berhasil & Siap Digunakan'}
                          </div>
                          <h3
                            style={{
                              fontFamily: 'var(--font-playfair)',
                              fontSize: '1.45rem',
                              fontWeight: 900,
                              color: '#fdf7f0',
                              marginBottom: '4px',
                            }}
                          >
                            {activeModal.isLuckyDraw
                              ? `Kamu Beruntung: ${activeModal.voucher.product_name}!`
                              : activeModal.voucher.discount_type === 'product'
                              ? 'Diskon Menu Spesial!'
                              : 'Voucher Siap Dipakai!'}
                          </h3>
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.72)',
                              lineHeight: 1.45,
                            }}
                          >
                            {activeModal.isLuckyDraw
                              ? `Selamat! Dari ${activeModal.luckyPoolCount} pilihan menu promo, kamu mendapatkan menu ${activeModal.voucher.product_name}!`
                              : activeModal.voucher.discount_type === 'product'
                              ? `Voucher khusus untuk menu ${activeModal.voucher.product_name || 'pilihan'}. Tambahkan ke keranjang untuk dapatkan potongan langsung!`
                              : 'Diskon otomatis aktif di keranjang belanjamu. Pilih menu favoritmu atau scan di kasir cafe!'}
                          </p>
                        </div>

                        {/* Ticket Voucher Hologram Card */}
                        <div
                          style={{
                            background: 'linear-gradient(145deg, #fdf8f2, #f5ebd8)',
                            color: '#1a0f00',
                            borderRadius: '16px',
                            padding: '1.15rem',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                            border: '1.5px dashed #c47a2e',
                            position: 'relative',
                            marginBottom: '0.9rem',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: '#8b5a2b',
                              marginBottom: '2px',
                            }}
                          >
                            Voucher Lorong Rasa
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-playfair)',
                              fontSize: '1.85rem',
                              fontWeight: 900,
                              color: 'var(--color-primary-dark)',
                              lineHeight: 1.1,
                              marginBottom: '4px',
                            }}
                          >
                            {activeModal.voucher.discount_type === 'product'
                              ? `${activeModal.voucher.discount_value}% OFF`
                              : activeModal.voucher.discount_type === 'percentage'
                              ? `${activeModal.voucher.discount_value}% OFF`
                              : `Rp ${activeModal.voucher.discount_value.toLocaleString('id-ID')}`}
                          </div>
                          <div
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              color: '#2a1500',
                              marginBottom: '10px',
                            }}
                          >
                            {activeModal.voucher.product_name
                              ? `Khusus Menu: ${activeModal.voucher.product_name}`
                              : activeModal.voucher.description}
                          </div>

                          {/* Code Pill + Copy */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#ffffff',
                              border: '1px solid #d4a04a',
                              borderRadius: '10px',
                              padding: '6px 12px',
                              marginBottom: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.98rem',
                                fontWeight: 900,
                                letterSpacing: '0.14em',
                                color: '#1a0f00',
                              }}
                            >
                              {activeModal.voucher.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(activeModal.voucher.code)}
                              style={{
                                background:
                                  copiedCode === activeModal.voucher.code
                                    ? '#4a9e6a'
                                    : 'var(--color-primary)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {copiedCode === activeModal.voucher.code ? (
                                <>
                                  <Check size={11} /> Tersalin
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> Salin
                                </>
                              )}
                            </button>
                          </div>

                          {/* Expiration date */}
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#7a5a3a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={12} />
                            Berlaku s/d {formatIndoDate(activeModal.voucher.expires_at)} ({getDaysRemaining(activeModal.voucher.expires_at)})
                          </div>
                        </div>

                        {/* PRODUCT VOUCHER SHOWCASE: Tampilkan Produk yang Mendapatkan Diskon */}
                        {activeModal.voucher.discount_type === 'product' && (
                          <div
                            style={{
                              background: 'rgba(212, 160, 74, 0.12)',
                              border: '1.5px solid rgba(212, 160, 74, 0.35)',
                              borderRadius: '16px',
                              padding: '12px 14px',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              textAlign: 'left',
                            }}
                          >
                            {modalTargetProduct?.image_url ? (
                              <img
                                src={modalTargetProduct.image_url}
                                alt={modalTargetProduct.name}
                                style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '12px',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(212, 160, 74, 0.4)',
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '62px',
                                  height: '62px',
                                  borderRadius: '12px',
                                  background: 'rgba(196, 122, 46, 0.25)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#d4a04a',
                                  flexShrink: 0,
                                }}
                              >
                                <Coffee size={26} />
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.68rem',
                                  color: '#5cd685',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                  marginBottom: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Sparkles size={11} />
                                Menu Target Diskon
                              </div>
                              <div
                                style={{
                                  fontSize: '0.96rem',
                                  fontWeight: 800,
                                  color: '#fdf7f0',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {activeModal.voucher.product_name || modalTargetProduct?.name}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: '7px',
                                  marginTop: '3px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {modalTargetProduct && (
                                  <span
                                    style={{
                                      fontSize: '0.78rem',
                                      color: 'rgba(255, 255, 255, 0.45)',
                                      textDecoration: 'line-through',
                                    }}
                                  >
                                    Rp {modalTargetProduct.price.toLocaleString('id-ID')}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: '0.94rem',
                                    fontWeight: 900,
                                    color: '#5cd685',
                                  }}
                                >
                                  {activeModal.voucher.discount_value === 100
                                    ? 'GRATIS (Rp 0)'
                                    : `Rp ${(
                                        (modalTargetProduct?.price || 10000) *
                                        (1 - activeModal.voucher.discount_value / 100)
                                      ).toLocaleString('id-ID')}`}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    background: 'rgba(74, 158, 106, 0.2)',
                                    color: '#5cd685',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                  }}
                                >
                                  Diskon {activeModal.voucher.discount_value}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Integration Status Notice */}
                        <div
                          style={{
                            background: 'rgba(212, 160, 74, 0.1)',
                            border: '1px solid rgba(212, 160, 74, 0.25)',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            marginBottom: '1.15rem',
                            fontSize: '0.76rem',
                            color: 'rgba(255, 255, 255, 0.88)',
                            lineHeight: 1.5,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <ShoppingBag size={15} style={{ color: '#d4a04a', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              {activeModal.voucher.discount_type === 'product' ? (
                                <>
                                  <strong>Otomatis ke Keranjang:</strong> Klik tombol di bawah untuk langsung memasukkan <strong>{activeModal.voucher.product_name || modalTargetProduct?.name}</strong> ke keranjang dengan diskon yang sudah terpotong!
                                </>
                              ) : (
                                <>
                                  <strong>Keranjang Otomatis:</strong> Voucher sudah aktif di sistem belanja. Pesananmu akan otomatis dipotong diskon saat checkout!
                                </>
                              )}
                            </div>
                          </div>
                          {activeModal.savedToAccount ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#5cd685', fontSize: '0.74rem' }}>
                              <CheckCircle2 size={13} />
                              Tersimpan permanen di Dompet Profil akun Anda.
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.72rem' }}>
                              Belum login?{' '}
                              <Link href="/register" style={{ color: '#d4a04a', fontWeight: 700, textDecoration: 'underline' }}>
                                Daftar Member
                              </Link>{' '}
                              untuk kumpulkan poin loyalty &amp; promo berikutnya!
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                          {activeModal.voucher.discount_type === 'product' ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleUseProductVoucher(
                                  activeModal.voucher,
                                  modalTargetProduct
                                )
                              }
                              className="btn-primary"
                              style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '12px',
                                fontSize: '0.92rem',
                                fontWeight: 800,
                                gap: '8px',
                                boxShadow: '0 4px 20px rgba(196, 122, 46, 0.55)',
                                background:
                                  'linear-gradient(135deg, #c47a2e, #e0983d)',
                              }}
                            >
                              <ShoppingBag size={17} />
                              Gunakan Voucher &amp; Buka Keranjang
                              <ArrowRight size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOrderNow(activeModal.voucher)}
                              className="btn-primary"
                              style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '11px',
                                fontSize: '0.9rem',
                                gap: '8px',
                                boxShadow: '0 4px 18px rgba(196, 122, 46, 0.45)',
                              }}
                            >
                              <Coffee size={16} />
                              {items.length > 0
                                ? 'Buka Keranjang Belanja (Gunakan Diskon)'
                                : 'Pesan Menu Sekarang (Gunakan Diskon)'}
                            </button>
                          )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setModalTab('qr')}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fdf7f0',
                            border: '1px solid rgba(212, 160, 74, 0.3)',
                            borderRadius: '12px',
                            padding: '9px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <QrCode size={14} color="#d4a04a" />
                          Barcode Kasir
                        </button>

                        {(() => {
                          const v = activeModal.voucher
                          const tokenOrCode = v.share_token || v.code
                          const targetGift = v.discount_type === 'product' ? (v.product_name || '') : ''
                          const claimUrl = `${siteUrl}/voucher/${encodeURIComponent(tokenOrCode)}${targetGift ? `?item=${encodeURIComponent(targetGift)}` : ''}`
                          let promoDesc = ''
                          if (v.discount_type === 'product') {
                            promoDesc = v.discount_value === 100
                              ? `Gratis 1x ${v.product_name || 'Menu Pilihan'}`
                              : `Diskon ${v.discount_value}% ${v.product_name || 'Menu Pilihan'}`
                          } else if (v.discount_type === 'percentage') {
                            promoDesc = `Diskon ${v.discount_value}% OFF`
                          } else {
                            promoDesc = `Potongan Rp ${(v.discount_value / 1000).toFixed(0)}rb`
                          }
                          const text =
                            `🎟️ *VOUCHER LORONG RASA*\n` +
                            `Kode: *${v.code}*\n` +
                            `🎁 Promo: *${promoDesc}*\n\n` +
                            `📲 *Buka barcode & klaim di sini:*\n` +
                            `${claimUrl}`
                          return (
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#25D366',
                                color: '#ffffff',
                                borderRadius: '12px',
                                padding: '9px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                textDecoration: 'none',
                              }}
                            >
                              <Share2 size={13} />
                              Bagikan ke WhatsApp
                            </a>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    {/* TAB 2: QR & Barcode Kasir */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#d4a04a',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          marginBottom: '2px',
                        }}
                      >
                        Lorong Rasa Wajak &bull; Kasir Cafe
                      </div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-playfair)',
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#fdf7f0',
                        }}
                      >
                        Tunjukkan ke Barista
                      </h3>
                      <p
                        style={{
                          fontSize: '0.76rem',
                          color: 'rgba(255, 255, 255, 0.7)',
                          marginTop: '2px',
                        }}
                      >
                        Scan kode QR atau sebutkan kode voucher saat transaksi di kasir.
                      </p>
                    </div>

                    {/* QR Code White Card */}
                    <div
                      style={{
                        background: '#ffffff',
                        padding: '14px',
                        borderRadius: '18px',
                        display: 'inline-block',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                        marginBottom: '1rem',
                      }}
                    >
                      <QRCodeSVG
                        value={`VOUCHER:${activeModal.voucher.code}${
                          activeModal.voucher.discount_type === 'product' && activeModal.voucher.product_name
                            ? `|${activeModal.voucher.product_name}`
                            : ''
                        }`}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#1a0f00"
                        level="M"
                      />
                    </div>

                    {/* Simulated Barcode */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '2px',
                        height: '22px',
                        marginBottom: '4px',
                        opacity: 0.85,
                      }}
                    >
                      {[
                        3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3,
                      ].map((w, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-block',
                            width: `${w}px`,
                            height: '100%',
                            background: '#d4a04a',
                          }}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        fontWeight: 900,
                        letterSpacing: '0.18em',
                        color: '#d4a04a',
                        marginBottom: '1rem',
                      }}
                    >
                      {activeModal.voucher.code}
                    </div>

                    {/* Instructions */}
                    <div
                      style={{
                        background: 'rgba(212, 160, 74, 0.08)',
                        border: '1px dashed rgba(212, 160, 74, 0.3)',
                        borderRadius: '12px',
                        padding: '10px',
                        fontSize: '0.74rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        lineHeight: 1.45,
                        marginBottom: '1.15rem',
                        textAlign: 'left',
                      }}
                    >
                      💡 <strong>Cara Pakai:</strong> Perlihatkan layar ini ke kasir Lorong Rasa Wajak saat memesan langsung di cafe. Barista akan memverifikasi voucher kamu.
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setModalTab('voucher')}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#fdf7f0',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '10px',
                          padding: '9px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        &larr; Lihat Voucher
                      </button>

                      {(() => {
                        const v = activeModal.voucher
                        const tokenOrCode = v.share_token || v.code
                        const targetGift = v.discount_type === 'product' ? (v.product_name || '') : ''
                        const claimUrl = `${siteUrl}/voucher/${encodeURIComponent(tokenOrCode)}${targetGift ? `?item=${encodeURIComponent(targetGift)}` : ''}`
                        let promoDesc = ''
                        if (v.discount_type === 'product') {
                          promoDesc = v.discount_value === 100
                            ? `Gratis 1x ${v.product_name || 'Menu Pilihan'}`
                            : `Diskon ${v.discount_value}% ${v.product_name || 'Menu Pilihan'}`
                        } else if (v.discount_type === 'percentage') {
                          promoDesc = `Diskon ${v.discount_value}% OFF`
                        } else {
                          promoDesc = `Potongan Rp ${(v.discount_value / 1000).toFixed(0)}rb`
                        }
                        const text =
                          `🎟️ *VOUCHER LORONG RASA*\n` +
                          `Kode: *${v.code}*\n` +
                          `🎁 Promo: *${promoDesc}*\n\n` +
                          `📲 *Buka barcode & klaim di sini:*\n` +
                          `${claimUrl}`
                        return (
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25D366',
                              color: '#ffffff',
                              borderRadius: '10px',
                              padding: '9px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              textDecoration: 'none',
                            }}
                          >
                            <Share2 size={13} />
                            WhatsApp
                          </a>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
