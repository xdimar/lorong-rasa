'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
  category: string
  notes?: string
}

interface AppliedVoucher {
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateNotes: (id: string, notes: string) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
  discount: number
  total: number
  voucher: AppliedVoucher | null
  applyVoucher: (voucher: AppliedVoucher) => boolean
  removeVoucher: () => void
  isCartOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

const CartContext = createContext<CartContextType | null>(null)

const CART_STORAGE_KEY = 'lorong-rasa-cart'
const VOUCHER_STORAGE_KEY = 'lorong-rasa-voucher'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [voucher, setVoucher] = useState<AppliedVoucher | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      if (savedCart) setItems(JSON.parse(savedCart))
      const savedVoucher = localStorage.getItem(VOUCHER_STORAGE_KEY)
      if (savedVoucher) setVoucher(JSON.parse(savedVoucher))
    } catch {
      // Invalid data, ignore
    }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items, mounted])

  useEffect(() => {
    if (!mounted) return
    if (voucher) {
      localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(voucher))
    } else {
      localStorage.removeItem(VOUCHER_STORAGE_KEY)
    }
  }, [voucher, mounted])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { ...item, quantity }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id))
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i))
    }
  }, [])

  const updateNotes = useCallback((id: string, notes: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, notes } : i))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setVoucher(null)
  }, [])

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])

  const discount = useMemo(() => {
    if (!voucher) return 0
    if (subtotal < voucher.min_order) return 0
    let val = 0
    if (voucher.discount_type === 'percentage') {
      val = Math.round(subtotal * voucher.discount_value / 100)
    } else {
      val = voucher.discount_value
    }
    return Math.min(val, subtotal)
  }, [voucher, subtotal])

  const total = Math.max(0, subtotal - discount)

  const applyVoucher = useCallback((v: AppliedVoucher): boolean => {
    const currentSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    if (currentSubtotal < v.min_order) return false
    setVoucher(v)
    return true
  }, [items])

  const removeVoucher = useCallback(() => setVoucher(null), [])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), [])

  const contextValue = useMemo(() => ({
    items, addItem, removeItem, updateQuantity, updateNotes, clearCart,
    totalItems, subtotal, discount, total,
    voucher, applyVoucher, removeVoucher,
    isCartOpen, openCart, closeCart, toggleCart,
  }), [
    items, addItem, removeItem, updateQuantity, updateNotes, clearCart,
    totalItems, subtotal, discount, total,
    voucher, applyVoucher, removeVoucher,
    isCartOpen, openCart, closeCart, toggleCart,
  ])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
