'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Trash2,
  RotateCcw,
  Calendar,
  CreditCard,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReceiptModal, ReceiptOrder, ReceiptItem } from '@/components/admin/ReceiptModal'
import { awardLoyaltyPointsForOrder } from '@/lib/loyalty'

interface Order {
  id: string
  user_id?: string | null
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

  // Filters State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine_in' | 'takeaway'>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalItems, setModalItems] = useState<OrderItem[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Deletion States
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<Order | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Bulk Deletion Modal
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<'all_finished' | 'completed_only' | 'cancelled_only'>('all_finished')
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Receipt Modal States
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<ReceiptOrder | null>(null)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])

  const supabase = createClient()

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev))
    }, 4000)
  }

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

    // Real-time channel for instant order updates
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
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
      }

      // Berikan Poin Loyalitas jika status selesai & ada user_id
      if (newStatus === 'completed') {
        const targetOrder = orders.find(o => o.id === orderId)
        if (targetOrder?.user_id) {
          awardLoyaltyPointsForOrder(supabase, orderId, targetOrder.user_id, targetOrder.total_amount).then(res => {
            if (res.success && res.pointsAwarded > 0) {
              showToast('success', `Status selesai & +${res.pointsAwarded} Poin Rasa diberikan ke pelanggan!`)
              return
            }
          })
        }
      }

      showToast('success', `Status pesanan berhasil diubah menjadi ${statusBadgeColors[newStatus]?.label || newStatus}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status'
      showToast('error', msg)
    } finally {
      setUpdatingId(null)
    }
  }

  // Toggle payment status
  const togglePayment = async (orderId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: nextStatus as 'unpaid' | 'paid' } : o))
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status: nextStatus as 'unpaid' | 'paid' } : null)
      }

      // Berikan poin loyalitas jika lunas & ada user_id
      if (nextStatus === 'paid') {
        const targetOrder = orders.find(o => o.id === orderId)
        if (targetOrder?.user_id) {
          awardLoyaltyPointsForOrder(supabase, orderId, targetOrder.user_id, targetOrder.total_amount).then(res => {
            if (res.success && res.pointsAwarded > 0) {
              showToast('success', `LUNAS & +${res.pointsAwarded} Poin Rasa tercatat untuk pelanggan!`)
              return
            }
          })
        }
      }

      showToast('success', `Status pembayaran diubah ke ${nextStatus === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status pembayaran'
      showToast('error', msg)
    }
  }

  // Delete single order
  const handleDeleteOrder = async (order: Order) => {
    setDeletingId(order.id)
    try {
      // 1. Unlink vouchers associated with this order
      await supabase.from('user_vouchers').update({ order_id: null }).eq('order_id', order.id)

      // 2. Delete order_items first
      await supabase.from('order_items').delete().eq('order_id', order.id)

      // 3. Delete order
      const { error } = await supabase.from('orders').delete().eq('id', order.id)
      if (error) throw error

      setOrders(prev => prev.filter(o => o.id !== order.id))
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null)
      }
      setDeleteConfirmOrder(null)
      showToast('success', `Pesanan #${order.id.slice(0, 8).toUpperCase()} berhasil dihapus secara permanen.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pesanan'
      showToast('error', 'Gagal menghapus pesanan: ' + msg)
    } finally {
      setDeletingId(null)
    }
  }

  // Bulk delete completed / cancelled orders
  const handleBulkDeleteOrders = async () => {
    setBulkDeleting(true)
    try {
      const targetOrders = orders.filter(o => {
        if (bulkDeleteTarget === 'completed_only') return o.status === 'completed'
        if (bulkDeleteTarget === 'cancelled_only') return o.status === 'cancelled'
        return o.status === 'completed' || o.status === 'cancelled'
      })

      if (targetOrders.length === 0) {
        showToast('error', 'Tidak ada pesanan yang sesuai untuk dibersihkan.')
        setBulkDeleteModalOpen(false)
        return
      }

      const targetIds = targetOrders.map(o => o.id)

      // 1. Unlink vouchers
      await supabase.from('user_vouchers').update({ order_id: null }).in('order_id', targetIds)

      // 2. Delete order items
      await supabase.from('order_items').delete().in('order_id', targetIds)

      // 3. Delete orders
      const { error } = await supabase.from('orders').delete().in('id', targetIds)
      if (error) throw error

      setOrders(prev => prev.filter(o => !targetIds.includes(o.id)))
      if (selectedOrder && targetIds.includes(selectedOrder.id)) {
        setSelectedOrder(null)
      }
      setBulkDeleteModalOpen(false)
      showToast('success', `Berhasil membersihkan ${targetIds.length} pesanan riwayat dari database.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membersihkan pesanan'
      showToast('error', 'Gagal membersihkan pesanan: ' + msg)
    } finally {
      setBulkDeleting(false)
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setOrderTypeFilter('all')
    setPaymentStatusFilter('all')
    setDateFilter('all')
  }

  const isFilterActive =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    orderTypeFilter !== 'all' ||
    paymentStatusFilter !== 'all' ||
    dateFilter !== 'all'

  // Date filtering helper
  const isDateMatch = (dateStr: string, filter: typeof dateFilter) => {
    if (filter === 'all') return true
    const orderDate = new Date(dateStr)
    const now = new Date()

    if (filter === 'today') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate()
      )
    }
    if (filter === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return orderDate >= sevenDaysAgo
    }
    if (filter === 'month') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth()
      )
    }
    return true
  }

  // Filtered orders computation
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchStatus = statusFilter === 'all' || order.status === statusFilter
      const matchType = orderTypeFilter === 'all' || order.order_type === orderTypeFilter
      const matchPayment = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter
      const matchDate = isDateMatch(order.created_at, dateFilter)
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        order.customer_name.toLowerCase().includes(q) ||
        order.customer_phone.includes(q) ||
        (order.table_number && order.table_number.toLowerCase().includes(q)) ||
        order.id.toLowerCase().includes(q)

      return matchStatus && matchType && matchPayment && matchDate && matchSearch
    })
  }, [orders, statusFilter, orderTypeFilter, paymentStatusFilter, dateFilter, search])

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    }
    orders.forEach(o => {
      if (counts[o.status] !== undefined) counts[o.status]++
    })
    return counts
  }, [orders])

  // Statistics
  const activeOrdersCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length
  const cancelledOrdersCount = orders.filter(o => o.status === 'cancelled').length
  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total_amount), 0)

  const finishedTotalCount = completedOrdersCount + cancelledOrdersCount

  return (
    <div>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: notification.type === 'success' ? '#143823' : '#3d1616',
            color: notification.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${notification.type === 'success' ? '#22c55e44' : '#ef444444'}`,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            fontFamily: 'var(--font-inter)',
            fontSize: '0.88rem',
            fontWeight: 500,
            maxWidth: '420px',
            animation: 'fadeInUp 0.25s ease-out',
          }}
        >
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span style={{ flex: 1 }}>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Title & Top Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.25rem', color: 'var(--color-text)' }}>
            Manajemen Pesanan
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            Kelola pesanan masuk, pantau status racikan barista, filter transaksi, dan bersihkan riwayat pesanan selesai.
          </p>
        </div>

        {/* Quick Action: Bulk Clean Completed/Cancelled Orders */}
        <button
          onClick={() => setBulkDeleteModalOpen(true)}
          disabled={finishedTotalCount === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.65rem 1.1rem',
            background: finishedTotalCount === 0 ? 'var(--color-bg-secondary)' : 'rgba(232, 90, 74, 0.12)',
            color: finishedTotalCount === 0 ? 'var(--color-text-muted)' : '#e85a4a',
            border: `1px solid ${finishedTotalCount === 0 ? 'var(--color-border)' : 'rgba(232, 90, 74, 0.35)'}`,
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            fontWeight: 600,
            fontFamily: 'var(--font-inter)',
            cursor: finishedTotalCount === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          title={finishedTotalCount === 0 ? 'Tidak ada pesanan selesai/batal untuk dibersihkan' : 'Hapus data pesanan selesai/batal sekaligus'}
        >
          <Trash2 size={16} />
          <span>Bersihkan Riwayat ({finishedTotalCount})</span>
        </button>
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

      {/* FILTER SECTION CARD */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {/* Row 1: Search & Dropdown Filters */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center',
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.55rem 0.85rem',
          }}>
            <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari pelanggan, meja, ID..."
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
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Order Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UtensilsCrossed size={14} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={orderTypeFilter}
              onChange={e => setOrderTypeFilter(e.target.value as typeof orderTypeFilter)}
              style={{
                width: '100%',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-inter)',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Tipe Order</option>
              <option value="dine_in">Makan di Tempat (Dine In)</option>
              <option value="takeaway">Bungkus (Takeaway)</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={14} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={paymentStatusFilter}
              onChange={e => setPaymentStatusFilter(e.target.value as typeof paymentStatusFilter)}
              style={{
                width: '100%',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-inter)',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Status Bayar</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="unpaid">Belum Bayar (Unpaid)</option>
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as typeof dateFilter)}
              style={{
                width: '100%',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-inter)',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              onClick={resetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.55rem 1rem',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                fontFamily: 'var(--font-inter)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <RotateCcw size={14} />
              Reset Filter
            </button>
          )}
        </div>

        {/* Row 2: Status Tabs with Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { key: 'all', label: 'Semua' },
              { key: 'pending', label: 'Menunggu' },
              { key: 'confirmed', label: 'Dikonfirmasi' },
              { key: 'preparing', label: 'Diracik' },
              { key: 'ready', label: 'Siap' },
              { key: 'completed', label: 'Selesai' },
              { key: 'cancelled', label: 'Dibatalkan' },
            ].map(tab => {
              const count = statusCounts[tab.key] || 0
              const isActive = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '50px',
                    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: isActive ? 'white' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-inter)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '20px',
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-card)',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Results Summary Info */}
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
            Menampilkan <strong style={{ color: 'var(--color-text)' }}>{filteredOrders.length}</strong> dari {orders.length} pesanan
          </div>
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
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              {isFilterActive ? 'Tidak ada pesanan yang sesuai dengan filter yang dipilih.' : 'Belum ada data pesanan.'}
            </p>
            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="btn-outline"
                style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={14} />
                Kembalikan Semua Filter
              </button>
            )}
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
                  const isDeleting = deletingId === order.id

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
                          {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}{' '}
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

                          {/* Delete Order Button */}
                          <button
                            disabled={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirmOrder(order)
                            }}
                            style={{
                              background: 'rgba(232, 90, 74, 0.12)',
                              border: '1px solid rgba(232, 90, 74, 0.3)',
                              borderRadius: '8px',
                              padding: '5px 8px',
                              cursor: isDeleting ? 'wait' : 'pointer',
                              color: '#e85a4a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            title="Hapus Pesanan Ini"
                          >
                            <Trash2 size={14} />
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

      {/* Single Order Delete Confirmation Modal */}
      {deleteConfirmOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !deletingId && setDeleteConfirmOrder(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid rgba(232, 90, 74, 0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(232, 90, 74, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e85a4a',
                flexShrink: 0,
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', margin: 0 }}>
                  Hapus Pesanan #{deleteConfirmOrder.id.slice(0, 8).toUpperCase()}?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Konfirmasi penghapusan data transaksi
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              fontSize: '0.84rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '1.25rem',
              lineHeight: 1.5,
            }}>
              <div><strong>Pelanggan:</strong> {deleteConfirmOrder.customer_name} ({deleteConfirmOrder.customer_phone})</div>
              <div><strong>Status:</strong> {statusBadgeColors[deleteConfirmOrder.status]?.label || deleteConfirmOrder.status}</div>
              <div><strong>Total:</strong> Rp {Number(deleteConfirmOrder.total_amount).toLocaleString('id-ID')}</div>
              <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.78rem', color: '#e85a4a' }}>
                ⚠️ Data pesanan beserta rincian item menunya akan dihapus secara permanen dari database.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteConfirmOrder(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: deletingId ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => handleDeleteOrder(deleteConfirmOrder)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#e85a4a',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: deletingId ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={15} />
                {deletingId ? 'Menghapus...' : 'Ya, Hapus Pesanan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !bulkDeleting && setBulkDeleteModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid rgba(232, 90, 74, 0.4)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(232, 90, 74, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e85a4a',
                flexShrink: 0,
              }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', margin: 0 }}>
                  Bersihkan Riwayat Pesanan
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Hapus pesanan yang sudah selesai atau dibatalkan agar database tetap bersih & ringan.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                PILIH DATA YANG INGIN DIBERSIHKAN:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: bulkDeleteTarget === 'all_finished' ? 'rgba(232, 160, 74, 0.1)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${bulkDeleteTarget === 'all_finished' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}>
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={bulkDeleteTarget === 'all_finished'}
                    onChange={() => setBulkDeleteTarget('all_finished')}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Semua Pesanan Selesai & Dibatalkan</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      {finishedTotalCount} pesanan ({completedOrdersCount} Selesai, {cancelledOrdersCount} Dibatalkan)
                    </span>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: bulkDeleteTarget === 'completed_only' ? 'rgba(74, 158, 106, 0.1)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${bulkDeleteTarget === 'completed_only' ? '#4a9e6a' : 'var(--color-border)'}`,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}>
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={bulkDeleteTarget === 'completed_only'}
                    onChange={() => setBulkDeleteTarget('completed_only')}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Hanya Pesanan Selesai</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      {completedOrdersCount} pesanan selesai
                    </span>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: bulkDeleteTarget === 'cancelled_only' ? 'rgba(232, 90, 74, 0.1)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${bulkDeleteTarget === 'cancelled_only' ? '#e85a4a' : 'var(--color-border)'}`,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}>
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={bulkDeleteTarget === 'cancelled_only'}
                    onChange={() => setBulkDeleteTarget('cancelled_only')}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Hanya Pesanan Dibatalkan</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                      {cancelledOrdersCount} pesanan dibatalkan
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              ℹ️ Pesanan aktif (Menunggu, Dikonfirmasi, Diracik, Siap Saji) aman dan tidak akan terhapus.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setBulkDeleteModalOpen(false)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDeleteOrders}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#e85a4a',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: bulkDeleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={15} />
                {bulkDeleting ? 'Sedang Membersihkan...' : 'Bersihkan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

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

            {/* Actions Inside Detail Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {/* Cetak Struk */}
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

              {/* Hapus Pesanan Ini Button */}
              <button
                type="button"
                onClick={() => setDeleteConfirmOrder(selectedOrder)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  background: 'rgba(232, 90, 74, 0.12)',
                  border: '1px solid rgba(232, 90, 74, 0.35)',
                  color: '#e85a4a',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <Trash2 size={15} />
                Hapus Pesanan Ini
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
