'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingBag,
  Coffee,
  ArrowLeft,
  CheckCircle2,
  UtensilsCrossed,
  Package,
  QrCode,
  Banknote,
  Tag,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { createVerifiedOrder } from './actions'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { parseProductPool, getOrDrawAwardedProduct } from '@/lib/voucher-draw'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, discount, total, voucher, applyVoucher, removeVoucher, removeItem, updateQuantity, clearCart } = useCart()
  const { showToast } = useToast()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'cash'>('qris')
  const [orderNotes, setOrderNotes] = useState('')

  const [voucherInput, setVoucherInput] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Stable Supabase client — created once, not on every render
  const supabase = useMemo(() => createClient(), [])

  // Pre-fill user data if logged in
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          setCustomerEmail(user.email || '')
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()
          if (profile?.full_name) {
            setCustomerName(profile.full_name)
          }
          if (profile?.phone) {
            setCustomerPhone(profile.phone)
          }
        }
      } catch {
        // Continue
      } finally {
        setAuthChecked(true)
      }
    }
    fetchUserData()
  }, [])

  // Validasi voucher aktif yang tersimpan di cart saat halaman checkout dibuka
  useEffect(() => {
    if (!voucher) return

    let isMounted = true

    const validateExistingVoucher = async () => {
      try {
        const cleanCode = voucher.code.trim().toUpperCase()

        let { data } = await supabase
          .from('vouchers')
          .select('*')
          .ilike('code', cleanCode)
          .eq('is_active', true)
          .maybeSingle()

        if (!data) {
          const { data: byToken } = await supabase
            .from('vouchers')
            .select('*')
            .eq('share_token', cleanCode)
            .eq('is_active', true)
            .maybeSingle()
          data = byToken
        }

        if (!data) {
          const { data: fuzzyList } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', `%${cleanCode}%`)
            .eq('is_active', true)

          if (fuzzyList && fuzzyList.length > 0) {
            data = fuzzyList.find((v: { code?: string }) => (v.code || '').trim().toUpperCase() === cleanCode) || fuzzyList[0]
          }
        }

        if (!isMounted) return

        if (!data) {
          removeVoucher()
          showToast(`Voucher "${voucher.code}" tidak valid atau sudah dinonaktifkan.`, 'error')
          return
        }

        if (new Date(data.expires_at) < new Date()) {
          removeVoucher()
          showToast(`Voucher "${voucher.code}" telah kedaluwarsa dan otomatis dilepas.`, 'error')
          return
        }

        if (data.max_uses && data.current_uses >= data.max_uses) {
          removeVoucher()
          showToast(`Kuota pemakaian voucher "${voucher.code}" sudah habis.`, 'error')
          return
        }

        if (userId) {
          const { data: userVoucher } = await supabase
            .from('user_vouchers')
            .select('status')
            .eq('user_id', userId)
            .or(`voucher_id.eq.${data.id},voucher_code.ilike.${cleanCode}`)
            .maybeSingle()

          if (userVoucher && userVoucher.status === 'used') {
            removeVoucher()
            showToast(`Voucher "${voucher.code}" sudah pernah kamu gunakan sebelumnya.`, 'error')
            return
          }
        }
      } catch (err) {
        console.error('Error validating existing voucher on mount:', err)
      }
    }

    validateExistingVoucher()

    return () => {
      isMounted = false
    }
  }, [voucher?.code, userId])

  // Apply Voucher with real-time Supabase check
  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = voucherInput.trim().toUpperCase()
    if (!code) return

    setVoucherLoading(true)
    setVoucherError('')

    try {
      let { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('code', code)
        .eq('is_active', true)
        .maybeSingle()

      if (!data) {
        const { data: byToken } = await supabase
          .from('vouchers')
          .select('*')
          .eq('share_token', code)
          .eq('is_active', true)
          .maybeSingle()
        data = byToken
      }

      if (!data) {
        const { data: fuzzyList } = await supabase
          .from('vouchers')
          .select('*')
          .ilike('code', `%${code}%`)
          .eq('is_active', true)

        if (fuzzyList && fuzzyList.length > 0) {
          data = fuzzyList.find((v: { code?: string }) => (v.code || '').trim().toUpperCase() === code) || fuzzyList[0]
        }
      }

      if (!data) {
        setVoucherError('Kode voucher tidak valid atau sudah tidak aktif.')
        setVoucherLoading(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setVoucherError('Voucher ini sudah melewati masa berlaku.')
        setVoucherLoading(false)
        return
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        setVoucherError('Kuota pemakaian voucher ini sudah habis.')
        setVoucherLoading(false)
        return
      }

      if (subtotal < data.min_order) {
        setVoucherError(`Minimal pesanan untuk voucher ini adalah Rp ${data.min_order.toLocaleString('id-ID')}.`)
        setVoucherLoading(false)
        return
      }

      // Check 1 user 1 voucher restriction
      if (userId) {
        const { data: userVoucher } = await supabase
          .from('user_vouchers')
          .select('status')
          .eq('user_id', userId)
          .or(`voucher_id.eq.${data.id},voucher_code.ilike.${data.code}`)
          .maybeSingle()

        if (userVoucher && userVoucher.status === 'used') {
          setVoucherError('Kamu sudah pernah menggunakan voucher ini sebelumnya (Maksimal 1 voucher per akun).')
          setVoucherLoading(false)
          return
        }
      }

      // Untuk voucher tipe product dengan multi-produk (lucky draw), prioritaskan menu yang sudah ada di cart
      let effectiveProductName: string | null = data.product_name || null
      let effectiveProductMenuItemId: string | null = data.product_menu_item_id || null

      if (data.discount_type === 'product' && data.product_name) {
        const pool = parseProductPool(data.product_name)
        if (pool.isPool) {
          const cartItemNames = items.map((i) => i.name)
          const drawn = getOrDrawAwardedProduct(data.code, data.product_name, cartItemNames)
          if (drawn) {
            effectiveProductName = drawn
            const matchedCartItem = items.find(
              (i) =>
                i.name.toLowerCase() === drawn.toLowerCase() ||
                i.name.toLowerCase().includes(drawn.toLowerCase()) ||
                drawn.toLowerCase().includes(i.name.toLowerCase())
            )
            effectiveProductMenuItemId = matchedCartItem ? matchedCartItem.id : null
          }
        }
      }

      const applied = applyVoucher({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order: data.min_order,
        product_name: effectiveProductName,
        product_menu_item_id: effectiveProductMenuItemId,
      })

      if (applied) {
        const isMatchedInCart = items.some(
          (i) =>
            (effectiveProductMenuItemId && i.id === effectiveProductMenuItemId) ||
            (effectiveProductName &&
              (i.name.toLowerCase() === effectiveProductName.toLowerCase() ||
                i.name.toLowerCase().includes(effectiveProductName.toLowerCase()) ||
                effectiveProductName.toLowerCase().includes(i.name.toLowerCase())))
        )

        if (data.discount_type === 'product' && !isMatchedInCart && effectiveProductName) {
          showToast(`Voucher ${data.code} terpasang! Jangan lupa masukkan menu "${effectiveProductName}" ke keranjang agar diskon terhitung.`, 'success')
        } else {
          showToast(`Voucher ${data.code} berhasil dipasang!`, 'success')
        }
        setVoucherInput('')
      } else {
        setVoucherError('Gagal mengaktifkan voucher.')
      }
    } catch {
      setVoucherError('Terjadi kesalahan saat memeriksa voucher.')
    } finally {
      setVoucherLoading(false)
    }
  }

  // Handle Order Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (items.length === 0) {
      setErrorMsg('Keranjang pesanan masih kosong.')
      return
    }

    if (!customerName.trim()) {
      setErrorMsg('Harap isi Nama Pemesan.')
      return
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Harap isi Nomor WhatsApp / Telepon.')
      return
    }

    if (orderType === 'dine_in' && !tableNumber.trim()) {
      setErrorMsg('Harap isi Nomor Meja untuk pemesanan Dine In.')
      return
    }

    setSubmitting(true)

    try {
      const res = await createVerifiedOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber.trim() : undefined,
        paymentMethod,
        orderNotes: orderNotes.trim() || undefined,
        voucherCode: voucher ? voucher.code : undefined,
        items: items.map((it) => ({
          id: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          notes: it.notes,
        })),
      })

      if (!res.success || !res.orderId) {
        setErrorMsg(res.error || 'Gagal memproses pesanan.')
        setSubmitting(false)
        return
      }

      // Success: Clear cart and redirect to order tracking receipt
      clearCart()
      showToast('Pesanan berhasil dibuat & diverifikasi!', 'success')
      router.push(`/orders/${res.orderId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kendala saat memproses pesanan. Silakan coba lagi.'
      setErrorMsg(message)
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px', background: 'var(--color-bg-card)', padding: '3rem 2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
            <Coffee size={56} style={{ color: 'var(--color-primary)', margin: '0 auto 1.5rem', opacity: 0.8 }} />
            <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.75rem', color: 'var(--color-text)' }}>
              Keranjang Masih Kosong
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Pilih menu racikan kopi terbaik dari Lorong Rasa sebelum melanjutkan ke tahap pembayaran.
            </p>
            <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.75rem' }}>
              <ShoppingBag size={18} />
              Jelajahi Menu
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '100px', paddingBottom: '4rem' }}>
        <div className="container-custom">
          {/* Back link */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href="/menu"
              className="nav-back-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.9rem',
                transition: 'color 0.2s',
              }}
            >
              <ArrowLeft size={16} />
              Kembali ke Menu
            </Link>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1.75rem' }}>
            <span style={{
              fontSize: '0.82rem',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              — Konfirmasi & Pembayaran —
            </span>
            <h1 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              fontFamily: 'var(--font-playfair)',
              marginTop: '0.4rem',
              color: 'var(--color-text)',
            }}>
              Checkout Pesanan
            </h1>
          </div>

          {/* Guest or Member Status Notification Banner */}
          {!userId ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.25rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(212, 175, 55, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold)',
                  flexShrink: 0,
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-inter)', marginBottom: '2px' }}>
                    Pemesanan sebagai Tamu (Guest)
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', lineHeight: 1.4 }}>
                    Anda dapat memesan langsung tanpa login. Riwayat belanja dan Poin Loyalitas tidak akan tersimpan di akun.
                  </div>
                </div>
              </div>
              <Link
                href="/login?redirect=/checkout"
                className="btn-outline"
                style={{
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  whiteSpace: 'nowrap',
                }}
              >
                Masuk / Daftar Akun
              </Link>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(74, 158, 106, 0.08)',
              border: '1px solid rgba(74, 158, 106, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.9rem 1.25rem',
              marginBottom: '2rem',
            }}>
              <CheckCircle2 size={20} color="#4a9e6a" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                Akun Member Aktif: <strong>{customerName || customerEmail || 'Member'}</strong>. Pesanan ini akan otomatis tersimpan di riwayat akun &amp; mendapatkan Poin Member.
              </div>
            </div>
          )}

          {/* Form Layout */}
          <form onSubmit={handleCreateOrder}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '2.5rem',
              alignItems: 'start',
            }}>
              {/* Left Column: Form Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* 1. Order Type */}
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-inter)', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
                    1. Tipe Pemesanan
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setOrderType('dine_in')}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${orderType === 'dine_in' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: orderType === 'dine_in' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                        color: orderType === 'dine_in' ? 'var(--color-primary)' : 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <UtensilsCrossed size={22} />
                      Dine In (Di Tempat)
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('takeaway')}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${orderType === 'takeaway' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: orderType === 'takeaway' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                        color: orderType === 'takeaway' ? 'var(--color-primary)' : 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Package size={22} />
                      Take Away (Bungkus)
                    </button>
                  </div>

                  {orderType === 'dine_in' && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'var(--font-inter)' }}>
                        Nomor Meja <span style={{ color: '#e85a4a' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={e => setTableNumber(e.target.value)}
                        placeholder="Contoh: Meja 04 atau Bar-2"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Customer Info */}
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-inter)', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
                    2. Data Pemesan
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'var(--font-inter)' }}>
                        Nama Lengkap <span style={{ color: '#e85a4a' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Nama kamu..."
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'var(--font-inter)' }}>
                        Nomor WhatsApp / Telepon <span style={{ color: '#e85a4a' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="08123456789"
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'var(--font-inter)' }}>
                        Email <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>(Opsional untuk struk digital)</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        placeholder="nama@email.com"
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px', fontFamily: 'var(--font-inter)' }}>
                        Catatan Khusus <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>(Opsional)</span>
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                        placeholder="Contoh: Less sugar, es dipisah, ekstra sedotan..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Payment Method */}
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                }}>
                  <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-inter)', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text)' }}>
                    3. Metode Pembayaran
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('qris')}
                      style={{
                        padding: '1.1rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${paymentMethod === 'qris' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: paymentMethod === 'qris' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                        color: paymentMethod === 'qris' ? 'var(--color-primary)' : 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <QrCode size={24} />
                      QRIS Instant
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>Gopay, OVO, BCA, dll</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      style={{
                        padding: '1.1rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: paymentMethod === 'cash' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                        color: paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Banknote size={24} />
                      Bayar di Kasir
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>Tunai / Debit EDC</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary & Voucher */}
              <div style={{ position: 'sticky', top: '100px' }}>
                <div style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, color: 'var(--color-text)' }}>
                      Ringkasan Pesanan
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
                      {items.reduce((sum, i) => sum + i.quantity, 0)} Item
                    </span>
                  </div>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '4px' }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                            {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Hapus item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Voucher Box */}
                  <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                    {voucher ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Tag size={16} style={{ color: '#4a9e6a' }} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4a9e6a', fontFamily: 'monospace' }}>{voucher.code}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Voucher aktif</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeVoucher}
                          style={{ background: 'none', border: 'none', color: '#e85a4a', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={voucherInput}
                            onChange={e => setVoucherInput(e.target.value)}
                            placeholder="Kode Voucher..."
                            style={{
                              flex: 1,
                              background: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.85rem',
                              color: 'var(--color-text)',
                              outline: 'none',
                              fontFamily: 'monospace',
                              textTransform: 'uppercase',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={voucherLoading || !voucherInput.trim()}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            {voucherLoading ? <Loader2 size={14} className="animate-spin" /> : 'Gunakan'}
                          </button>
                        </div>
                        {voucherError && (
                          <div style={{ color: '#e85a4a', fontSize: '0.75rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} /> {voucherError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontFamily: 'var(--font-inter)' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                      <span style={{ color: 'var(--color-text)' }}>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>

                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontFamily: 'var(--font-inter)', color: '#4a9e6a' }}>
                        <span>Diskon Voucher</span>
                        <span style={{ fontWeight: 600 }}>-Rp {discount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {voucher && voucher.discount_type === 'product' && voucher.product_name && discount === 0 && (
                      <div style={{ fontSize: '0.78rem', color: '#b8860b', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '6px', padding: '6px 10px', marginTop: '4px' }}>
                        ⚠️ Voucher produk aktif — Pastikan menu <strong>&ldquo;{voucher.product_name}&rdquo;</strong> ada di keranjang agar diskon teraplikasikan.
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-inter)' }}>Total Pembayaran</span>
                      <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)' }}>
                        Rp {total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Points Estimate */}
                  {userId ? (
                    total >= 10000 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '1.25rem',
                        fontSize: '0.8rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-gold)', fontWeight: 600 }}>
                          <Sparkles size={14} /> Poin Rasa Diperoleh:
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>
                          +{Math.floor(total / 10000)} Poin
                        </span>
                      </div>
                    )
                  ) : (
                    total >= 10000 && (
                      <div style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        marginBottom: '1.25rem',
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-inter)',
                        lineHeight: 1.4,
                      }}>
                        <span>💡 Ingin dapat <strong>+{Math.floor(total / 10000)} Poin Member</strong>? </span>
                        <Link href="/login?redirect=/checkout" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}>
                          Masuk akun
                        </Link>
                        <span> sebelum checkout.</span>
                      </div>
                    )
                  )}

                  {errorMsg && (
                    <div style={{ background: '#e85a4a22', border: '1px solid #e85a4a55', borderRadius: '8px', padding: '0.75rem', color: '#e85a4a', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} />
                      {errorMsg}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 700,
                      gap: '8px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        Memproses Pesanan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Konfirmasi & Pesan Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
