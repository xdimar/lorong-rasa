'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Mail, Calendar, Edit2, Check, X, Tag, Shield, Coffee, QrCode, Sparkles,
  ShoppingBag, Clock, ChevronRight, Loader2, AlertCircle, CheckCircle2,
  Gift, Award, Coins, History, Percent, Star, Crown, ArrowRight, Copy,
  UtensilsCrossed, Package
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { LiveOrderTracker, ORDER_STATUS_CONFIG } from '@/components/orders/LiveOrderTracker'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import {
  getLoyaltyTier,
  getTierProgress,
  DEFAULT_LOYALTY_REWARDS,
  redeemLoyaltyReward,
  type LoyaltyReward,
  type LoyaltyTransaction,
} from '@/lib/loyalty'
import { getOrDrawAwardedProduct } from '@/lib/voucher-draw'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  loyalty_points?: number
}

interface Voucher {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed' | 'product'
  discount_value: number
  expires_at: string
  min_order: number
  product_name?: string | null
  share_token?: string | null
}

interface UserVoucher {
  id: string
  user_id: string
  voucher_id: string
  voucher_code: string
  status: 'claimed' | 'used'
  claimed_at: string
  used_at: string | null
  used_via: string | null
  vouchers?: Voucher
}

interface UserOrder {
  id: string
  created_at: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  order_type: 'dine_in' | 'takeaway'
  table_number: string | null
  payment_method: 'qris' | 'cash'
  payment_status: 'unpaid' | 'paid'
  total_amount: number
  discount_amount: number
  voucher_code: string | null
}

const fallbackVouchers: Voucher[] = [
  {
    id: '1',
    code: 'LORONG10',
    description: 'Diskon 10% untuk semua menu racikan Lorong Rasa!',
    discount_type: 'percentage',
    discount_value: 10,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    min_order: 30000,
  },
  {
    id: '2',
    code: 'WEEKEND20',
    description: 'Spesial weekend! Hemat 20rb untuk order di atas 75rb.',
    discount_type: 'fixed',
    discount_value: 20000,
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    min_order: 75000,
  },
  {
    id: '3',
    code: 'NEWMEMBER',
    description: 'Member baru? Nikmati diskon Rp 15.000 untuk pembelian pertama.',
    discount_type: 'fixed',
    discount_value: 15000,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    min_order: 50000,
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([])
  const [promoInput, setPromoInput] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [offlineQrModal, setOfflineQrModal] = useState<UserVoucher | null>(null)
  const [userOrders, setUserOrders] = useState<UserOrder[]>([])
  const [activeTab, setActiveTab] = useState<'vouchers' | 'rewards' | 'points_history' | 'orders'>('vouchers')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedVoucherQr, setSelectedVoucherQr] = useState<Voucher | null>(null)
  const [showMemberCardQr, setShowMemberCardQr] = useState(false)

  // Loyalty Points States
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyReward[]>(DEFAULT_LOYALTY_REWARDS)
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([])
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState<LoyaltyReward | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState<{
    voucherCode: string
    title: string
    remainingPoints: number
  } | null>(null)

  const { applyVoucher, items } = useCart()
  const { showToast } = useToast()

  const handleUseVoucherOnline = (uv: UserVoucher) => {
    const v = uv.vouchers
    if (!v) return

    applyVoucher(
      {
        code: v.code,
        discount_type: v.discount_type,
        discount_value: v.discount_value,
        min_order: v.min_order,
        product_name: v.product_name,
      },
      true
    )

    try {
      localStorage.setItem('lorong_applied_voucher_code', v.code)
    } catch {}

    showToast(`Voucher ${v.code} terpasang! Mengalihkan ke menu...`, 'success')

    if (items.length > 0) {
      router.push('/checkout')
    } else {
      router.push('/menu')
    }
  }

  const supabase = createClient()

  const fetchUserVouchers = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_vouchers')
        .select('*, vouchers(*)')
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false })
      if (data) setUserVouchers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchLoyaltyData = async (userId: string) => {
    try {
      // 1. Fetch rewards catalog
      const { data: rewardsData } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true })

      if (rewardsData && rewardsData.length > 0) {
        setLoyaltyRewards(rewardsData)
      } else {
        setLoyaltyRewards(DEFAULT_LOYALTY_REWARDS)
      }

      // 2. Fetch user's loyalty transactions
      const { data: txData } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (txData) {
        setLoyaltyTransactions(txData)
      }
    } catch (err) {
      console.error('Error fetching loyalty data:', err)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (data) {
          setProfile(data)
          setNewName(data.full_name || '')
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const claimParam = params.get('claim')
            if (claimParam) {
              const code = claimParam.trim().toUpperCase()
              setPromoInput(code)
              setActiveTab('vouchers')
              performVoucherClaim(code, data.id)
            }
          }
        } else {
          const fallbackProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            role: 'customer',
            created_at: user.created_at || new Date().toISOString(),
            loyalty_points: 0,
          }
          await supabase.from('profiles').insert(fallbackProfile)
          setProfile(fallbackProfile)
          setNewName(fallbackProfile.full_name)
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const claimParam = params.get('claim')
            if (claimParam) {
              const code = claimParam.trim().toUpperCase()
              setPromoInput(code)
              setActiveTab('vouchers')
              performVoucherClaim(code, user.id)
            }
          }
        }

        // Fetch user's claimed vouchers (1 user 1 voucher)
        fetchUserVouchers(user.id)

        // Fetch loyalty data & rewards
        fetchLoyaltyData(user.id)

        // Fetch user's orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (ordersData) {
          setUserOrders(ordersData)
        }

        // Real-time subscription to user's orders
        ordersChannel = supabase
          .channel(`profile-orders-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `user_id=eq.${user.id}`,
            },
            (payload: { eventType: string; new: UserOrder }) => {
              if (payload.eventType === 'UPDATE') {
                setUserOrders((prev) =>
                  prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
                )
              } else if (payload.eventType === 'INSERT') {
                setUserOrders((prev) => [payload.new, ...prev])
              }
            }
          )
          .subscribe()
      } catch {
        // Continue
      } finally {
        setLoading(false)
      }
    }

    let ordersChannel: ReturnType<typeof supabase.channel> | null = null
    fetchProfile()

    return () => {
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel)
      }
    }
  }, [])

  const performVoucherClaim = async (code: string, userId: string) => {
    if (!code || !userId) return
    setClaimLoading(true)
    setClaimMessage(null)

    try {
      const cleanCode = code.trim().toUpperCase()

      // 1. Check voucher in vouchers table (ilike code, share_token fallback, and fuzzy)
      let { data: voucher } = await supabase
        .from('vouchers')
        .select('*')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle()

      if (!voucher) {
        const { data: byToken } = await supabase
          .from('vouchers')
          .select('*')
          .eq('share_token', code.trim())
          .eq('is_active', true)
          .maybeSingle()
        voucher = byToken
      }

      if (!voucher) {
        const { data: fuzzyList } = await supabase
          .from('vouchers')
          .select('*')
          .ilike('code', `%${cleanCode}%`)
          .eq('is_active', true)

        if (fuzzyList && fuzzyList.length > 0) {
          voucher = fuzzyList.find((v: Voucher) => (v.code || '').trim().toUpperCase() === cleanCode) || fuzzyList[0]
        }
      }

      if (!voucher) {
        setClaimMessage({ type: 'error', text: 'Kode promo tidak ditemukan atau sudah tidak aktif.' })
        setClaimLoading(false)
        return
      }

      if (new Date(voucher.expires_at) < new Date()) {
        setClaimMessage({ type: 'error', text: 'Kode promo ini sudah melewati masa berlaku.' })
        setClaimLoading(false)
        return
      }

      if (voucher.max_uses && voucher.current_uses >= voucher.max_uses) {
        setClaimMessage({ type: 'error', text: 'Kuota pemakaian kode promo ini sudah habis.' })
        setClaimLoading(false)
        return
      }

      // 2. Check if already claimed by this user (1 user 1 voucher)
      const { data: existing } = await supabase
        .from('user_vouchers')
        .select('id, status')
        .eq('user_id', userId)
        .or(`voucher_id.eq.${voucher.id},voucher_code.ilike.${voucher.code}`)
        .maybeSingle()

      if (existing) {
        setClaimMessage({
          type: existing.status === 'used' ? 'error' : 'success',
          text: existing.status === 'used'
            ? 'Voucher ini sudah pernah kamu gunakan sebelumnya (Maksimal 1 voucher per akun).'
            : 'Voucher ini sudah ada di dompet akunmu dan siap digunakan!',
        })
        setClaimLoading(false)
        return
      }

      // 3. Claim the voucher
      const { data: newClaim, error: claimErr } = await supabase
        .from('user_vouchers')
        .insert({
          user_id: userId,
          voucher_id: voucher.id,
          voucher_code: voucher.code,
          status: 'claimed',
        })
        .select('*, vouchers(*)')
        .single()

      if (claimErr) {
        setClaimMessage({ type: 'error', text: 'Gagal mengklaim voucher. Coba lagi.' })
        setClaimLoading(false)
        return
      }

      setClaimMessage({ type: 'success', text: `🎉 Selamat! Voucher ${voucher.code} berhasil ditambahkan ke akun Anda.` })
      setPromoInput('')
      fetchUserVouchers(userId)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/profile')
      }
    } catch {
      setClaimMessage({ type: 'error', text: 'Terjadi kendala jaringan saat mengklaim voucher.' })
    } finally {
      setClaimLoading(false)
    }
  }

  const handleClaimVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    if (!code || !profile) return
    await performVoucherClaim(code, profile.id)
  }

  const saveName = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: newName }).eq('id', profile.id)
    setProfile({ ...profile, full_name: newName })
    setEditingName(false)
    setSaving(false)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const handleConfirmRedeem = async () => {
    if (!profile || !selectedRewardToRedeem) return
    setRedeeming(true)
    try {
      const res = await redeemLoyaltyReward(supabase, profile.id, selectedRewardToRedeem)
      if (!res.success || !res.voucherCode) {
        alert(res.error || 'Gagal menukarkan poin.')
        return
      }

      const remaining = res.newPoints ?? Math.max(0, (profile.loyalty_points || 0) - selectedRewardToRedeem.points_required)
      setProfile(prev => prev ? { ...prev, loyalty_points: remaining } : null)

      setRedeemSuccess({
        voucherCode: res.voucherCode,
        title: selectedRewardToRedeem.title,
        remainingPoints: remaining,
      })
      setSelectedRewardToRedeem(null)
      fetchUserVouchers(profile.id)
      fetchLoyaltyData(profile.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat menukarkan poin.'
      alert(msg)
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
            <Coffee size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
            Memuat profil...
          </div>
        </div>
        <Footer />
      </>
    )
  }

  if (!profile) return null

  const activeOrder = userOrders.find((o) =>
    ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
  )
  const pastOrders = userOrders.filter((o) => o.id !== activeOrder?.id)

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '80px' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%)',
          borderBottom: '1px solid var(--color-border)',
          padding: '4rem 0 3rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 30% 60%, var(--color-primary-glow) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div className="container-custom" style={{ position: 'relative' }}>
            <AnimateOnScroll animation="fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Avatar */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontFamily: 'var(--font-playfair)',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 8px 30px var(--color-primary-glow)',
                  flexShrink: 0,
                  border: '3px solid var(--color-border)',
                }}>
                  {(profile.full_name || profile.email || 'U')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name with edit */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {editingName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          style={{
                            fontSize: '1.5rem',
                            fontFamily: 'var(--font-playfair)',
                            fontWeight: 700,
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '8px',
                            padding: '4px 12px',
                            color: 'var(--color-text)',
                            outline: 'none',
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                          autoFocus
                        />
                        <button onClick={saveName} disabled={saving} style={{ background: '#4a9e6a', color: 'white', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingName(false)} style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', lineHeight: 1 }}>
                          {profile.full_name || 'Pengguna Lorong Rasa'}
                        </h1>
                        <button
                          onClick={() => setEditingName(true)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                        >
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      <Mail size={14} />
                      {profile.email}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      <Calendar size={14} />
                      Bergabung {new Date(profile.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-inter)',
                      background: profile.role === 'admin' ? 'var(--color-primary-glow)' : 'var(--color-bg-card)',
                      color: profile.role === 'admin' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      border: `1px solid ${profile.role === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: '50px',
                      padding: '3px 12px',
                    }}>
                      {profile.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                      {profile.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        <div className="container-custom" style={{ padding: 'clamp(1.5rem, 4vw, 3rem) 1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2rem' }}>

            {/* Left: Account Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <AnimateOnScroll animation="fade-left">
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
                    gap: '10px',
                  }}>
                    <User size={18} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: '1rem', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Informasi Akun</h2>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {[
                      { label: 'Nama Lengkap', value: profile.full_name || '—' },
                      { label: 'Email', value: profile.email },
                      { label: 'Peran', value: profile.role === 'admin' ? 'Administrator' : 'Member' },
                      { label: 'Tanggal Daftar', value: new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimateOnScroll>

              {/* Digital Loyalty Member Card */}
              {(() => {
                const userPoints = profile.loyalty_points || 0
                const tierInfo = getLoyaltyTier(userPoints)
                const progression = getTierProgress(userPoints)

                return (
                  <AnimateOnScroll animation="fade-left" delay={100}>
                    <div style={{
                      background: tierInfo.name === 'Gold'
                        ? 'linear-gradient(145deg, #1c1305 0%, #2e1c07 60%, #150e04 100%)'
                        : tierInfo.name === 'Silver'
                          ? 'linear-gradient(145deg, #181d24 0%, #252d38 60%, #11151a 100%)'
                          : 'linear-gradient(145deg, #26170d 0%, #3a1e0b 60%, #1a0e05 100%)',
                      border: `1px solid ${tierInfo.borderGlow}`,
                      borderRadius: 'var(--radius-xl)',
                      padding: '1.5rem',
                      boxShadow: `0 15px 35px rgba(0,0,0,0.4), 0 0 25px ${tierInfo.bgGlow}`,
                      position: 'relative',
                      overflow: 'hidden',
                      color: 'white',
                    }}>
                      {/* Ambient light ornament */}
                      <div style={{
                        position: 'absolute',
                        top: '-30px',
                        right: '-30px',
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: tierInfo.color,
                        filter: 'blur(40px)',
                        opacity: 0.25,
                        pointerEvents: 'none',
                      }} />

                      {/* Header Card */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(8px)',
                            border: `1px solid ${tierInfo.borderGlow}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Coffee size={18} style={{ color: tierInfo.color }} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Lorong Rasa Club</span>
                              <span style={{
                                fontSize: '0.58rem',
                                background: 'rgba(212, 175, 55, 0.22)',
                                border: '1px solid rgba(212, 175, 55, 0.45)',
                                color: 'var(--color-gold)',
                                borderRadius: '20px',
                                padding: '1px 6px',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}>
                                Coming Soon
                              </span>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, color: 'white' }}>Digital Member</div>
                          </div>
                        </div>

                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: tierInfo.bgGlow,
                          border: `1px solid ${tierInfo.borderGlow}`,
                          color: tierInfo.color,
                          borderRadius: '50px',
                          padding: '3px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          {tierInfo.name === 'Gold' ? <Crown size={12} /> : <Star size={12} />}
                          {tierInfo.title}
                        </div>
                      </div>

                      {/* Points Balance Banner */}
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '14px',
                        padding: '1rem',
                        marginBottom: '1rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Saldo Poin Rasa</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-playfair)', color: 'white', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Sparkles size={20} style={{ color: 'var(--color-gold)' }} />
                              {userPoints.toLocaleString('id-ID')}
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-gold)', fontFamily: 'var(--font-inter)' }}>Poin</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setActiveTab('rewards')}
                            style={{
                              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 4px 12px var(--color-primary-glow)',
                            }}
                          >
                            <Gift size={13} /> Hadiah (Soon)
                          </button>
                        </div>

                        {/* Progress Bar to next tier */}
                        {progression.nextTier ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>
                              <span>Menuju {progression.nextTier.name}</span>
                              <span>{progression.pointsNeeded} Poin lagi</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${progression.progressPercent}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, ${tierInfo.color}, var(--color-gold))`,
                                borderRadius: '10px',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Crown size={12} /> Tingkat VIP Maksimal telah tercapai!
                          </div>
                        )}
                      </div>

                      {/* Action QR */}
                      <button
                        onClick={() => setShowMemberCardQr(true)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '9px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-inter)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      >
                        <QrCode size={15} />
                        Buka Kartu & QR Kasir
                      </button>
                    </div>
                  </AnimateOnScroll>
                )
              })()}
            </div>

            {/* Right: Available Vouchers & My Orders Tabs */}
            <div>
              {/* Active Order Teaser Banner (when user is on other tabs) */}
              {activeOrder && activeTab !== 'orders' && (
                <div
                  onClick={() => setActiveTab('orders')}
                  style={{
                    background: 'linear-gradient(135deg, rgba(232, 151, 58, 0.15), rgba(212, 160, 74, 0.08))',
                    border: '1.5px solid var(--color-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px var(--color-primary-glow)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        boxShadow: '0 0 10px var(--color-primary)',
                        display: 'inline-block',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        Pesanan #{activeOrder.id.slice(0, 8).toUpperCase()} Sedang Diproses!
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                        Status: {ORDER_STATUS_CONFIG[activeOrder.status]?.title || activeOrder.status} • Klik untuk pantau live
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Pantau <ChevronRight size={15} />
                  </span>
                </div>
              )}

              <AnimateOnScroll animation="fade-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', overflowX: 'auto', padding: '0 2px 0.75rem' }}>
                  <button
                    onClick={() => setActiveTab('vouchers')}
                    style={{
                      background: activeTab === 'vouchers' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: activeTab === 'vouchers' ? 'white' : 'var(--color-text-secondary)',
                      border: `1px solid ${activeTab === 'vouchers' ? 'transparent' : 'var(--color-border)'}`,
                      borderRadius: '50px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Tag size={15} />
                    Voucher Saya ({userVouchers.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('rewards')}
                    style={{
                      background: activeTab === 'rewards' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: activeTab === 'rewards' ? 'white' : 'var(--color-text-secondary)',
                      border: `1px solid ${activeTab === 'rewards' ? 'transparent' : 'var(--color-border)'}`,
                      borderRadius: '50px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Gift size={15} />
                    <span>Tukar Poin</span>
                    <span style={{
                      fontSize: '0.62rem',
                      background: activeTab === 'rewards' ? 'rgba(255,255,255,0.25)' : 'rgba(212, 175, 55, 0.2)',
                      color: activeTab === 'rewards' ? '#ffffff' : 'var(--color-gold)',
                      border: `1px solid ${activeTab === 'rewards' ? 'rgba(255,255,255,0.3)' : 'rgba(212, 175, 55, 0.4)'}`,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Soon
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('points_history')}
                    style={{
                      background: activeTab === 'points_history' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: activeTab === 'points_history' ? 'white' : 'var(--color-text-secondary)',
                      border: `1px solid ${activeTab === 'points_history' ? 'transparent' : 'var(--color-border)'}`,
                      borderRadius: '50px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <History size={15} />
                    <span>Riwayat Poin</span>
                    <span style={{
                      fontSize: '0.62rem',
                      background: activeTab === 'points_history' ? 'rgba(255,255,255,0.25)' : 'rgba(212, 175, 55, 0.2)',
                      color: activeTab === 'points_history' ? '#ffffff' : 'var(--color-gold)',
                      border: `1px solid ${activeTab === 'points_history' ? 'rgba(255,255,255,0.3)' : 'rgba(212, 175, 55, 0.4)'}`,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Soon
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('orders')}
                    style={{
                      background: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: activeTab === 'orders' ? 'white' : 'var(--color-text-secondary)',
                      border: `1px solid ${activeTab === 'orders' ? 'transparent' : 'var(--color-border)'}`,
                      borderRadius: '50px',
                      padding: '6px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <ShoppingBag size={15} />
                    <span>Pesanan Saya ({userOrders.length})</span>
                    {activeOrder && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: activeTab === 'orders' ? '#ffffff' : 'var(--color-primary)',
                          boxShadow: '0 0 8px var(--color-primary)',
                          display: 'inline-block',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    )}
                  </button>
                </div>
              </AnimateOnScroll>

              {activeTab === 'vouchers' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Klaim Voucher Promo Box */}
                  <AnimateOnScroll animation="fade-up">
                    <div style={{
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{ height: '3px', width: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-gold))', position: 'absolute', top: 0, left: 0 }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.6rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', margin: 0 }}>Klaim Kode Promo / Voucher</h3>
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', margin: 0 }}>
                            Punya kode voucher rahasia? Masukkan di sini (dibatasi 1 klaim per akun).
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleClaimVoucher} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={promoInput}
                          onChange={e => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Contoh: WELCOME10"
                          disabled={claimLoading}
                          style={{
                            flex: '1 1 200px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text)',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontSize: '0.95rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="submit"
                          disabled={claimLoading || !promoInput.trim()}
                          className="btn-primary"
                          style={{
                            padding: '10px 18px',
                            fontSize: '0.85rem',
                            opacity: (claimLoading || !promoInput.trim()) ? 0.6 : 1,
                            cursor: (claimLoading || !promoInput.trim()) ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {claimLoading ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
                          {claimLoading ? 'Memeriksa...' : 'Klaim Voucher'}
                        </button>
                      </form>

                      {claimMessage && (
                        <div style={{
                          marginTop: '0.85rem',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'var(--font-inter)',
                          background: claimMessage.type === 'success' ? 'rgba(74, 158, 106, 0.12)' : 'rgba(232, 90, 74, 0.12)',
                          color: claimMessage.type === 'success' ? '#4a9e6a' : '#e85a4a',
                          border: `1px solid ${claimMessage.type === 'success' ? 'rgba(74, 158, 106, 0.3)' : 'rgba(232, 90, 74, 0.3)'}`,
                        }}>
                          {claimMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>{claimMessage.text}</span>
                        </div>
                      )}
                    </div>
                  </AnimateOnScroll>

                  {/* Voucher List Title */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', margin: 0 }}>
                      Voucher Tersimpan di Akun ({userVouchers.length})
                    </h4>
                  </div>

                  {/* User Claimed Vouchers */}
                  {userVouchers.length === 0 ? (
                    <AnimateOnScroll animation="fade-up">
                      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
                        <Tag size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '0.5rem' }}>
                          Belum ada voucher yang kamu klaim.
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                          Masukkan kode voucher yang kamu dapatkan pada formulir klaim di atas.
                        </p>
                      </div>
                    </AnimateOnScroll>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {userVouchers.map((uv, idx) => {
                        const v = uv.vouchers
                        const isUsed = uv.status === 'used'
                        return (
                          <AnimateOnScroll key={uv.id} animation="fade-right" delay={idx * 60}>
                            <div style={{
                              background: 'var(--color-bg-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-lg)',
                              overflow: 'hidden',
                              opacity: isUsed ? 0.65 : 1,
                              transition: 'all 0.3s ease',
                            }}>
                              <div style={{
                                height: '4px',
                                background: isUsed
                                  ? '#888'
                                  : 'linear-gradient(90deg, var(--color-primary), var(--color-gold))',
                              }} />
                              <div style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                  {(() => {
                                    const awardedItem = v?.discount_type === 'product' ? getOrDrawAwardedProduct(uv.voucher_code, v?.product_name) : null
                                    return (
                                      <div>
                                        <div style={{
                                          background: isUsed
                                            ? '#666'
                                            : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                          color: 'white',
                                          borderRadius: '10px',
                                          padding: '6px 14px',
                                          fontSize: '1rem',
                                          fontWeight: 700,
                                          fontFamily: 'var(--font-playfair)',
                                        }}>
                                          {v ? (v.discount_type === 'percentage' ? `${v.discount_value}% OFF` : v.discount_type === 'product' ? (v.discount_value === 100 ? 'GRATIS 1 MENU' : `DISKON ${v.discount_value}%`) : `Rp ${v.discount_value.toLocaleString('id-ID')}`) : uv.voucher_code}
                                        </div>
                                        {awardedItem && (
                                          <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 700, marginTop: '4px' }}>
                                            🎁 Menu Hadiah: {awardedItem}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                  
                                  {isUsed ? (
                                    <span style={{ fontSize: '0.75rem', color: '#888', background: 'var(--color-bg-secondary)', padding: '4px 10px', borderRadius: '50px', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
                                      Sudah Digunakan {uv.used_via === 'offline_cashier' ? '(Kasir)' : '(Online)'}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#4a9e6a', background: 'rgba(74, 158, 106, 0.15)', padding: '4px 10px', borderRadius: '50px', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
                                      Siap Digunakan
                                    </span>
                                  )}
                                </div>

                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                                  {v?.description || `Voucher diskon spesial untuk kode ${uv.voucher_code}`}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1rem' }}>
                                  {v?.min_order ? `Min. belanja Rp ${v.min_order.toLocaleString('id-ID')}` : 'Tanpa minimal belanja'}
                                </p>

                                {/* Voucher Action Card */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                  background: 'var(--color-bg-secondary)',
                                  border: '1px dashed var(--color-border)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '0.75rem 1rem',
                                  flexWrap: 'wrap',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: isUsed ? 'var(--color-text-muted)' : 'var(--color-text)', letterSpacing: '0.1em' }}>
                                      {uv.voucher_code}
                                    </span>
                                    <button
                                      onClick={() => copyCode(uv.voucher_code)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: copiedCode === uv.voucher_code ? '#4a9e6a' : 'var(--color-text-muted)',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                      title="Salin Kode"
                                    >
                                      {copiedCode === uv.voucher_code ? <Check size={14} /> : <Tag size={14} />}
                                    </button>
                                  </div>

                                  {!isUsed && (
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button
                                        onClick={() => setOfflineQrModal(uv)}
                                        style={{
                                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          cursor: 'pointer',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          fontFamily: 'var(--font-inter)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                        }}
                                      >
                                        <QrCode size={13} />
                                        QR Kasir
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUseVoucherOnline(uv)}
                                        style={{
                                          background: 'var(--color-bg-card)',
                                          color: 'var(--color-text)',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          fontFamily: 'var(--font-inter)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <ShoppingBag size={13} style={{ color: 'var(--color-primary)' }} />
                                        Pakai Online
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </AnimateOnScroll>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Rewards (Tukar Poin) Tab - COMING SOON SHOWCASE */}
              {activeTab === 'rewards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Coming Soon Hero Banner */}
                  <AnimateOnScroll animation="fade-up">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(139, 69, 19, 0.09) 100%)',
                      border: '1.5px solid rgba(212, 175, 55, 0.45)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '2rem 1.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                      boxShadow: '0 12px 35px rgba(212, 175, 55, 0.08), 0 0 20px rgba(212, 175, 55, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Ambient background blur */}
                      <div style={{
                        position: 'absolute',
                        top: '-40px',
                        right: '-40px',
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        background: 'var(--color-gold)',
                        filter: 'blur(60px)',
                        opacity: 0.15,
                        pointerEvents: 'none',
                      }} />

                      <div style={{ maxWidth: '560px', position: 'relative' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(212, 175, 55, 0.2)',
                          border: '1px solid rgba(212, 175, 55, 0.4)',
                          color: 'var(--color-gold)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          padding: '4px 10px',
                          borderRadius: '50px',
                          marginBottom: '0.75rem',
                        }}>
                          <Sparkles size={13} /> Program Loyalty & Rewards — Segera Hadir
                        </div>

                        <h3 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.6rem)', fontFamily: 'var(--font-playfair)', fontWeight: 800, margin: '0 0 0.6rem', color: 'var(--color-text)', lineHeight: 1.25 }}>
                          Kumpulkan Poin Rasa & Nantikan Kejutan Hadiah Spesial!
                        </h3>

                        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.65 }}>
                          Sistem penukaran poin langsung ke voucher diskon & traktiran kopi favorit sedang kami siapkan di kedai dan web. 
                          Setiap pesanan yang kamu selesaikan tetap otomatis mengumpulkan <strong>1 Poin Rasa tiap Rp 10.000</strong> dan tersimpan aman di akunmu.
                        </p>
                      </div>

                      {/* Points Status Pill */}
                      <div style={{
                        background: 'var(--color-bg-card)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: 'var(--shadow-sm)',
                        position: 'relative',
                      }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Coins size={22} style={{ color: 'var(--color-gold)' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Poin Kamu</div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', lineHeight: 1.1 }}>
                            {(profile.loyalty_points || 0).toLocaleString('id-ID')} <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>Poin</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#4a9e6a', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} /> Akumulasi Poin Aktif
                          </div>
                        </div>
                      </div>
                    </div>
                  </AnimateOnScroll>

                  {/* Sneak Peek Section Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, margin: '0 0 2px', color: 'var(--color-text)' }}>
                        Bocoran Katalog Hadiah Mendatang ✨
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        Berikut adalah ragam reward eksklusif yang sedang disiapkan dan siap ditukarkan saat peluncuran resmi.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '4px 10px', borderRadius: '20px' }}>
                      Dalam Tahap Persiapan
                    </span>
                  </div>

                  {/* Teaser Rewards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {loyaltyRewards.map((reward, idx) => {
                      return (
                        <AnimateOnScroll key={reward.id} animation="fade-up" delay={idx * 50}>
                          <div style={{
                            background: 'var(--color-bg-card)',
                            border: '1px dashed var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden',
                            opacity: 0.92,
                          }}>
                            {/* Coming Soon Pill */}
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--color-gold)',
                              border: '1px solid rgba(212, 175, 55, 0.35)',
                              borderRadius: '50px',
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>
                              Segera Hadir
                            </div>

                            <div>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-primary)',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-playfair)',
                                marginBottom: '0.75rem',
                              }}>
                                <Star size={13} style={{ fill: 'currentColor' }} />
                                {reward.points_required} Poin
                              </div>

                              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', margin: '0 0 6px' }}>
                                {reward.title}
                              </h4>

                              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 1rem' }}>
                                {reward.description}
                              </p>
                            </div>

                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                {reward.min_order > 0 ? `Min. transaksi Rp ${reward.min_order.toLocaleString('id-ID')}` : 'Tanpa minimal belanja'}
                              </div>

                              <button
                                type="button"
                                disabled
                                style={{
                                  width: '100%',
                                  padding: '9px 14px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  background: 'var(--color-bg-secondary)',
                                  color: 'var(--color-text-muted)',
                                  border: '1px solid var(--color-border)',
                                }}
                              >
                                <Sparkles size={13} style={{ color: 'var(--color-gold)' }} />
                                Nantikan Saat Peluncuran ✨
                              </button>
                            </div>
                          </div>
                        </AnimateOnScroll>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Points History Tab */}
              {activeTab === 'points_history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Coins size={16} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                        Poin diperoleh otomatis <strong>1 Pts / Rp 10.000</strong> transaksi. Penukaran hadiah segera dibuka!
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      background: 'rgba(212, 175, 55, 0.18)',
                      border: '1px solid rgba(212, 175, 55, 0.35)',
                      color: 'var(--color-gold)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      Coming Soon
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)', margin: 0 }}>
                      Catatan Mutasi Poin Rasa
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Total {loyaltyTransactions.length} transaksi
                    </span>
                  </div>

                  {loyaltyTransactions.length === 0 ? (
                    <AnimateOnScroll animation="fade-up">
                      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                        <Coins size={44} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.4rem' }}>Belum Ada Riwayat Poin</h4>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
                          Setiap kali kamu menyelesaikan pesanan di Lorong Rasa, poin loyalitas akan otomatis tercatat di sini!
                        </p>
                        <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                          Mulai Belanja & Kumpulkan Poin
                        </Link>
                      </div>
                    </AnimateOnScroll>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {loyaltyTransactions.map((tx, idx) => {
                        const isPlus = tx.points > 0
                        return (
                          <AnimateOnScroll key={tx.id} animation="fade-up" delay={idx * 40}>
                            <div style={{
                              background: 'var(--color-bg-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '1rem 1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: isPlus ? 'rgba(74, 158, 106, 0.12)' : 'rgba(232, 90, 74, 0.12)',
                                  color: isPlus ? '#4a9e6a' : '#e85a4a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  {isPlus ? <Coins size={18} /> : <Gift size={18} />}
                                </div>

                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '2px' }}>
                                    {tx.description}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    {new Date(tx.created_at).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })} WIB
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                  fontSize: '1.1rem',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-playfair)',
                                  color: isPlus ? '#4a9e6a' : '#e85a4a',
                                }}>
                                  {isPlus ? `+${tx.points}` : tx.points} Poin
                                </div>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '50px',
                                  background: 'var(--color-bg-secondary)',
                                  color: 'var(--color-text-muted)',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                }}>
                                  {tx.type}
                                </span>
                              </div>
                            </div>
                          </AnimateOnScroll>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                userOrders.length === 0 ? (
                  <AnimateOnScroll animation="fade-up">
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
                      <ShoppingBag size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                      <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>Kamu belum memiliki riwayat pesanan.</p>
                      <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                        Pesan Menu Sekarang
                      </Link>
                    </div>
                  </AnimateOnScroll>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    {/* Active Order Spotlight */}
                    {activeOrder && (
                      <AnimateOnScroll animation="fade-up">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', margin: 0, color: 'var(--color-text)' }}>
                              Pesanan Aktif Sedang Diproses
                            </h3>
                          </div>
                          <LiveOrderTracker order={activeOrder} variant="full" />
                        </div>
                      </AnimateOnScroll>
                    )}

                    {/* Past Orders List */}
                    {pastOrders.length > 0 && (
                      <div>
                        {activeOrder && (
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Riwayat Pesanan Terdahulu ({pastOrders.length})
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {pastOrders.map((o, idx) => {
                            const conf = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.completed
                            return (
                              <AnimateOnScroll key={o.id} animation="fade-right" delay={idx * 50}>
                                <div style={{
                                  background: 'var(--color-bg-card)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: 'var(--radius-lg)',
                                  padding: '1.25rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.85rem',
                                  transition: 'all 0.2s ease',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                                        #{o.id.slice(0, 8).toUpperCase()}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        {new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 9px',
                                        borderRadius: '50px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-muted)',
                                        fontFamily: 'var(--font-inter)',
                                      }}>
                                        {o.order_type === 'dine_in' ? (
                                          <>
                                            <UtensilsCrossed size={12} color="var(--color-primary)" />
                                            Dine In {o.table_number ? `(${o.table_number})` : ''}
                                          </>
                                        ) : (
                                          <>
                                            <Package size={12} color="var(--color-gold)" />
                                            Take Away
                                          </>
                                        )}
                                      </span>
                                      <span style={{
                                        padding: '3px 10px',
                                        borderRadius: '50px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: conf.bgColor,
                                        color: conf.color,
                                        fontFamily: 'var(--font-inter)',
                                      }}>
                                        {conf.label}
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                    <div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Total Pembayaran</div>
                                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-playfair)' }}>
                                        Rp {Number(o.total_amount).toLocaleString('id-ID')}
                                      </div>
                                    </div>
                                    <Link
                                      href={`/orders/${o.id}`}
                                      className="btn-outline"
                                      style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      Lihat Struk &amp; Detail <ChevronRight size={14} />
                                    </Link>
                                  </div>
                                </div>
                              </AnimateOnScroll>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Offline Voucher QR Modal for Cashier Scan */}
        {offlineQrModal && profile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setOfflineQrModal(null)}
          >
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setOfflineQrModal(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem', fontFamily: 'var(--font-inter)' }}>
                <QrCode size={13} /> QR Penukaran Kasir
              </div>
              {(() => {
                const v = offlineQrModal.vouchers
                const awardedItem = v?.discount_type === 'product'
                  ? getOrDrawAwardedProduct(offlineQrModal.voucher_code, v?.product_name)
                  : null
                const qrValue = `VOUCHER_CLAIM:${offlineQrModal.id}|${offlineQrModal.voucher_code}${awardedItem ? `|${awardedItem}` : ''}`

                return (
                  <>
                    <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.4rem' }}>
                      {v
                        ? (v.discount_type === 'percentage'
                            ? `Diskon ${v.discount_value}%`
                            : v.discount_type === 'product'
                            ? (v.discount_value === 100 ? `Gratis 1x ${awardedItem || v.product_name || 'Menu Pilihan'}` : `Diskon ${v.discount_value}% ${awardedItem || v.product_name || 'Menu Pilihan'}`)
                            : `Hemat Rp ${v.discount_value.toLocaleString('id-ID')}`)
                        : offlineQrModal.voucher_code}
                    </h3>
                    {awardedItem && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(212, 160, 74, 0.15)',
                        border: '1px solid rgba(212, 160, 74, 0.3)',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        marginBottom: '0.75rem',
                      }}>
                        <Coffee size={14} /> Menu Hadiah: {awardedItem}
                      </div>
                    )}
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                      Tunjukkan QR code ini kepada <strong>Kasir Lorong Rasa</strong> saat bertransaksi langsung di kedai.
                    </p>

                    {/* QR Code Container */}
                    <div style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'inline-block',
                      marginBottom: '1.25rem',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    }}>
                      <QRCodeSVG
                        value={qrValue}
                        size={190}
                        bgColor="#ffffff"
                        fgColor="#1a0f00"
                        level="H"
                      />
                    </div>
                  </>
                )
              })()}

              {/* Code Box */}
              <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '2px', textTransform: 'uppercase' }}>Kode Voucher & ID Klaim</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary)', letterSpacing: '0.12em' }}>
                  {offlineQrModal.voucher_code}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                  Klaim #{offlineQrModal.id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => copyCode(offlineQrModal.voucher_code)}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
                >
                  <Tag size={14} />
                  Salin Kode
                </button>
                <button
                  onClick={() => setOfflineQrModal(null)}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.65rem' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Member Card QR Modal */}
        {showMemberCardQr && profile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setShowMemberCardQr(false)}
          >
            <div
              style={{
                background: 'linear-gradient(145deg, #1c130b, #2b180a)',
                border: '1px solid rgba(212, 160, 74, 0.4)',
                borderRadius: '24px',
                padding: 'clamp(1.25rem, 5vw, 2rem)',
                width: '100%',
                maxWidth: '400px',
                color: 'white',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 40px var(--color-primary-glow)',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Background Glow */}
              <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', opacity: 0.3, pointerEvents: 'none' }} />

              <button
                onClick={() => setShowMemberCardQr(false)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingRight: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coffee size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gold)' }}>Lorong Rasa</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>VIP Loyalty Card</div>
                  </div>
                </div>
              </div>

              {/* QR Center */}
              <div style={{ textAlign: 'center', margin: '0.75rem 0' }}>
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '1rem',
                  display: 'inline-block',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                  maxWidth: '100%',
                }}>
                  <QRCodeSVG
                    value={`LORONG_RASA_MEMBER:${profile.id}|${profile.email}|${profile.role}`}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#1a0f00"
                    level="H"
                  />
                </div>
              </div>

              {/* Member details */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>Nama Member</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', fontFamily: 'var(--font-inter)' }}>{profile.full_name || 'Member Lorong Rasa'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>Email</span>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-inter)' }}>{profile.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>Tingkat Member</span>
                  <span style={{
                    fontSize: '0.72rem',
                    background: getLoyaltyTier(profile.loyalty_points || 0).bgGlow,
                    color: getLoyaltyTier(profile.loyalty_points || 0).color,
                    border: `1px solid ${getLoyaltyTier(profile.loyalty_points || 0).borderGlow}`,
                    padding: '2px 8px',
                    borderRadius: '50px',
                    fontWeight: 700,
                  }}>
                    {getLoyaltyTier(profile.loyalty_points || 0).title}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>Saldo Poin</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', fontFamily: 'var(--font-inter)' }}>
                    ⭐ {(profile.loyalty_points || 0).toLocaleString('id-ID')} Poin Rasa
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowMemberCardQr(false)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* Redeem Confirmation Modal */}
        {selectedRewardToRedeem && profile && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setSelectedRewardToRedeem(null)}
          >
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedRewardToRedeem(null)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>

              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Gift size={24} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, textAlign: 'center', margin: '0 0 0.5rem' }}>
                Konfirmasi Penukaran Poin
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                Apakah kamu ingin menukarkan poin untuk voucher hadiah berikut?
              </p>

              {/* Reward Detail Box */}
              <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-playfair)', marginBottom: '4px' }}>
                  {selectedRewardToRedeem.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  {selectedRewardToRedeem.description}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Biaya Poin:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selectedRewardToRedeem.points_required} Poin</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Saldo Poin Kamu:</span>
                  <span style={{ fontWeight: 600 }}>{profile.loyalty_points || 0} Poin</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Sisa Poin Setelahnya:</span>
                  <span style={{ fontWeight: 700, color: '#4a9e6a' }}>
                    {Math.max(0, (profile.loyalty_points || 0) - selectedRewardToRedeem.points_required)} Poin
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setSelectedRewardToRedeem(null)}
                  disabled={redeeming}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmRedeem}
                  disabled={redeeming}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
                >
                  {redeeming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {redeeming ? 'Memproses...' : 'Tukar Sekarang'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeem Celebration Success Modal */}
        {redeemSuccess && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={() => setRedeemSuccess(null)}
          >
            <div
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: 'var(--radius-xl)',
                padding: '2.25rem 2rem',
                width: '100%',
                maxWidth: '420px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(212, 175, 55, 0.15)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setRedeemSuccess(null)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>

              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 25px var(--color-primary-glow)' }}>
                <Sparkles size={30} />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                Penukaran Berhasil!
              </div>
              <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-playfair)', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Selamat! Voucher Baru Siap Dipakai
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
                Voucher untuk <strong>{redeemSuccess.title}</strong> telah otomatis disimpan di dompet akunmu.
              </p>

              {/* Voucher Code Box */}
              <div style={{
                background: 'var(--color-bg-secondary)',
                border: '2px dashed var(--color-primary)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Kode Voucher Kamu</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-primary)', letterSpacing: '0.12em' }}>
                  {redeemSuccess.voucherCode}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Sisa Saldo: <strong>{redeemSuccess.remainingPoints} Poin Rasa</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => {
                    copyCode(redeemSuccess.voucherCode)
                  }}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.85rem' }}
                >
                  {copiedCode === redeemSuccess.voucherCode ? <Check size={15} /> : <Copy size={15} />}
                  {copiedCode === redeemSuccess.voucherCode ? 'Tersalin!' : 'Salin Kode'}
                </button>
                <button
                  onClick={() => {
                    setRedeemSuccess(null)
                    setActiveTab('vouchers')
                  }}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.85rem' }}
                >
                  Buka Voucher
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
