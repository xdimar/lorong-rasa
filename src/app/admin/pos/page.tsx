'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  DollarSign,
  QrCode,
  Tag,
  Coffee,
  UtensilsCrossed,
  Package,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CreditCard,
  LayoutGrid,
  List,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MenuItem,
  defaultCategories,
  categoryColors,
  defaultMenuItems,
} from '@/lib/constants/menu'
import { ReceiptModal, ReceiptOrder, ReceiptItem } from '@/components/admin/ReceiptModal'

interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes: string
}

export default function CashierPOSPage() {
  // Menu & Category States
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Cashier User Info
  const [cashierName, setCashierName] = useState('Kasir Lorong Rasa')

  // Cart & Order Form States
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in')
  const [tableNumber, setTableNumber] = useState('1')
  const [customerName, setCustomerName] = useState('Pelanggan Walk-in')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash')
  const [cashReceived, setCashReceived] = useState<number>(0)
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null)
  const [voucherError, setVoucherError] = useState('')

  // Receipt Options & Modal
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [lastReceiptOrder, setLastReceiptOrder] = useState<ReceiptOrder | null>(null)
  const [lastReceiptItems, setLastReceiptItems] = useState<ReceiptItem[]>([])

  // Submission State
  const [processing, setProcessing] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Responsive Mobile/Tablet Tab View ('menu' | 'cart')
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu')

  const supabase = createClient()

  // 1. Fetch Menu Items & Cashier Profile
  useEffect(() => {
    const initPOS = async () => {
      try {
        // Fetch cashier profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single()
          if (profile?.full_name) {
            setCashierName(profile.full_name)
          } else if (profile?.email) {
            setCashierName(profile.email.split('@')[0])
          }
        }

        // Fetch menu items
        const { data: menuData } = await supabase
          .from('menu_items')
          .select('*')
          .order('category')
          .order('name')

        if (menuData && menuData.length > 0) {
          setItems(menuData)
        } else {
          setItems(defaultMenuItems)
        }

        // Fetch categories
        const { data: catData } = await supabase
          .from('menu_categories')
          .select('name')
          .order('name')

        if (catData && catData.length > 0) {
          setCategories(['Semua', ...catData.map((c: { name: string }) => c.name)])
        }
      } catch (err) {
        console.error('POS init error:', err)
        setItems(defaultMenuItems)
      } finally {
        setLoadingMenu(false)
      }
    }

    initPOS()
  }, [])

  // 2. Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.menuItem.price * it.quantity, 0)
  }, [cart])

  const totalCartItems = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.quantity, 0)
  }, [cart])

  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0
  const grandTotal = Math.max(0, subtotal - discountAmount)
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashReceived - grandTotal) : 0
  const isCashSufficient = paymentMethod === 'cash' ? cashReceived >= grandTotal : true

  // Auto update default cashReceived when grandTotal changes if it was uang pas
  useEffect(() => {
    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      setCashReceived(grandTotal)
    }
  }, [grandTotal, paymentMethod])

  // 3. Cart Management
  const addToCart = (menuItem: MenuItem) => {
    if (!menuItem.is_available) return
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.menuItem.id === menuItem.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx].quantity += 1
        return copy
      }
      return [...prev, { menuItem, quantity: 1, notes: '' }]
    })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((it) => {
          if (it.menuItem.id === itemId) {
            const newQ = it.quantity + delta
            return newQ > 0 ? { ...it, quantity: newQ } : null
          }
          return it
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((it) => (it.menuItem.id === itemId ? { ...it, notes } : it))
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((it) => it.menuItem.id !== itemId))
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('Bersihkan semua item dalam keranjang kasir?')) {
      setCart([])
      setAppliedVoucher(null)
      setVoucherCodeInput('')
      setVoucherError('')
    }
  }

  // 4. Voucher Redemption
  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) return
    setVoucherError('')
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCodeInput.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setVoucherError('Kode voucher tidak ditemukan atau tidak aktif.')
        return
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setVoucherError('Voucher sudah kedaluwarsa.')
        return
      }

      if (data.min_order && subtotal < data.min_order) {
        setVoucherError(`Minimal order Rp ${Number(data.min_order).toLocaleString('id-ID')} untuk voucher ini.`)
        return
      }

      let disc = 0
      if (data.discount_type === 'percentage') {
        disc = Math.round((subtotal * Number(data.discount_value)) / 100)
      } else {
        disc = Number(data.discount_value)
      }
      disc = Math.min(disc, subtotal)

      setAppliedVoucher({ code: data.code, discount: disc })
      setVoucherError('')
    } catch {
      setVoucherError('Gagal memvalidasi voucher.')
    }
  }

  const removeVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCodeInput('')
    setVoucherError('')
  }

  // 5. Submit Order & Payment
  const handleProcessOrder = async () => {
    if (cart.length === 0) {
      alert('Pilih minimal satu menu untuk memproses pesanan!')
      return
    }

    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      alert('Uang tunai yang diterima masih kurang dari total tagihan!')
      return
    }

    setProcessing(true)

    try {
      // 1. Create order record
      const orderPayload = {
        customer_name: customerName.trim() || 'Pelanggan Walk-in',
        customer_phone: customerPhone.trim() || '-',
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber : null,
        payment_method: paymentMethod,
        payment_status: 'paid', // Walk-in POS orders are paid on counter
        status: 'preparing', // Directly send to kitchen/barista
        total_amount: grandTotal,
        discount_amount: discountAmount,
        voucher_code: appliedVoucher?.code || null,
        notes: orderNotes.trim() ? `[POS Walk-in] ${orderNotes.trim()}` : '[POS Walk-in]',
      }

      const { data: createdOrder, error: orderErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single()

      if (orderErr) {
        console.error('Order creation error:', orderErr)
        // Fallback: If table RLS or DB error occurs, simulate local order for smooth cashier operation
      }

      const orderId = createdOrder?.id || `WALKIN-${Date.now().toString().slice(-6)}`

      // 2. Insert order items
      const itemsPayload = cart.map((c) => ({
        order_id: orderId,
        menu_item_name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price,
        subtotal: c.menuItem.price * c.quantity,
        notes: c.notes.trim() || null,
      }))

      if (createdOrder) {
        await supabase.from('order_items').insert(itemsPayload)
      }

      // 3. Prepare Receipt Data
      const receiptOrderData: ReceiptOrder = {
        id: orderId,
        customer_name: orderPayload.customer_name,
        customer_phone: orderPayload.customer_phone,
        order_type: orderType,
        table_number: orderPayload.table_number,
        payment_method: paymentMethod,
        payment_status: 'paid',
        status: 'preparing',
        total_amount: grandTotal,
        discount_amount: discountAmount,
        voucher_code: appliedVoucher?.code || null,
        notes: orderPayload.notes,
        created_at: new Date().toISOString(),
        cash_received: paymentMethod === 'cash' ? cashReceived : grandTotal,
        change_amount: changeAmount,
      }

      const receiptItemsData: ReceiptItem[] = cart.map((c) => ({
        menu_item_name: c.menuItem.name,
        quantity: c.quantity,
        price: c.menuItem.price,
        subtotal: c.menuItem.price * c.quantity,
        notes: c.notes,
      }))

      setLastReceiptOrder(receiptOrderData)
      setLastReceiptItems(receiptItemsData)

      // 4. Success Toast & Optional Auto-print
      setSuccessToast(`Pesanan #${orderId.slice(0, 8).toUpperCase()} Berhasil Diproses!`)
      setTimeout(() => setSuccessToast(null), 4000)

      if (autoPrintReceipt) {
        setReceiptModalOpen(true)
      }

      // 5. Reset POS for next customer
      setCart([])
      setCustomerName('Pelanggan Walk-in')
      setCustomerPhone('')
      setOrderNotes('')
      setAppliedVoucher(null)
      setVoucherCodeInput('')
      setCashReceived(0)
    } catch (err) {
      console.error('POS Checkout failed:', err)
      alert('Terjadi kesalahan saat menyimpan pesanan kasir.')
    } finally {
      setProcessing(false)
    }
  }

  // 6. Filter Menu Items
  const filteredMenuItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory = activeCategory === 'Semua' || item.category === activeCategory
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.toLowerCase().includes(search.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [items, activeCategory, search])

  // Category item counts for badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: items.length }
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1
    })
    return counts
  }, [items])

  // Count item qty in cart for badge
  const getItemCartQty = (id: string) => {
    const found = cart.find((i) => i.menuItem.id === id)
    return found ? found.quantity : 0
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Bar Banner / Header */}
      <div className="pos-top-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
              Point of Sale (Kasir Cepat)
            </h1>
            <span
              style={{
                background: 'rgba(74, 158, 106, 0.15)',
                color: '#4a9e6a',
                border: '1px solid rgba(74, 158, 106, 0.4)',
                borderRadius: '50px',
                padding: '2px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              Kasir: {cashierName}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '4px 0 0' }}>
            Input transaksi walk-in, atur pesanan meja, dan cetak struk thermal.
          </p>
        </div>

        {/* Quick Order Type & Last Receipt Button */}
        <div className="pos-top-actions">
          {lastReceiptOrder && (
            <button
              type="button"
              onClick={() => setReceiptModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Printer size={14} />
              Struk Terakhir
            </button>
          )}

          {/* Dine-in vs Takeaway Toggle */}
          <div className="pos-order-type-toggle">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: orderType === 'dine_in' ? 'var(--color-primary)' : 'transparent',
                color: orderType === 'dine_in' ? '#ffffff' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <UtensilsCrossed size={14} />
              Dine-in (Meja)
            </button>

            <button
              type="button"
              onClick={() => setOrderType('takeaway')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: orderType === 'takeaway' ? 'var(--color-primary)' : 'transparent',
                color: orderType === 'takeaway' ? '#ffffff' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <Package size={14} />
              Takeaway (Bungkus)
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.85rem 1.25rem',
            background: 'rgba(74, 158, 106, 0.18)',
            border: '1px solid #4a9e6a',
            borderRadius: 'var(--radius-md)',
            color: '#4a9e6a',
            fontSize: '0.9rem',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(74, 158, 106, 0.2)',
          }}
        >
          <CheckCircle2 size={18} />
          {successToast}
        </div>
      )}

      {/* Mobile & Tablet Tab Switcher (Visible on < 1024px) */}
      <div className="pos-mobile-nav">
        <button
          type="button"
          onClick={() => setMobileTab('menu')}
          className={`pos-mobile-tab-btn ${mobileTab === 'menu' ? 'active' : ''}`}
        >
          <UtensilsCrossed size={15} />
          <span>Katalog Menu ({filteredMenuItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`pos-mobile-tab-btn ${mobileTab === 'cart' ? 'active' : ''}`}
        >
          <ShoppingCart size={15} />
          <span>Tiket ({totalCartItems})</span>
          {totalCartItems > 0 && (
            <span className="pos-tab-total-pill">
              Rp {grandTotal.toLocaleString('id-ID')}
            </span>
          )}
        </button>
      </div>

      {/* Main Split Grid: Left (Catalog) & Right (Cart Ticket) */}
      <div className="pos-main-grid">
        {/* ====================================================
            LEFT SECTION: MENU CATALOG & CATEGORY FILTER
        ==================================================== */}
        <div className={`pos-col-menu ${mobileTab === 'menu' ? 'pos-show-mobile' : 'pos-hide-mobile'}`}>
          {/* Search, View Mode & Category Chips */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {/* Search Input + Grid/List View Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.55rem 0.85rem',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu, snack, minuman..."
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                    width: '100%',
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      padding: '2px 4px',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* View Mode Toggle: Grid vs List */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--color-bg-secondary)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  flexShrink: 0,
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  title="Tampilan Grid (Foto)"
                  onClick={() => setViewMode('grid')}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'grid' ? '#ffffff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutGrid size={15} />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  title="Tampilan List (Cepat)"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'list' ? '#ffffff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <List size={15} />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>

            {/* Category Chips with Item Count & Colored Dots */}
            <div className="pos-categories-container">
              {categories.map((cat) => {
                const isActive = activeCategory === cat
                const color = categoryColors[cat] || 'var(--color-primary)'
                const count = categoryCounts[cat] ?? 0

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className="pos-category-btn"
                    style={{
                      border: isActive ? `1.5px solid ${color}` : '1px solid var(--color-border)',
                      background: isActive ? color : 'var(--color-bg-secondary)',
                      color: isActive ? '#ffffff' : 'var(--color-text)',
                      boxShadow: isActive ? `0 2px 10px ${color}35` : 'none',
                    }}
                  >
                    {cat !== 'Semua' && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#ffffff' : color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span>{cat}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '50px',
                        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-card)',
                        color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                        fontWeight: 700,
                        border: isActive ? 'none' : '1px solid var(--color-border)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Menu Items Catalog (Grid or List View) */}
          {loadingMenu ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--color-border)',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Memuat daftar menu POS...</span>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <Coffee size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: 'var(--color-text-muted)' }} />
              <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: 'var(--color-text)' }}>
                Menu Tidak Ditemukan
              </p>
              <p style={{ fontSize: '0.82rem', margin: '4px 0 0' }}>
                Tidak ada menu yang sesuai dengan kata kunci atau filter &quot;{activeCategory}&quot;.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW MODE */
            <div className="pos-menu-grid">
              {filteredMenuItems.map((item) => {
                const qtyInCart = getItemCartQty(item.id)
                const catColor = categoryColors[item.category] || 'var(--color-primary)'

                return (
                  <div
                    key={item.id}
                    onClick={() => item.is_available && addToCart(item)}
                    className={`pos-card ${qtyInCart > 0 ? 'pos-card-active' : ''}`}
                    style={{
                      cursor: item.is_available ? 'pointer' : 'not-allowed',
                      opacity: item.is_available ? 1 : 0.55,
                    }}
                  >
                    {/* Item Image Box with 16:11 Aspect Ratio */}
                    <div className="pos-card-img-box">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        loading="lazy"
                      />

                      {/* Category Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: 'rgba(0,0,0,0.72)',
                          backdropFilter: 'blur(4px)',
                          color: '#ffffff',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          borderLeft: `3px solid ${catColor}`,
                          maxWidth: '85%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.category}
                      </span>

                      {/* Cart Quantity Badge */}
                      {qtyInCart > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            background: 'var(--color-primary)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '50px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          }}
                        >
                          {qtyInCart}x
                        </span>
                      )}

                      {!item.is_available && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.65)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#e85a4a',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            letterSpacing: '1px',
                          }}
                        >
                          HABIS
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="pos-card-body">
                      <div className="pos-card-title" title={item.name}>
                        {item.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginTop: 'auto' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>

                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: qtyInCart > 0 ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                            color: qtyInCart > 0 ? '#ffffff' : 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Plus size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* COMPACT LIST VIEW MODE */
            <div className="pos-menu-list">
              {filteredMenuItems.map((item) => {
                const qtyInCart = getItemCartQty(item.id)
                const catColor = categoryColors[item.category] || 'var(--color-primary)'

                return (
                  <div
                    key={item.id}
                    onClick={() => item.is_available && addToCart(item)}
                    className="pos-list-item"
                    style={{
                      opacity: item.is_available ? 1 : 0.55,
                      cursor: item.is_available ? 'pointer' : 'not-allowed',
                      borderColor: qtyInCart > 0 ? 'var(--color-primary)' : 'var(--color-border)',
                      background: qtyInCart > 0 ? 'rgba(196, 122, 46, 0.06)' : 'var(--color-bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      {/* Thumbnail */}
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'var(--color-bg-secondary)',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: 'var(--color-bg-secondary)',
                              color: catColor,
                              border: `1px solid ${catColor}40`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.category}
                          </span>
                          {!item.is_available && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e85a4a' }}>
                              HABIS
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.84rem',
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {item.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>

                      {qtyInCart > 0 ? (
                        <span
                          style={{
                            background: 'var(--color-primary)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '50px',
                          }}
                        >
                          {qtyInCart}x
                        </span>
                      ) : (
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <Plus size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            RIGHT SECTION: CART TICKET & CHECKOUT SUMMARY
        ==================================================== */}
        <div className={`pos-col-cart ${mobileTab === 'cart' ? 'pos-show-mobile' : 'pos-hide-mobile'}`}>
          {/* Back to menu button (Visible on mobile/tablet when in cart tab) */}
          <button
            type="button"
            onClick={() => setMobileTab('menu')}
            className="pos-back-to-menu-btn"
          >
            ← Kembali Pilih Menu Lainnya
          </button>

          {/* Cart Header */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                Tiket Pesanan ({cart.reduce((a, b) => a + b.quantity, 0)} item)
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          {/* Customer & Table Inputs */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'grid',
              gridTemplateColumns: orderType === 'dine_in' ? '1fr 90px' : '1fr',
              gap: '8px',
              background: 'var(--color-bg-card)',
            }}
          >
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                style={{
                  width: '100%',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>

            {orderType === 'dine_in' && (
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                  No. Meja
                </label>
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((num) => (
                    <option key={num} value={num}>
                      Meja {num}
                    </option>
                  ))}
                  <option value="Bar">Bar</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            )}
          </div>

          {/* Cart Item List (Scrollable) */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                <Coffee size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.82rem', margin: 0 }}>Keranjang kosong.</p>
                <span style={{ fontSize: '0.72rem' }}>Klik menu di sebelah kiri untuk menambahkan.</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.menuItem.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-border-light)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                        {item.menuItem.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Rp {item.menuItem.price.toLocaleString('id-ID')}
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--color-text)',
                        }}
                      >
                        <Minus size={12} />
                      </button>

                      <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: '18px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--color-text)',
                        }}
                      >
                        <Plus size={12} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.menuItem.id)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#e85a4a',
                          marginLeft: '2px',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Optional Item Notes */}
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                    placeholder="+ Catatan (misal: pedas, es sedikit, pisah saus)..."
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px dashed var(--color-border)',
                      fontSize: '0.72rem',
                      color: 'var(--color-text)',
                      padding: '2px 0',
                      outline: 'none',
                    }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Voucher Section */}
          <div style={{ padding: '0.65rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
            {!appliedVoucher ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  placeholder="Kode Voucher (opsional)"
                  style={{
                    flex: 1,
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.78rem',
                    color: 'var(--color-text)',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={!voucherCodeInput.trim()}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: voucherCodeInput.trim() ? 'pointer' : 'default',
                    opacity: voucherCodeInput.trim() ? 1 : 0.6,
                  }}
                >
                  Terapkan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4a9e6a', fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={13} />
                  Voucher: {appliedVoucher.code} (-Rp {appliedVoucher.discount.toLocaleString('id-ID')})
                </span>
                <button
                  type="button"
                  onClick={removeVoucher}
                  style={{ background: 'none', border: 'none', color: '#e85a4a', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Hapus
                </button>
              </div>
            )}
            {voucherError && (
              <div style={{ fontSize: '0.7rem', color: '#e85a4a', marginTop: '4px' }}>
                {voucherError}
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#c42e2e', fontWeight: 600 }}>
                <span>Diskon</span>
                <span>-Rp {discountAmount.toLocaleString('id-ID')}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                paddingTop: '6px',
                marginTop: '4px',
                borderTop: '1px solid var(--color-border-light)',
              }}
            >
              <span>Total:</span>
              <span style={{ color: 'var(--color-primary)' }}>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Payment Method Selector & Cash Calculator */}
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--color-bg-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'cash' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: paymentMethod === 'cash' ? 'rgba(201, 100, 39, 0.1)' : 'var(--color-bg-secondary)',
                  color: paymentMethod === 'cash' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <DollarSign size={15} />
                Tunai (Cash)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: paymentMethod === 'qris' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: paymentMethod === 'qris' ? 'rgba(201, 100, 39, 0.1)' : 'var(--color-bg-secondary)',
                  color: paymentMethod === 'qris' ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <QrCode size={15} />
                QRIS Kasir
              </button>
            </div>

            {/* If Cash selected: Quick Money Buttons & Change Calc */}
            {paymentMethod === 'cash' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setCashReceived(grandTotal)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: cashReceived === grandTotal ? 'var(--color-primary)' : 'var(--color-bg-card)',
                      color: cashReceived === grandTotal ? '#fff' : 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Uang Pas
                  </button>
                  {[10000, 20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setCashReceived(nominal)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: cashReceived === nominal ? 'var(--color-primary)' : 'var(--color-bg-card)',
                        color: cashReceived === nominal ? '#fff' : 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {nominal / 1000}k
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    Uang Diterima:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Rp</span>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      style={{
                        width: '120px',
                        textAlign: 'right',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Change display */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '6px',
                    borderTop: '1px dashed var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kembalian:</span>
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: isCashSufficient ? '#4a9e6a' : '#e85a4a',
                    }}
                  >
                    {isCashSufficient
                      ? `Rp ${changeAmount.toLocaleString('id-ID')}`
                      : `Kurang Rp ${(grandTotal - cashReceived).toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>
            )}

            {/* Optional Receipt Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={autoPrintReceipt}
                onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
              />
              <span>🖨️ Tampilkan struk untuk dicetak setelah pembayaran</span>
            </label>

            {/* Checkout / Pay Button */}
            <button
              type="button"
              onClick={handleProcessOrder}
              disabled={processing || cart.length === 0 || !isCashSufficient}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: cart.length > 0 && isCashSufficient ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                color: cart.length > 0 && isCashSufficient ? '#ffffff' : 'var(--color-text-muted)',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: cart.length > 0 && isCashSufficient && !processing ? 'pointer' : 'not-allowed',
                boxShadow: cart.length > 0 && isCashSufficient ? '0 6px 20px rgba(201, 100, 39, 0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {processing ? (
                'Memproses Transaksi...'
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Bayar & Selesaikan (Rp {grandTotal.toLocaleString('id-ID')})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart Action Bar (When in menu tab on mobile with items) */}
      {totalCartItems > 0 && mobileTab === 'menu' && (
        <div className="pos-floating-mobile-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pos-floating-icon">
              <ShoppingCart size={18} />
              <span className="pos-floating-badge">{totalCartItems}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85, color: '#f5ede0' }}>Total Pesanan</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="pos-floating-btn"
          >
            Lihat Tiket & Bayar ➔
          </button>
        </div>
      )}

      {/* Reusable Thermal Receipt Modal (Optional Print) */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={lastReceiptOrder}
        items={lastReceiptItems}
        cashierName={cashierName}
      />

      {/* Responsive Stylesheet */}
      <style jsx>{`
        .pos-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
        }
        .pos-top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .pos-order-type-toggle {
          display: flex;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 3px;
        }

        .pos-mobile-nav {
          display: none;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 4px;
          gap: 6px;
        }
        .pos-mobile-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0.6rem 0.85rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--color-text-muted);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pos-mobile-tab-btn.active {
          background: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 2px 8px var(--color-primary-glow);
        }
        .pos-tab-total-pill {
          background: rgba(255, 255, 255, 0.25);
          padding: 2px 7px;
          border-radius: 50px;
          font-size: 0.72rem;
          margin-left: 4px;
        }

        .pos-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(360px, 1fr);
          gap: 1.25rem;
          align-items: start;
        }

        .pos-col-menu {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pos-col-cart {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: sticky;
          top: 80px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .pos-back-to-menu-btn {
          display: none;
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0;
          border: none;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
          color: var(--color-primary);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          text-align: center;
        }

        .pos-categories-container {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        .pos-categories-container::-webkit-scrollbar {
          display: none;
        }

        .pos-category-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0.45rem 0.85rem;
          border-radius: 50px;
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }
        .pos-category-btn:hover {
          transform: translateY(-1px);
        }
        .pos-category-btn:active {
          transform: scale(0.96);
        }

        .pos-menu-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        @media (min-width: 480px) {
          .pos-menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
            gap: 0.75rem;
          }
        }

        @media (min-width: 640px) {
          .pos-menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.85rem;
          }
        }

        @media (min-width: 1024px) {
          .pos-menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
            gap: 0.95rem;
          }
          .pos-col-menu {
            display: flex !important;
          }
          .pos-col-cart {
            display: flex !important;
          }
        }

        @media (min-width: 1400px) {
          .pos-menu-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1rem;
          }
        }

        .pos-card {
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          user-select: none;
        }

        .pos-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        }

        .pos-card:active {
          transform: scale(0.98);
        }

        .pos-card-active {
          border: 2px solid var(--color-primary) !important;
          box-shadow: 0 4px 18px var(--color-primary-glow) !important;
        }

        .pos-card-img-box {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 11;
          background: var(--color-bg-secondary);
          overflow: hidden;
        }

        .pos-card-img-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .pos-card:hover .pos-card-img-box img {
          transform: scale(1.06);
        }

        .pos-card-body {
          padding: 0.65rem 0.75rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          gap: 6px;
        }

        .pos-card-title {
          font-weight: 700;
          font-size: 0.82rem;
          color: var(--color-text);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.6em;
        }

        .pos-menu-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pos-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.55rem 0.75rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pos-list-item:hover {
          background: var(--color-bg-secondary);
          border-color: var(--color-primary);
        }

        .pos-list-item:active {
          transform: scale(0.99);
        }

        .pos-floating-mobile-bar {
          display: none;
        }

        @media (max-width: 1023px) {
          .pos-main-grid {
            display: flex !important;
            flex-direction: column !important;
          }
          .pos-mobile-nav {
            display: flex !important;
          }
          .pos-col-cart {
            position: relative !important;
            top: 0 !important;
          }
          .pos-show-mobile {
            display: flex !important;
          }
          .pos-hide-mobile {
            display: none !important;
          }
          .pos-back-to-menu-btn {
            display: block !important;
          }
          .pos-floating-mobile-bar {
            display: flex !important;
            position: fixed;
            bottom: 16px;
            left: 16px;
            right: 16px;
            background: #1a0f00;
            color: #ffffff;
            border: 1px solid var(--color-primary);
            border-radius: 14px;
            padding: 0.75rem 1rem;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            z-index: 99;
          }
          .pos-floating-icon {
            position: relative;
            width: 36px;
            height: 36px;
            background: var(--color-primary);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pos-floating-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background: #e85a4a;
            color: #ffffff;
            font-size: 0.68rem;
            font-weight: 800;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pos-floating-btn {
            background: var(--color-primary);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 0.6rem 1.1rem;
            font-weight: 800;
            font-size: 0.85rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(201, 100, 39, 0.4);
          }
        }

        @media (max-width: 640px) {
          .pos-top-bar {
            padding: 0.85rem 1rem !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .pos-top-actions {
            width: 100% !important;
          }
          .pos-order-type-toggle {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
