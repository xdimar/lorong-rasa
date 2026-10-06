'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  Percent,
  Gift,
  QrCode,
  Share2,
  Copy,
  Check,
  Coffee,
  Package,
  Search,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  DollarSign,
  Coins,
  ShoppingBag,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowUpRight,
  Filter,
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { MultiProductSelector } from '@/components/admin/MultiProductSelector'
import { parseProductPool } from '@/lib/voucher-draw'
import { PhysicalVoucherModal } from '@/components/voucher/PhysicalVoucherModal'

type DiscountType = 'percentage' | 'fixed' | 'product'

interface UserVoucherClaim {
  id: string
  user_id?: string
  voucher_id?: string
  voucher_code: string
  status: 'claimed' | 'used'
  claimed_at: string
  used_at?: string | null
  order_id?: string | null
}

interface VoucherOrderStat {
  id: string
  voucher_code: string
  total_amount: number
  discount_amount: number
  status: string
  created_at: string
}

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

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  image_url?: string | null
  is_available?: boolean
}

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: 10,
  product_name: '',
  product_menu_item_id: '',
  min_order: 0,
  max_uses: 100,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  is_active: true,
}

function PaperVoucherCard({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  return (
    <PhysicalVoucherModal
      isOpen={true}
      voucher={voucher}
      onClose={onClose}
    />
  )
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [userVouchers, setUserVouchers] = useState<UserVoucherClaim[]>([])
  const [ordersWithVouchers, setOrdersWithVouchers] = useState<VoucherOrderStat[]>([])
  const [showAnalytics, setShowAnalytics] = useState(true)
  const [analyticsTimeFilter, setAnalyticsTimeFilter] = useState<'all' | '30d' | '7d'>('all')

  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [paperModal, setPaperModal] = useState<Voucher | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    const [{ data: vData }, { data: mData }, { data: uvData }, { data: oData }] = await Promise.all([
      supabase.from('vouchers').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_items').select('id,name,price,category,image_url,is_available').order('name'),
      supabase.from('user_vouchers').select('id, user_id, voucher_id, voucher_code, status, claimed_at, used_at, order_id'),
      supabase.from('orders').select('id, voucher_code, total_amount, discount_amount, status, created_at').not('voucher_code', 'is', null),
    ])
    if (vData) setVouchers(vData)
    if (mData) setMenuItems(mData)
    if (uvData) setUserVouchers(uvData)
    if (oData) setOrdersWithVouchers(oData)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // Kalkulasi Metrik & Analitik Efektivitas Voucher
  const analyticsData = useMemo(() => {
    const now = Date.now()
    const filteredOrders = ordersWithVouchers.filter((o) => {
      if (o.status === 'cancelled') return false
      if (analyticsTimeFilter === '7d') {
        return now - new Date(o.created_at).getTime() <= 7 * 24 * 3600 * 1000
      }
      if (analyticsTimeFilter === '30d') {
        return now - new Date(o.created_at).getTime() <= 30 * 24 * 3600 * 1000
      }
      return true
    })

    const filteredClaims = userVouchers.filter((uv) => {
      if (analyticsTimeFilter === '7d') {
        return now - new Date(uv.claimed_at).getTime() <= 7 * 24 * 3600 * 1000
      }
      if (analyticsTimeFilter === '30d') {
        return now - new Date(uv.claimed_at).getTime() <= 30 * 24 * 3600 * 1000
      }
      return true
    })

    // Totals
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalDiscount = filteredOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
    const totalOrdersCount = filteredOrders.length
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0

    // Claims & Usage
    const totalUserClaimsCount = filteredClaims.length
    const totalUserUsedCount = filteredClaims.filter((c) => c.status === 'used').length
    const totalVoucherUses = vouchers.reduce((sum, v) => sum + (v.current_uses || 0), 0)
    const activeVouchersCount = vouchers.filter((v) => v.is_active && new Date(v.expires_at) >= new Date()).length
    const totalVouchersCount = vouchers.length

    // Performance per Voucher
    const performancePerVoucher = vouchers.map((v) => {
      const vOrders = filteredOrders.filter(
        (o) => (o.voucher_code || '').trim().toUpperCase() === v.code.trim().toUpperCase()
      )
      const vRevenue = vOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const vDiscount = vOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
      const vClaims = filteredClaims.filter(
        (c) => (c.voucher_code || '').trim().toUpperCase() === v.code.trim().toUpperCase()
      )
      const vUsedClaims = vClaims.filter((c) => c.status === 'used').length
      const usageRate = v.max_uses > 0 ? Math.min(100, Math.round(((v.current_uses || 0) / v.max_uses) * 100)) : 0

      return {
        ...v,
        ordersCount: vOrders.length,
        revenueGenerated: vRevenue,
        discountGiven: vDiscount,
        claimsCount: vClaims.length,
        usedClaimsCount: vUsedClaims,
        usageRate,
      }
    })

    // Sort by revenue generated then by uses
    performancePerVoucher.sort((a, b) => {
      if (b.revenueGenerated !== a.revenueGenerated) {
        return b.revenueGenerated - a.revenueGenerated
      }
      return (b.current_uses || 0) - (a.current_uses || 0)
    })

    // Breakdown by discount type
    const byType = {
      product: { count: 0, uses: 0, revenue: 0, discount: 0 },
      percentage: { count: 0, uses: 0, revenue: 0, discount: 0 },
      fixed: { count: 0, uses: 0, revenue: 0, discount: 0 },
    }

    performancePerVoucher.forEach((pv) => {
      const t = pv.discount_type
      if (byType[t]) {
        byType[t].count += 1
        byType[t].uses += pv.current_uses || 0
        byType[t].revenue += pv.revenueGenerated
        byType[t].discount += pv.discountGiven
      }
    })

    const claimConversionRate =
      totalUserClaimsCount > 0 ? Math.round((totalUserUsedCount / totalUserClaimsCount) * 100) : 0

    return {
      totalRevenue,
      totalDiscount,
      totalOrdersCount,
      averageOrderValue,
      totalVoucherUses,
      activeVouchersCount,
      totalVouchersCount,
      totalUserClaimsCount,
      totalUserUsedCount,
      claimConversionRate,
      performancePerVoucher,
      byType,
    }
  }, [ordersWithVouchers, userVouchers, vouchers, analyticsTimeFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    let finalMenuItemId: string | null = form.product_menu_item_id || null
    const finalProductName = form.product_name?.trim() || null

    if (form.discount_type === 'product') {
      if (!finalProductName) {
        setError('Harap pilih minimal satu menu produk.')
        setSubmitting(false)
        return
      }
      const names = finalProductName.split(',').map(s => s.trim()).filter(Boolean)
      if (names.length === 1) {
        // Jika hanya 1 produk & namanya persis di database, hubungkan ID
        const matched = menuItems.find(m => m.name.toLowerCase() === names[0].toLowerCase())
        finalMenuItemId = matched ? matched.id : null
      } else {
        // Multi-produk pool (acak 1 saat klaim): item ID dibiarkan null
        finalMenuItemId = null
      }
    }

    const shareToken = Math.random().toString(36).substring(2, 14)
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order: Number(form.min_order) || 0,
      max_uses: form.max_uses,
      expires_at: form.expires_at.includes('T')
        ? new Date(form.expires_at).toISOString()
        : new Date(`${form.expires_at}T23:59:59.999Z`).toISOString(),
      is_active: form.is_active,
      product_name: form.discount_type === 'product' ? finalProductName : null,
      product_menu_item_id: form.discount_type === 'product' && finalMenuItemId ? finalMenuItemId : null,
    }

    let result
    if (editingId) {
      result = await supabase.from('vouchers').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('vouchers').insert({ ...payload, current_uses: 0, share_token: shareToken })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchData()
    }
    setSubmitting(false)
  }

  const handleEdit = (v: Voucher) => {
    setForm({
      code: v.code,
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      product_name: v.product_name || '',
      product_menu_item_id: v.product_menu_item_id || '',
      min_order: v.min_order,
      max_uses: v.max_uses,
      expires_at: v.expires_at.split('T')[0],
      is_active: v.is_active,
    })
    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vouchers').delete().eq('id', id)
    if (error) {
      console.error('Delete voucher error:', error)
      if (
        error.code === '23503' ||
        error.message?.includes('foreign key') ||
        error.message?.includes('violates foreign key')
      ) {
        const confirmDeactivate = confirm(
          'Voucher ini tidak bisa dihapus permanen karena sudah tercatat dalam riwayat klaim member atau transaksi pesanan.\n\nApakah Anda ingin menonaktifkan voucher ini saja agar tidak bisa diklaim atau dipakai lagi?'
        )
        if (confirmDeactivate) {
          await supabase.from('vouchers').update({ is_active: false }).eq('id', id)
        }
      } else {
        alert(`Gagal menghapus voucher: ${error.message || 'Terjadi kendala pada database.'}`)
      }
    }
    setDeleteConfirm(null)
    fetchData()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('vouchers').update({ is_active: !current }).eq('id', id)
    fetchData()
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
    fontFamily: 'var(--font-inter)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
  }
  const labelStyle = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--color-text-secondary)', marginBottom: '6px',
    fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }

  const DISCOUNT_TYPES = [
    { key: 'percentage' as DiscountType, label: 'Persentase (%)', icon: Percent, desc: 'Diskon % dari total order' },
    { key: 'fixed' as DiscountType, label: 'Nominal (Rp)', icon: Gift, desc: 'Potongan harga tetap' },
    { key: 'product' as DiscountType, label: 'Produk Spesifik', icon: Coffee, desc: 'Diskon pada menu tertentu' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Manajemen Voucher</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            Buat voucher diskon persentase, nominal, atau produk spesifik
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
          className="btn-primary"
        >
          <Plus size={18} />Buat Voucher
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'clamp(1.25rem, 4vw, 2rem)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingId ? 'Edit Voucher' : 'Buat Voucher Baru'}</h2>
              <button onClick={() => { setShowForm(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: '#e85a4a15', border: '1px solid #e85a4a44', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#e85a4a', fontFamily: 'var(--font-inter)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Kode */}
              <div>
                <label style={labelStyle}>Kode Voucher</label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="CONTOH10" required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label style={labelStyle}>Deskripsi</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi voucher untuk pelanggan" required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Tipe Diskon — 3 pilihan */}
              <div>
                <label style={labelStyle}>Tipe Diskon</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                  {DISCOUNT_TYPES.map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} type="button" onClick={() => setForm({ ...form, discount_type: key })}
                      style={{ padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: `2px solid ${form.discount_type === key ? 'var(--color-primary)' : 'var(--color-border)'}`, background: form.discount_type === key ? 'var(--color-primary-glow)' : 'transparent', color: form.discount_type === key ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', textAlign: 'center' }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7, lineHeight: 1.3 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product fields (only when discount_type = product) */}
              {form.discount_type === 'product' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Selector Interaktif Database & Rekomendasi Manual (Bisa Multi Produk) */}
                  <MultiProductSelector
                    menuItems={menuItems}
                    selectedNames={
                      form.product_name
                        ? form.product_name.split(',').map(s => s.trim()).filter(Boolean)
                        : []
                    }
                    onChange={names => {
                      const joined = names.join(', ')
                      const singleMatch =
                        names.length === 1
                          ? menuItems.find(m => m.name.toLowerCase() === names[0].toLowerCase())
                          : null
                      setForm(prev => ({
                        ...prev,
                        product_name: joined,
                        product_menu_item_id: singleMatch ? singleMatch.id : '',
                      }))
                    }}
                  />

                  {/* Persentase Diskon Produk (%) */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Persentase Diskon Produk (%)</label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: form.discount_value === 100 ? '#4a9e6a' : 'var(--color-primary)', fontFamily: 'var(--font-inter)' }}>
                        {form.discount_value === 100 ? '🎁 PRODUK GRATIS (100%)' : `${form.discount_value}% Diskon`}
                      </span>
                    </div>

                    {/* Quick presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { val: 10, label: '10%' },
                        { val: 20, label: '20%' },
                        { val: 50, label: '50% (Separuh)' },
                        { val: 100, label: '100% (Gratis)' },
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setForm({ ...form, discount_value: preset.val })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${form.discount_value === preset.val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: form.discount_value === preset.val ? 'var(--color-primary-glow)' : 'var(--color-bg-card)',
                            color: form.discount_value === preset.val ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s',
                            fontFamily: 'var(--font-inter)',
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      style={inputStyle}
                      value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                      min={1}
                      max={100}
                      required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-inter)' }}>
                      {form.discount_value === 100
                        ? '✨ 100% = Produk Gratis! Pelanggan mendapatkan menu ini secara cuma-cuma saat checkout.'
                        : `${form.discount_value}% = Potongan harga sebesar ${form.discount_value}% untuk menu ${form.product_name || 'terpilih'}.`}
                    </div>
                  </div>
                </div>
              )}

              {/* Diskon Value + Min Order (untuk non-product) */}
              {form.discount_type !== 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Nilai Diskon {form.discount_type === 'percentage' ? '(%)' : '(Rp)'}</label>
                    <input type="number" style={inputStyle} value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                      min={1} max={form.discount_type === 'percentage' ? 100 : undefined} required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Min. Order (Rp)</label>
                    <input type="number" style={inputStyle} value={form.min_order}
                      onChange={e => setForm({ ...form, min_order: Number(e.target.value) })}
                      min={0} required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                  </div>
                </div>
              )}

              {/* Max Uses & Expires */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Maks. Penggunaan</label>
                  <input type="number" style={inputStyle} value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })}
                    min={1} required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tanggal Kadaluarsa</label>
                  <input type="date" style={inputStyle} value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })} required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{ width: '48px', height: '26px', borderRadius: '13px', background: form.is_active ? 'var(--color-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: '3px', left: form.is_active ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
                  Voucher {form.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Buat Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard Analitik Efektivitas Voucher */}
      <div style={{ marginBottom: '2rem' }}>
        {/* Header Analitik with Time Filter & Toggle */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(201, 100, 39, 0.2), rgba(74, 158, 106, 0.2))',
                border: '1px solid rgba(201, 100, 39, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Analitik & Efektivitas Promo</h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '50px',
                    background: 'rgba(74, 158, 106, 0.15)',
                    color: '#4a9e6a',
                    border: '1px solid rgba(74, 158, 106, 0.3)',
                  }}
                >
                  Live Insights
                </span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px', margin: 0 }}>
                Pantau dampak finansial voucher terhadap omzet, total penghematan pelanggan, dan konversi klaim.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Filter Waktu */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-bg-secondary)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
              }}
            >
              {[
                { key: 'all' as const, label: 'Semua' },
                { key: '30d' as const, label: '30 Hari' },
                { key: '7d' as const, label: '7 Hari' },
              ].map((tf) => (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setAnalyticsTimeFilter(tf.key)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: analyticsTimeFilter === tf.key ? 'var(--color-primary)' : 'transparent',
                    color: analyticsTimeFilter === tf.key ? '#ffffff' : 'var(--color-text-secondary)',
                    fontSize: '0.76rem',
                    fontWeight: analyticsTimeFilter === tf.key ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Toggle Tampilkan/Sembunyikan */}
            <button
              type="button"
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showAnalytics ? (
                <>
                  <ChevronUp size={14} /> Sembunyikan
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Tampilkan Ringkasan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Isi Dashboard Analitik */}
        {showAnalytics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* 4 Kartu KPI Metrik Utama */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Metrik 1: Omzet dari Promo */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '-15px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(74, 158, 106, 0.08)',
                    zIndex: 0,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Omzet dari Promo
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(74, 158, 106, 0.15)', color: '#4a9e6a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
                    Rp {analyticsData.totalRevenue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ color: '#4a9e6a', fontWeight: 700 }}>{analyticsData.totalOrdersCount} Transaksi</span>
                    <span>pesanan menggunakan kode voucher</span>
                  </div>
                </div>
              </div>

              {/* Metrik 2: Total Penghematan Pelanggan */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '-15px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(201, 100, 39, 0.08)',
                    zIndex: 0,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Diskon Dikeluarkan
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(201, 100, 39, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tag size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '4px' }}>
                    Rp {analyticsData.totalDiscount.toLocaleString('id-ID')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Total Hemat</span>
                    <span>manfaat diskon yang dinikmati pembeli</span>
                  </div>
                </div>
              </div>

              {/* Metrik 3: Penggunaan Voucher */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '-15px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(147, 51, 234, 0.08)',
                    zIndex: 0,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Frekuensi Pemakaian
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(147, 51, 234, 0.15)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Gift size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
                    {analyticsData.totalVoucherUses}x Terpakai
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ color: '#9333ea', fontWeight: 700 }}>{analyticsData.activeVouchersCount}/{analyticsData.totalVouchersCount}</span>
                    <span>voucher aktif berjalan</span>
                  </div>
                </div>
              </div>

              {/* Metrik 4: Rata-rata Nilai Keranjang (AOV) */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    right: '-15px',
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.08)',
                    zIndex: 0,
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Rata-Rata Keranjang (AOV)
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
                    Rp {analyticsData.averageOrderValue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700 }}>Nilai Rata-rata</span>
                    <span>belanja per transaksi bervoucher</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Kolom Komparasi & Leaderboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
              {/* Kolom Kiri: Leaderboard Performa Voucher */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} style={{ color: 'var(--color-primary)' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Leaderboard Performa Voucher</h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Urut omzet & pemakaian</span>
                </div>

                {analyticsData.performancePerVoucher.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Belum ada data voucher.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analyticsData.performancePerVoucher.slice(0, 5).map((pv, idx) => {
                      const typeLabel = pv.discount_type === 'percentage' ? `${pv.discount_value}%` : pv.discount_type === 'fixed' ? `Rp ${pv.discount_value.toLocaleString('id-ID')}` : 'Menu Gratis'
                      const typeBg = pv.discount_type === 'percentage' ? 'rgba(74, 158, 106, 0.12)' : pv.discount_type === 'fixed' ? 'rgba(201, 100, 39, 0.12)' : 'rgba(147, 51, 234, 0.12)'
                      const typeColor = pv.discount_type === 'percentage' ? '#4a9e6a' : pv.discount_type === 'fixed' ? 'var(--color-primary)' : '#9333ea'

                      return (
                        <div
                          key={pv.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '10px 12px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: idx === 0 ? 'rgba(212, 160, 74, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                                  color: idx === 0 ? '#d4a04a' : 'var(--color-text-secondary)',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                #{idx + 1}
                              </span>
                              <code style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                                {pv.code}
                              </code>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: typeBg,
                                  color: typeColor,
                                }}
                              >
                                {typeLabel}
                              </span>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text)' }}>
                                Rp {pv.revenueGenerated.toLocaleString('id-ID')}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                {pv.ordersCount}x order • Diskon Rp {pv.discountGiven.toLocaleString('id-ID')}
                              </div>
                            </div>
                          </div>

                          {/* Progress bar kuota */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${pv.usageRate}%`,
                                  height: '100%',
                                  background: pv.usageRate >= 90 ? '#e85a4a' : 'var(--color-primary)',
                                  borderRadius: '2px',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                              {pv.current_uses}/{pv.max_uses} kuota ({pv.usageRate}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Distribusi Tipe Voucher & Smart Tips */}
              <div
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <BarChart3 size={18} style={{ color: '#4a9e6a' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Distribusi Tipe Diskon</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Tipe 1: Produk Gratis */}
                    <div style={{ padding: '8px 10px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#9333ea' }}>
                          <Gift size={13} /> Menu Hadiah Gratis ({analyticsData.byType.product.count} voucher)
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {analyticsData.byType.product.uses}x terpakai
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Omzet: Rp {analyticsData.byType.product.revenue.toLocaleString('id-ID')}</span>
                        <span>Diskon: Rp {analyticsData.byType.product.discount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Tipe 2: Persentase */}
                    <div style={{ padding: '8px 10px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#4a9e6a' }}>
                          <Percent size={13} /> Diskon Persentase ({analyticsData.byType.percentage.count} voucher)
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {analyticsData.byType.percentage.uses}x terpakai
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Omzet: Rp {analyticsData.byType.percentage.revenue.toLocaleString('id-ID')}</span>
                        <span>Diskon: Rp {analyticsData.byType.percentage.discount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Tipe 3: Nominal Tetap */}
                    <div style={{ padding: '8px 10px', background: 'var(--color-bg-secondary)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: 'var(--color-primary)' }}>
                          <Tag size={13} /> Potongan Nominal ({analyticsData.byType.fixed.count} voucher)
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {analyticsData.byType.fixed.uses}x terpakai
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Omzet: Rp {analyticsData.byType.fixed.revenue.toLocaleString('id-ID')}</span>
                        <span>Diskon: Rp {analyticsData.byType.fixed.discount.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Business Recommendation Box */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(201, 100, 39, 0.12), rgba(212, 160, 74, 0.12))',
                    border: '1px solid rgba(201, 100, 39, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: 'auto',
                  }}
                >
                  <Sparkles size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '2px' }}>
                      💡 Rekomendasi Strategis Promo:
                    </strong>
                    {analyticsData.byType.product.uses >= analyticsData.byType.percentage.uses ? (
                      <span>Voucher <strong>Menu Hadiah Gratis</strong> mendominasi antusiasme pembeli. Sebaiknya padukan dengan syarat <em>Min. Order</em> agar rata-rata omzet per transaksi terus meningkat.</span>
                    ) : (
                      <span>Voucher <strong>Diskon Persentase</strong> menghasilkan omzet paling kuat. Terapkan kuota bulanan agar margin keuntungan kafe tetap sehat.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vouchers Table */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>Memuat voucher...</div>
          ) : vouchers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Tag size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.5rem' }}>Belum ada voucher.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} />Buat Voucher</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Kode', 'Tipe & Diskon', 'Produk', 'Min. Order', 'Kuota', 'Status', 'Kadaluarsa', 'Aksi'].map(col => (
                    <th key={col} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '6px' }}>{v.code}</code>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                          background: v.discount_type === 'percentage' ? 'rgba(74,158,106,0.12)' : v.discount_type === 'fixed' ? 'rgba(201,100,39,0.12)' : 'rgba(147,51,234,0.12)',
                          color: v.discount_type === 'percentage' ? '#4a9e6a' : v.discount_type === 'fixed' ? 'var(--color-primary)' : '#9333ea',
                          textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {v.discount_type === 'percentage' ? '%' : v.discount_type === 'fixed' ? 'Rp' : 'Produk'}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-inter)' }}>
                          {v.discount_type === 'percentage' ? `${v.discount_value}%` : v.discount_type === 'fixed' ? `Rp ${v.discount_value.toLocaleString('id-ID')}` : `${v.discount_value}%`}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', maxWidth: '240px' }}>
                      {v.product_name ? (
                        (() => {
                          const pool = parseProductPool(v.product_name)
                          return pool.isPool ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                color: '#9333ea',
                                background: 'rgba(147, 51, 234, 0.12)',
                                border: '1px solid rgba(147, 51, 234, 0.28)',
                                borderRadius: '6px',
                                padding: '2px 7px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content',
                              }}>
                                🎲 Acak 1 dari {pool.count} Menu
                              </span>
                              <span style={{
                                fontSize: '0.74rem',
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '220px',
                              }} title={pool.items.join(', ')}>
                                {pool.items.join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span style={{
                              fontSize: '0.8rem',
                              color: '#9333ea',
                              background: 'rgba(147, 51, 234, 0.08)',
                              border: '1px solid rgba(147, 51, 234, 0.2)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <Coffee size={11} />{v.product_name}
                            </span>
                          )
                        })()
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Semua produk</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {v.min_order > 0 ? `Rp ${v.min_order.toLocaleString('id-ID')}` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>{v.current_uses}/{v.max_uses}</span>
                        <div style={{ width: '50px', height: '4px', background: 'var(--color-border)', borderRadius: '2px' }}>
                          <div style={{ width: `${Math.min((v.current_uses / v.max_uses) * 100, 100)}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <button onClick={() => toggleActive(v.id, v.is_active)}
                        style={{ background: v.is_active ? '#4a9e6a22' : '#e85a4a22', color: v.is_active ? '#4a9e6a' : '#e85a4a', border: `1px solid ${v.is_active ? '#4a9e6a44' : '#e85a4a44'}`, borderRadius: '50px', padding: '3px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-inter)', transition: 'all 0.2s' }}>
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {new Date(v.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEdit(v)} title="Edit" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setPaperModal(v)} title="QR & Share" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                          <QrCode size={13} />
                        </button>
                        {deleteConfirm === v.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleDelete(v.id)} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', background: '#e85a4a', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>Ya</button>
                            <button onClick={() => setDeleteConfirm(null)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#e85a4a'; e.currentTarget.style.color = '#e85a4a' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Paper Voucher Modal with QR & Share */}
      {paperModal && <PaperVoucherCard voucher={paperModal} onClose={() => setPaperModal(null)} />}
    </div>
  )
}
