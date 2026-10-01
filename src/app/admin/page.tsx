'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Coffee,
  Tag,
  ShoppingBag,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  BarChart3,
  Layers,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface OrderRecord {
  id: string
  customer_name: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
}

interface OrderItemRecord {
  id: string
  order_id: string
  menu_item_name: string
  quantity: number
  price: number
  subtotal: number
  cost_price?: number
}

interface MenuItemRecord {
  id: string
  name: string
  price: number
  cost_price?: number
  category: string
}

interface VoucherRecord {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  is_active: boolean
  expires_at: string
}

type ChartFilter = 'harian-7' | 'harian-30' | 'bulanan-6' | 'bulanan-12'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  // Raw data from database
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [orderItems, setOrderItems] = useState<OrderItemRecord[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([])
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([])
  const [totalUsers, setTotalUsers] = useState(0)

  // Chart time filter
  const [chartFilter, setChartFilter] = useState<ChartFilter>('harian-7')
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) setUserEmail(user.email)

        const [ordersRes, itemsRes, menuRes, vouchersRes, usersRes] = await Promise.all([
          supabase.from('orders').select('id, customer_name, total_amount, status, payment_status, created_at').order('created_at', { ascending: false }),
          supabase.from('order_items').select('id, order_id, menu_item_name, quantity, price, subtotal, cost_price'),
          supabase.from('menu_items').select('id, name, price, cost_price, category'),
          supabase.from('vouchers').select('*').order('created_at', { ascending: false }).limit(5),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
        ])

        if (ordersRes.data) setOrders(ordersRes.data)
        if (itemsRes.data) setOrderItems(itemsRes.data)
        if (menuRes.data) setMenuItems(menuRes.data)
        if (vouchersRes.data) setVouchers(vouchersRes.data)
        if (usersRes.count !== null) setTotalUsers(usersRes.count)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  // Mapping cost price per menu item name
  const menuCostMap = useMemo(() => {
    const map = new Map<string, number>()
    menuItems.forEach(item => {
      map.set(item.name.toLowerCase().trim(), Number(item.cost_price || 0))
    })
    return map
  }, [menuItems])

  // Mapping total modal (COGS) per order
  const orderCostMap = useMemo(() => {
    const map = new Map<string, number>()
    orderItems.forEach(item => {
      const unitCost = item.cost_price !== undefined && item.cost_price > 0
        ? Number(item.cost_price)
        : (menuCostMap.get(item.menu_item_name.toLowerCase().trim()) ?? 0)
      const currentCost = map.get(item.order_id) || 0
      map.set(item.order_id, currentCost + (unitCost * item.quantity))
    })
    return map
  }, [orderItems, menuCostMap])

  // Eligible completed/paid orders for financial metrics
  const validFinancialOrders = useMemo(() => {
    return orders.filter(o => o.status === 'completed' || o.payment_status === 'paid')
  }, [orders])

  // Today & This Month strings (local timezone)
  const now = new Date()
  const todayDateStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM

  // Total Lifetime & Period Financials
  const financials = useMemo(() => {
    let totalOmset = 0
    let totalModal = 0

    let todayOmset = 0
    let todayModal = 0

    let monthOmset = 0
    let monthModal = 0

    validFinancialOrders.forEach(order => {
      const rev = Number(order.total_amount)
      const cost = orderCostMap.get(order.id) || 0

      totalOmset += rev
      totalModal += cost

      const orderDate = new Date(order.created_at)
      const orderDateStr = orderDate.toLocaleDateString('en-CA')
      const orderMonthStr = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`

      if (orderDateStr === todayDateStr) {
        todayOmset += rev
        todayModal += cost
      }

      if (orderMonthStr === currentMonthKey) {
        monthOmset += rev
        monthModal += cost
      }
    })

    const totalLaba = totalOmset - totalModal
    const totalMargin = totalOmset > 0 ? (totalLaba / totalOmset) * 100 : 0

    const todayLaba = todayOmset - todayModal
    const todayMargin = todayOmset > 0 ? (todayLaba / todayOmset) * 100 : 0

    const monthLaba = monthOmset - monthModal
    const monthMargin = monthOmset > 0 ? (monthLaba / monthOmset) * 100 : 0

    return {
      totalOmset,
      totalModal,
      totalLaba,
      totalMargin,
      todayOmset,
      todayModal,
      todayLaba,
      todayMargin,
      monthOmset,
      monthModal,
      monthLaba,
      monthMargin,
    }
  }, [validFinancialOrders, orderCostMap, todayDateStr, currentMonthKey])

  // Chart Data Processing based on chartFilter
  const chartData = useMemo(() => {
    interface Bucket {
      key: string
      label: string
      shortLabel: string
      omset: number
      modal: number
      laba: number
    }

    const buckets: Bucket[] = []
    const nowTime = new Date()

    if (chartFilter === 'harian-7' || chartFilter === 'harian-30') {
      const daysCount = chartFilter === 'harian-7' ? 7 : 30

      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(nowTime)
        d.setDate(d.getDate() - i)
        const dateKey = d.toLocaleDateString('en-CA') // YYYY-MM-DD
        const shortLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        const fullLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

        buckets.push({
          key: dateKey,
          label: fullLabel,
          shortLabel,
          omset: 0,
          modal: 0,
          laba: 0,
        })
      }

      validFinancialOrders.forEach(order => {
        const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA')
        const bucket = buckets.find(b => b.key === orderDateStr)
        if (bucket) {
          const rev = Number(order.total_amount)
          const cost = orderCostMap.get(order.id) || 0
          bucket.omset += rev
          bucket.modal += cost
          bucket.laba += (rev - cost)
        }
      })
    } else {
      // Bulanan (6 or 12 months)
      const monthsCount = chartFilter === 'bulanan-6' ? 6 : 12

      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(nowTime.getFullYear(), nowTime.getMonth() - i, 1)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const shortLabel = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
        const fullLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

        buckets.push({
          key: monthKey,
          label: fullLabel,
          shortLabel,
          omset: 0,
          modal: 0,
          laba: 0,
        })
      }

      validFinancialOrders.forEach(order => {
        const d = new Date(order.created_at)
        const orderMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = buckets.find(b => b.key === orderMonthStr)
        if (bucket) {
          const rev = Number(order.total_amount)
          const cost = orderCostMap.get(order.id) || 0
          bucket.omset += rev
          bucket.modal += cost
          bucket.laba += (rev - cost)
        }
      })
    }

    return buckets
  }, [chartFilter, validFinancialOrders, orderCostMap])

  // Chart totals for the selected period
  const periodTotals = useMemo(() => {
    let omset = 0
    let modal = 0
    let laba = 0
    chartData.forEach(b => {
      omset += b.omset
      modal += b.modal
      laba += b.laba
    })
    const margin = omset > 0 ? (laba / omset) * 100 : 0
    return { omset, modal, laba, margin }
  }, [chartData])

  // Top Most Profitable Menu Items
  const topProfitableItems = useMemo(() => {
    const itemMap = new Map<string, { name: string; sold: number; revenue: number; cost: number; profit: number }>()

    orderItems.forEach(item => {
      const order = orders.find(o => o.id === item.order_id)
      if (!order || (order.status !== 'completed' && order.payment_status !== 'paid')) return

      const name = item.menu_item_name
      const unitCost = item.cost_price !== undefined && item.cost_price > 0
        ? Number(item.cost_price)
        : (menuCostMap.get(name.toLowerCase().trim()) ?? 0)

      const entry = itemMap.get(name) || { name, sold: 0, revenue: 0, cost: 0, profit: 0 }
      entry.sold += item.quantity
      entry.revenue += Number(item.subtotal || (item.price * item.quantity))
      entry.cost += unitCost * item.quantity
      entry.profit = entry.revenue - entry.cost
      itemMap.set(name, entry)
    })

    return Array.from(itemMap.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
  }, [orderItems, orders, menuCostMap])

  // Maximum value for SVG scaling
  const maxChartValue = useMemo(() => {
    let max = 100000 // default minimum ceiling
    chartData.forEach(b => {
      if (b.omset > max) max = b.omset
      if (b.modal > max) max = b.modal
      if (b.laba > max) max = b.laba
    })
    return max * 1.15 // 15% headroom for aesthetic spacing
  }, [chartData])

  // Format currency helper
  const fmtRp = (num: number) => `Rp ${Math.round(num).toLocaleString('id-ID')}`

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
            Dashboard Finansial & Operasional 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.88rem' }}>
            Pantau pergerakan omset, biaya pengeluaran modal (HPP), dan laba bersih Lorong Rasa secara real-time.
          </p>
        </div>

        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-inter)',
        }}>
          <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* TOP FINANCIAL METRICS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {/* TOTAL OMSET (REVENUE) */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(232, 160, 74, 0.1)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(232, 160, 74, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}>
              <DollarSign size={22} />
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '50px',
              background: 'rgba(232, 160, 74, 0.15)',
              color: 'var(--color-primary)',
            }}>
              Pendapatan
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
            Total Omset Penjualan
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-primary)', margin: '0.35rem 0' }}>
            {loading ? '—' : fmtRp(financials.totalOmset)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
            <span>Hari ini: <strong>{fmtRp(financials.todayOmset)}</strong></span>
            <span>Bulan ini: <strong>{fmtRp(financials.monthOmset)}</strong></span>
          </div>
        </div>

        {/* PENGELUARAN MODAL (HPP) */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(232, 90, 74, 0.1)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(232, 90, 74, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e85a4a',
            }}>
              <TrendingUp size={22} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '50px',
              background: 'rgba(232, 90, 74, 0.15)',
              color: '#e85a4a',
            }}>
              Biaya HPP
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
            Pengeluaran Modal Bahan
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: '#e85a4a', margin: '0.35rem 0' }}>
            {loading ? '—' : fmtRp(financials.totalModal)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
            <span>Hari ini: <strong>{fmtRp(financials.todayModal)}</strong></span>
            <span>Bulan ini: <strong>{fmtRp(financials.monthModal)}</strong></span>
          </div>
        </div>

        {/* LABA BERSIH (NET PROFIT) */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid rgba(74, 158, 106, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 20px rgba(74, 158, 106, 0.08)',
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(74, 158, 106, 0.12)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(74, 158, 106, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4a9e6a',
            }}>
              <PieChart size={22} />
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '50px',
              background: 'rgba(74, 158, 106, 0.2)',
              color: '#4a9e6a',
            }}>
              {financials.totalMargin.toFixed(1)}% Margin
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
            Laba Bersih (Keuntungan)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: '#4a9e6a', margin: '0.35rem 0' }}>
            {loading ? '—' : fmtRp(financials.totalLaba)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.6rem', marginTop: '0.5rem' }}>
            <span>Hari ini: <strong style={{ color: '#4a9e6a' }}>{fmtRp(financials.todayLaba)}</strong></span>
            <span>Bulan ini: <strong style={{ color: '#4a9e6a' }}>{fmtRp(financials.monthLaba)}</strong></span>
          </div>
        </div>
      </div>

      {/* REVENUE, COST & PROFIT INTERACTIVE CHART */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Chart Header & Filter Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', margin: 0, color: 'var(--color-text)' }}>
                Grafik Pendapatan, Modal & Laba
              </h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Perbandingan visual antara omset kotor, biaya modal bahan, dan laba bersih harian/bulanan
            </p>
          </div>

          {/* Time Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '50px',
            padding: '3px',
            gap: '3px',
            flexWrap: 'wrap',
          }}>
            {[
              { key: 'harian-7', label: '7 Hari' },
              { key: 'harian-30', label: '30 Hari' },
              { key: 'bulanan-6', label: '6 Bulan' },
              { key: 'bulanan-12', label: '1 Tahun' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setChartFilter(tab.key as ChartFilter)
                  setHoveredBarIndex(null)
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '50px',
                  border: 'none',
                  background: chartFilter === tab.key ? 'var(--color-primary)' : 'transparent',
                  color: chartFilter === tab.key ? 'white' : 'var(--color-text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-inter)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-primary)' }} />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pendapatan (Omset)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e85a4a' }} />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pengeluaran Modal (HPP)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4a9e6a' }} />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Laba Bersih</span>
          </div>
        </div>

        {/* Responsive Interactive SVG Chart */}
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {loading ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Memuat data grafik finansial...
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              Belum ada riwayat transaksi pada periode ini.
            </div>
          ) : (
            <div style={{ minWidth: chartFilter === 'harian-30' ? '720px' : '100%', height: '280px', position: 'relative' }}>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 1000 280"
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Gradients */}
                  <linearGradient id="omsetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="var(--color-primary-dark)" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e85a4a" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#c53e30" stopOpacity="0.75" />
                  </linearGradient>
                  <linearGradient id="labaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a9e6a" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#2e7347" stopOpacity="0.75" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 240 - ratio * 200
                  const val = ratio * maxChartValue
                  return (
                    <g key={idx}>
                      <line
                        x1="45"
                        y1={y}
                        x2="980"
                        y2={y}
                        stroke="var(--color-border-light)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="35"
                        y={y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="var(--color-text-muted)"
                        fontFamily="var(--font-inter)"
                      >
                        {val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : val >= 1000 ? `${Math.round(val / 1000)}rb` : '0'}
                      </text>
                    </g>
                  )
                })}

                {/* Grouped Bars per period bucket */}
                {chartData.map((item, idx) => {
                  const numBuckets = chartData.length
                  const slotWidth = (980 - 60) / numBuckets
                  const slotX = 60 + idx * slotWidth
                  const barWidth = Math.max(Math.min(slotWidth * 0.22, 18), 6)
                  const spacing = barWidth * 0.25

                  const omsetH = Math.max((item.omset / maxChartValue) * 200, item.omset > 0 ? 4 : 0)
                  const modalH = Math.max((item.modal / maxChartValue) * 200, item.modal > 0 ? 4 : 0)
                  const labaH = Math.max((Math.max(item.laba, 0) / maxChartValue) * 200, item.laba > 0 ? 4 : 0)

                  const groupStartX = slotX + (slotWidth - (barWidth * 3 + spacing * 2)) / 2
                  const isHovered = hoveredBarIndex === idx

                  return (
                    <g
                      key={item.key}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Background highlight on hover */}
                      {isHovered && (
                        <rect
                          x={slotX}
                          y={20}
                          width={slotWidth}
                          height={225}
                          fill="rgba(255,255,255,0.04)"
                          rx="6"
                        />
                      )}

                      {/* Omset Bar */}
                      <rect
                        x={groupStartX}
                        y={240 - omsetH}
                        width={barWidth}
                        height={omsetH}
                        fill="url(#omsetGrad)"
                        rx="3"
                        style={{ transition: 'all 0.2s' }}
                      />

                      {/* Modal Bar */}
                      <rect
                        x={groupStartX + barWidth + spacing}
                        y={240 - modalH}
                        width={barWidth}
                        height={modalH}
                        fill="url(#modalGrad)"
                        rx="3"
                        style={{ transition: 'all 0.2s' }}
                      />

                      {/* Laba Bar */}
                      <rect
                        x={groupStartX + (barWidth + spacing) * 2}
                        y={240 - labaH}
                        width={barWidth}
                        height={labaH}
                        fill="url(#labaGrad)"
                        rx="3"
                        style={{ transition: 'all 0.2s' }}
                      />

                      {/* X-axis Label */}
                      <text
                        x={slotX + slotWidth / 2}
                        y="262"
                        textAnchor="middle"
                        fontSize={numBuckets > 15 ? '10' : '11'}
                        fill={isHovered ? 'var(--color-text)' : 'var(--color-text-muted)'}
                        fontWeight={isHovered ? '700' : '500'}
                        fontFamily="var(--font-inter)"
                      >
                        {item.shortLabel}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Floating Tooltip when hovering over a bucket */}
              {hoveredBarIndex !== null && chartData[hoveredBarIndex] && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: `${Math.min(Math.max(10, ((hoveredBarIndex + 0.5) / chartData.length) * 100), 85)}%`,
                    transform: 'translateX(-50%)',
                    background: '#1c1917',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.9rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    minWidth: '175px',
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '5px' }}>
                    {chartData[hoveredBarIndex].label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-primary)' }}>
                      <span>Omset:</span>
                      <strong>{fmtRp(chartData[hoveredBarIndex].omset)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e85a4a' }}>
                      <span>Modal (HPP):</span>
                      <strong>{fmtRp(chartData[hoveredBarIndex].modal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a9e6a', borderTop: '1px dashed var(--color-border)', paddingTop: '3px', marginTop: '2px', fontWeight: 700 }}>
                      <span>Laba Bersih:</span>
                      <strong>{fmtRp(chartData[hoveredBarIndex].laba)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Period Summary Strip */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border-light)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          fontSize: '0.82rem',
          fontFamily: 'var(--font-inter)',
        }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Omset Periode Ini:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)' }}>
              {fmtRp(periodTotals.omset)}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Modal Bahan (HPP):</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e85a4a', fontFamily: 'var(--font-playfair)' }}>
              {fmtRp(periodTotals.modal)}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Laba Bersih Periode:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4a9e6a', fontFamily: 'var(--font-playfair)' }}>
              {fmtRp(periodTotals.laba)} ({periodTotals.margin.toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: TOP PROFIT MENUS & OPERATIONS STATS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* TOP PROFIT MENUS */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: '#4a9e6a' }} />
              <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-playfair)', margin: 0, color: 'var(--color-text)' }}>
                Menu Penyumbang Laba Terbesar
              </h3>
            </div>
            <a href="/admin/menu" style={{ fontSize: '0.78rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Atur Menu & Stok →
            </a>
          </div>

          {topProfitableItems.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Belum ada data transaksi menu untuk menganalisis laba.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topProfitableItems.map((item, idx) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                      color: idx === 0 ? 'white' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)' }}>
                        Terjual: <strong>{item.sold} porsi</strong> • Omset: {fmtRp(item.revenue)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4a9e6a' }}>
                      +{fmtRp(item.profit)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Modal: {fmtRp(item.cost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(232, 160, 74, 0.08)',
            border: '1px solid rgba(232, 160, 74, 0.25)',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Info size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span>
              Laba dihitung dari <strong>Harga Jual - Harga Modal</strong> yang diatur di menu <strong>Menu & Stok</strong>.
            </span>
          </div>
        </div>

        {/* OPERATIONAL SUMMARY CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          {/* Total Pesanan Selesai */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(74, 158, 106, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a9e6a' }}>
                <ShoppingBag size={18} />
              </div>
              <a href="/admin/orders" style={{ color: 'var(--color-text-muted)' }}><ArrowUpRight size={15} /></a>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>
                {validFinancialOrders.length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Pesanan Lunas / Selesai
              </div>
            </div>
          </div>

          {/* Item Menu Aktif */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(232, 160, 74, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <Coffee size={18} />
              </div>
              <a href="/admin/menu" style={{ color: 'var(--color-text-muted)' }}><ArrowUpRight size={15} /></a>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>
                {menuItems.filter(m => m.price > 0).length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Total Item Menu
              </div>
            </div>
          </div>

          {/* Total Pengguna */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(46, 122, 196, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2e7ac4' }}>
                <Users size={18} />
              </div>
              <a href="/admin/users" style={{ color: 'var(--color-text-muted)' }}><ArrowUpRight size={15} /></a>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>
                {totalUsers}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Pengguna Terdaftar
              </div>
            </div>
          </div>

          {/* Voucher Aktif */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(158, 74, 158, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e4a9e' }}>
                <Tag size={18} />
              </div>
              <a href="/admin/vouchers" style={{ color: 'var(--color-text-muted)' }}><ArrowUpRight size={15} /></a>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>
                {vouchers.filter(v => v.is_active).length}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Promo Voucher Aktif
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT VOUCHERS TABLE */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)', fontWeight: 600, margin: 0 }}>
            Voucher Promo Terbaru
          </h2>
          <a href="/admin/vouchers" style={{
            fontSize: '0.8rem',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            fontWeight: 500,
          }}>
            Kelola semua voucher →
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Memuat...
            </div>
          ) : vouchers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Belum ada voucher promo. <a href="/admin/vouchers" style={{ color: 'var(--color-primary)' }}>Buat voucher pertama →</a>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Kode Voucher', 'Diskon', 'Min. Order', 'Status', 'Kadaluarsa'].map(col => (
                    <th key={col} style={{
                      padding: '0.75rem 1.25rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <code style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: 'var(--color-primary)',
                        background: 'var(--color-primary-glow)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {v.code}
                      </code>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {v.discount_type === 'percentage' ? `${v.discount_value}%` : fmtRp(v.discount_value)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--color-text-secondary)' }}>
                      {fmtRp(v.min_order)}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '50px',
                        background: v.is_active ? 'rgba(74, 158, 106, 0.15)' : 'rgba(232, 90, 74, 0.15)',
                        color: v.is_active ? '#4a9e6a' : '#e85a4a',
                      }}>
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--color-text-muted)' }}>
                      {new Date(v.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
