'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  Coffee,
  CheckCircle2,
  Package,
  UtensilsCrossed,
  QrCode,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

interface Order {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  order_type: 'dine_in' | 'takeaway'
  table_number: string | null
  payment_method: 'qris' | 'cash'
  payment_status: 'unpaid' | 'paid'
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total_amount: number
  discount_amount: number
  voucher_code: string | null
  notes: string | null
  created_at: string
}

interface OrderItem {
  id: string
  menu_item_name: string
  quantity: number
  price: number
  subtotal: number
  notes: string | null
}

const statusSteps = [
  { key: 'pending', label: 'Menunggu', desc: 'Pesanan masuk ke kasir' },
  { key: 'confirmed', label: 'Dikonfirmasi', desc: 'Pesanan diterima' },
  { key: 'preparing', label: 'Diracik', desc: 'Barista meracik menu' },
  { key: 'ready', label: 'Siap', desc: 'Siap disajikan / diambil' },
  { key: 'completed', label: 'Selesai', desc: 'Selamat menikmati' },
]

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const orderId = resolvedParams.id

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderErr || !orderData) {
          setError('Pesanan tidak ditemukan.')
          setLoading(false)
          return
        }

        setOrder(orderData)

        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId)

        if (itemsData) setItems(itemsData)
      } catch {
        setError('Gagal memuat rincian pesanan.')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()

    // Real-time subscription to order status updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: { new: Order }) => {
          if (payload.new) {
            setOrder(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', color: 'var(--color-primary)' }} />
            <p style={{ fontFamily: 'var(--font-inter)' }}>Memuat rincian pesanan...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !order) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', background: 'var(--color-bg-card)', padding: '2.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <AlertCircle size={48} style={{ color: '#e85a4a', margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.5rem' }}>Pesanan Tidak Ditemukan</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', fontFamily: 'var(--font-inter)' }}>
              {error || 'Nomor ID pesanan tidak valid atau sudah kadaluarsa.'}
            </p>
            <Link href="/" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              Kembali ke Beranda
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const currentStepIdx = statusSteps.findIndex(s => s.key === order.status)

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '100px', paddingBottom: '4rem' }}>
        <div className="container-custom" style={{ maxWidth: '840px' }}>
          {/* Header Card */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(1.5rem, 4vw, 2.5rem)',
            textAlign: 'center',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: order.status === 'cancelled'
                ? '#e85a4a22'
                : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 24px var(--color-primary-glow)',
            }}>
              {order.status === 'cancelled' ? (
                <AlertCircle size={32} color="#e85a4a" />
              ) : (
                <Coffee size={32} color="white" />
              )}
            </div>

            <span style={{
              fontSize: '0.8rem',
              fontFamily: 'var(--font-inter)',
              color: 'var(--color-primary)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              ID Pesanan: #{order.id.slice(0, 8).toUpperCase()}
            </span>

            <h1 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontFamily: 'var(--font-playfair)',
              marginTop: '0.35rem',
              marginBottom: '0.5rem',
              color: 'var(--color-text)',
            }}>
              {order.status === 'cancelled' ? 'Pesanan Dibatalkan' : 'Pesanan Sedang Diproses'}
            </h1>

            <p style={{
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
              fontSize: '0.92rem',
              maxWidth: '460px',
              margin: '0 auto',
            }}>
              Terima kasih, <strong>{order.customer_name}</strong>! Tunjukkan halaman ini atau QR Code kepada kasir/barista kami.
            </p>

            {/* Status Flow */}
            {order.status !== 'cancelled' && (
              <div style={{
                marginTop: '2.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--color-border)',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${statusSteps.length}, 1fr)`,
                  gap: '0.5rem',
                  position: 'relative',
                }}>
                  {statusSteps.map((step, idx) => {
                    const isDone = currentStepIdx >= idx
                    const isCurrent = currentStepIdx === idx
                    return (
                      <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isCurrent
                            ? 'var(--color-primary)'
                            : isDone
                            ? '#4a9e6a'
                            : 'var(--color-bg-secondary)',
                          border: `2px solid ${isCurrent || isDone ? 'transparent' : 'var(--color-border)'}`,
                          color: isDone || isCurrent ? 'white' : 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          transition: 'all 0.3s',
                          boxShadow: isCurrent ? '0 0 16px var(--color-primary-glow)' : 'none',
                        }}>
                          {isDone && !isCurrent ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? 'var(--color-primary)' : isDone ? 'var(--color-text)' : 'var(--color-text-muted)',
                          fontFamily: 'var(--font-inter)',
                          textAlign: 'center',
                        }}>
                          {step.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.5rem',
          }}>
            {/* Left: QR Code & Pickup Details */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{
                background: 'white',
                padding: '1.25rem',
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                marginBottom: '1.25rem',
              }}>
                <QRCodeSVG
                  value={`LORONG_RASA_ORDER:${order.id}|${order.customer_name}|${order.total_amount}`}
                  size={170}
                  bgColor="#ffffff"
                  fgColor="#1a0f00"
                  level="H"
                />
              </div>

              <div style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-inter)',
                marginBottom: '1.5rem',
              }}>
                Scan QR ini saat pengambilan pesanan di kasir
              </div>

              {/* Order Metadata */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Tipe Pesanan</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {order.order_type === 'dine_in' ? (
                      <>
                        <UtensilsCrossed size={14} style={{ color: 'var(--color-primary)' }} />
                        Dine In ({order.table_number || 'Meja'})
                      </>
                    ) : (
                      <>
                        <Package size={14} style={{ color: 'var(--color-primary)' }} />
                        Take Away
                      </>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Metode Bayar</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {order.payment_method} ({order.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Waktu Pemesanan</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>

                {order.notes && (
                  <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '2px' }}>Catatan:</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontStyle: 'italic' }}>&ldquo;{order.notes}&rdquo;</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Items Receipt */}
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
                Rincian Pesanan
              </h2>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.88rem', fontFamily: 'var(--font-inter)' }}>
                    <div>
                      <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.menu_item_name}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                        {item.quantity} × Rp {item.price.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4a9e6a', fontFamily: 'var(--font-inter)' }}>
                    <span>Diskon Voucher ({order.voucher_code})</span>
                    <span style={{ fontWeight: 600 }}>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>Total Pembayaran</span>
                  <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)' }}>
                    Rp {order.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  href="/menu"
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.88rem' }}
                >
                  Pesan Lagi
                </Link>
                <Link
                  href="/"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.88rem' }}
                >
                  Beranda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
