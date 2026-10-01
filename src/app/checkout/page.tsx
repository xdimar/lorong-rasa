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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

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
            .select('full_name')
            .eq('id', user.id)
            .single()
          if (profile?.full_name) {
            setCustomerName(profile.full_name)
          }
        }
      } catch {
        // Continue as guest
      } finally {
        setAuthChecked(true)
      }
    }
    fetchUserData()
  }, [])

  // Apply Voucher with real-time Supabase check
  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = voucherInput.trim().toUpperCase()
    if (!code) return

    setVoucherLoading(true)
    setVoucherError('')

    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !data) {
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
          .eq('voucher_id', data.id)
          .maybeSingle()

        if (userVoucher && userVoucher.status === 'used') {
          setVoucherError('Kamu sudah pernah menggunakan voucher ini sebelumnya (Maksimal 1 voucher per akun).')
          setVoucherLoading(false)
          return
        }
      }

      const applied = applyVoucher({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order: data.min_order,
      })

      if (applied) {
        showToast(`Voucher ${data.code} berhasil dipasang!`, 'success')
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
      // 1. Insert Order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || null,
          order_type: orderType,
          table_number: orderType === 'dine_in' ? tableNumber.trim() : null,
          payment_method: paymentMethod,
          payment_status: 'unpaid',
          status: 'pending',
          total_amount: total,
          discount_amount: discount,
          voucher_code: voucher && discount > 0 ? voucher.code : null,
          notes: orderNotes.trim() || null,
        })
        .select()
        .single()

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message || 'Gagal membuat pesanan.')
      }

      // 2. Insert Order Items
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id.length > 10 ? item.id : null,
        menu_item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        notes: item.notes || null,
      }))

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsErr) {
        console.error('Error inserting order items:', itemsErr)
        throw new Error('Gagal menyimpan detail menu pesanan. Harap hubungi staf atau coba lagi.')
      }

      // 3. If voucher was applied and yielded a discount, mark user_vouchers as used
      if (voucher && discount > 0 && userId) {
        try {
          const { data: existingUv } = await supabase
            .from('user_vouchers')
            .select('id')
            .eq('user_id', userId)
            .eq('voucher_code', voucher.code)
            .maybeSingle()

          if (existingUv) {
            await supabase
              .from('user_vouchers')
              .update({
                status: 'used',
                used_at: new Date().toISOString(),
                used_via: 'online_checkout',
                order_id: orderData.id,
              })
              .eq('id', existingUv.id)
          } else {
            const { data: vRecord } = await supabase
              .from('vouchers')
              .select('id')
              .eq('code', voucher.code)
              .maybeSingle()

            if (vRecord) {
              await supabase.from('user_vouchers').insert({
                user_id: userId,
                voucher_id: vRecord.id,
                voucher_code: voucher.code,
                status: 'used',
                used_at: new Date().toISOString(),
                used_via: 'online_checkout',
                order_id: orderData.id,
              })
            }
          }
        } catch (err) {
          console.error('Error updating voucher usage:', err)
        }
      }

      // 4. Clear cart and redirect to order receipt
      clearCart()
      showToast('Pesanan berhasil dibuat!', 'success')
      router.push(`/orders/${orderData.id}`)
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
          <div style={{ marginBottom: '2.5rem' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-inter)' }}>Total Pembayaran</span>
                      <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)' }}>
                        Rp {total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Points Estimate */}
                  {userId && total >= 10000 && (
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
