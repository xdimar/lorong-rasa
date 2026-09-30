'use client'

import { useEffect, useState } from 'react'
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Coffee,
  AlertCircle,
  Eye,
  X,
  Phone,
  UtensilsCrossed,
  Package,
  Check,
  ChevronRight,
  TrendingUp,
  Printer,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReceiptModal, ReceiptOrder, ReceiptItem } from '@/components/admin/ReceiptModal'

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
  order_id: string
  menu_item_name: string
  quantity: number
  price: number
  subtotal: number
  notes: string | null
}

const statusBadgeColors: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(232, 160, 74, 0.15)', color: '#e8a04a', label: 'Menunggu' },
  confirmed: { bg: 'rgba(46, 122, 196, 0.15)', color: '#2e7ac4', label: 'Dikonfirmasi' },
  preparing: { bg: 'rgba(122, 46, 196, 0.15)', color: '#a04ae8', label: 'Sedang Diracik' },
  ready: { bg: 'rgba(74, 158, 106, 0.15)', color: '#4a9e6a', label: 'Siap Saji' },
  completed: { bg: 'rgba(74, 158, 106, 0.25)', color: '#4a9e6a', label: 'Selesai' },
  cancelled: { bg: 'rgba(232, 90, 74, 0.15)', color: '#e85a4a', label: 'Dibatalkan' },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalItems, setModalItems] = useState<OrderItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Receipt Modal States
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])

  const handleOpenReceipt = async (order: Order, itemsToUse?: OrderItem[]) => {
    setReceiptOrder(order as unknown as ReceiptOrder)
    if (itemsToUse && itemsToUse.length > 0) {
      setReceiptItems(itemsToUse)
      setReceiptModalOpen(true)
    } else {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setReceiptItems(data || [])
      setReceiptModalOpen(true)
    }
  }

  const supabase = createClient()

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()

    // Real-time channel for instant order reception
    const channel = supabase
      .channel('admin-orders-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Open detail modal
  const openDetailModal = async (order: Order) => {
    setSelectedOrder(order)
    setModalLoading(true)
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
      setModalItems(data || [])
    } finally {
      setModalLoading(false)
    }
  }

  // Update order status
  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingId(orderId)
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } finally {
      setUpdatingId(null)
    }
  }

  // Toggle payment status
  const togglePayment = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
    await supabase
      .from('orders')
      .update({ payment_status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: nextStatus as 'unpaid' | 'paid' } : o))
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, payment_status: nextStatus as 'unpaid' | 'paid' } : null)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    const matchSearch =
      order.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_phone.includes(search) ||
      (order.table_number && order.table_number.toLowerCase().includes(search.toLowerCase())) ||
      order.id.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  // Statistics
  const activeOrdersCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length
  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.25rem', color: 'var(--color-text)' }}>
          Manajemen Pesanan
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
          Kelola pesanan masuk, pantau status racikan barista, dan konfirmasi pembayaran secara real-time.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(232, 160, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Pesanan Aktif</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>{activeOrdersCount}</div>
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(74, 158, 106, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a9e6a' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Pesanan Selesai</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>{completedOrdersCount}</div>
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Total Omset Terbayar</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-primary)' }}>
              Rp {totalRevenue.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Semua' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'confirmed', label: 'Dikonfirmasi' },
            { key: 'preparing', label: 'Diracik' },
            { key: 'ready', label: 'Siap' },
            { key: 'completed', label: 'Selesai' },
            { key: 'cancelled', label: 'Dibatalkan' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '50px',
                border: `1px solid ${statusFilter === tab.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: statusFilter === tab.key ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: statusFilter === tab.key ? 'white' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: 'var(--font-inter)',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.85rem',
          minWidth: '180px',
          flex: '1 1 200px',
        }}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari pemesan, no meja..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-inter)',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Orders Table Card */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
            Memuat pesanan...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <ShoppingBag size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.95rem' }}>
              {search ? 'Tidak ada pesanan yang sesuai pencarian.' : 'Belum ada pesanan pada kategori ini.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', fontFamily: 'var(--font-inter)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>ID / Waktu</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pelanggan</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipe / Meja</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Total / Bayar</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const badge = statusBadgeColors[order.status] || { bg: '#eee', color: '#666', label: order.status }
                  const isUpdating = updatingId === order.id

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* ID & Waktu */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      </td>

                      {/* Pelanggan */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{order.customer_name}</div>
                        <a
                          href={`https://wa.me/${order.customer_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', marginTop: '2px' }}
                        >
                          <Phone size={11} /> {order.customer_phone}
                        </a>
                      </td>

                      {/* Tipe / Meja */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 600 }}>
                          {order.order_type === 'dine_in' ? (
                            <>
                              <UtensilsCrossed size={13} style={{ color: 'var(--color-primary)' }} />
                              {order.table_number || 'Dine In'}
                            </>
                          ) : (
                            <>
                              <Package size={13} style={{ color: 'var(--color-text-muted)' }} />
                              Takeaway
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '3px 10px',
                          borderRadius: '50px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Total & Bayar */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          Rp {Number(order.total_amount).toLocaleString('id-ID')}
                        </div>
                        <button
                          onClick={() => togglePayment(order.id, order.payment_status)}
                          style={{
                            background: order.payment_status === 'paid' ? '#4a9e6a22' : '#e85a4a22',
                            color: order.payment_status === 'paid' ? '#4a9e6a' : '#e85a4a',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: '2px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {order.payment_status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Quick Workflow Action */}
                          {order.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                disabled={isUpdating}
                                onClick={() => updateStatus(order.id, 'confirmed')}
                                className="btn-primary"
                                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                title="Terima Pesanan"
                              >
                                Terima
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => updateStatus(order.id, 'cancelled')}
                                style={{
                                  background: 'rgba(232, 90, 74, 0.15)',
                                  color: '#e85a4a',
                                  border: '1px solid rgba(232, 90, 74, 0.3)',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Tolak Pesanan"
                              >
                                Tolak
                              </button>
                            </div>
                          )}

                          {order.status === 'confirmed' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateStatus(order.id, 'preparing')}
                              style={{
                                background: '#a04ae8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Racik
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateStatus(order.id, 'ready')}
                              style={{
                                background: '#4a9e6a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Siap Saji
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              disabled={isUpdating}
                              onClick={() => updateStatus(order.id, 'completed')}
                              style={{
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Selesai
                            </button>
                          )}

                          {/* View Detail Modal */}
                          <button
                            onClick={() => openDetailModal(order)}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: 'var(--color-text)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Lihat Detail Pesanan"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Quick Print Receipt Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenReceipt(order)
                            }}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: 'var(--color-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            title="Cetak Struk Thermal"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.25rem',
              width: '100%',
              maxWidth: '520px',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                #{selectedOrder.id.slice(0, 8).toUpperCase()}
              </span>
              <span style={{
                background: statusBadgeColors[selectedOrder.status]?.bg,
                color: statusBadgeColors[selectedOrder.status]?.color,
                padding: '2px 8px',
                borderRadius: '50px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>
                {statusBadgeColors[selectedOrder.status]?.label}
              </span>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', marginBottom: '1rem' }}>
              Rincian Pesanan
            </h3>

            {/* Customer Details */}
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Pelanggan:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_phone})</div>
              <div><strong>Tipe:</strong> {selectedOrder.order_type === 'dine_in' ? `Dine In (${selectedOrder.table_number || 'Tanpa No Meja'})` : 'Take Away'}</div>
              <div><strong>Pembayaran:</strong> {selectedOrder.payment_method.toUpperCase()} ({selectedOrder.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'})</div>
              {selectedOrder.notes && <div><strong>Catatan:</strong> <em>&ldquo;{selectedOrder.notes}&rdquo;</em></div>}
            </div>

            {/* Items */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.75rem' }}>
              Item Pesanan:
            </h4>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>Memuat item...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
                {modalItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.menu_item_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.quantity} × Rp {item.price.toLocaleString('id-ID')}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Total Transaksi</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)' }}>
                Rp {Number(selectedOrder.total_amount).toLocaleString('id-ID')}
              </span>
            </div>

            {/* Cetak Struk Button in Detail Modal */}
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => handleOpenReceipt(selectedOrder, modalItems)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <Printer size={16} />
                Cetak Struk Thermal (58mm / 80mm)
              </button>
            </div>

            {/* Change Status Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ubah Status:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.45rem' }}>
                {(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => updateStatus(selectedOrder.id, st)}
                    style={{
                      padding: '6px',
                      borderRadius: '6px',
                      border: `1px solid ${selectedOrder.status === st ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: selectedOrder.status === st ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: selectedOrder.status === st ? 'white' : 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {statusBadgeColors[st]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal Component */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={receiptOrder}
        items={receiptItems}
      />
    </div>
  )
}
