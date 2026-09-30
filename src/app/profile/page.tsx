'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Mail, Calendar, Edit2, Check, X, Tag, Shield, Coffee, QrCode, Sparkles, ShoppingBag, Clock, ChevronRight, Loader2, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

interface Voucher {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  expires_at: string
  min_order: number
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
  const [activeTab, setActiveTab] = useState<'vouchers' | 'orders'>('vouchers')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedVoucherQr, setSelectedVoucherQr] = useState<Voucher | null>(null)
  const [showMemberCardQr, setShowMemberCardQr] = useState(false)

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
          setNewName(data.full_name || '')
        } else {
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            role: 'user',
            created_at: user.created_at || new Date().toISOString(),
          })
        }

        // Fetch user's claimed vouchers (1 user 1 voucher)
        fetchUserVouchers(user.id)

        // Fetch user's orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (ordersData) {
          setUserOrders(ordersData)
        }
      } catch {
        // Continue
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleClaimVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    if (!code || !profile) return

    setClaimLoading(true)
    setClaimMessage(null)

    try {
      // 1. Check voucher in vouchers table
      const { data: voucher, error: vErr } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (vErr || !voucher) {
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
        .eq('user_id', profile.id)
        .eq('voucher_id', voucher.id)
        .single()

      if (existing) {
        setClaimMessage({
          type: 'error',
          text: existing.status === 'used'
            ? 'Voucher ini sudah pernah kamu gunakan sebelumnya (Maksimal 1 voucher per akun).'
            : 'Voucher ini sudah ada di dompet akunmu!',
        })
        setClaimLoading(false)
        return
      }

      // 3. Claim the voucher
      const { data: newClaim, error: claimErr } = await supabase
        .from('user_vouchers')
        .insert({
          user_id: profile.id,
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

      setClaimMessage({ type: 'success', text: `Selamat! Voucher ${voucher.code} berhasil ditambahkan ke akun Anda.` })
      setPromoInput('')
      fetchUserVouchers(profile.id)
    } catch {
      setClaimMessage({ type: 'error', text: 'Terjadi kendala jaringan saat mengklaim voucher.' })
    } finally {
      setClaimLoading(false)
    }
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

              {/* Quick stats */}
              <AnimateOnScroll animation="fade-left" delay={100}>
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  boxShadow: '0 8px 30px var(--color-primary-glow)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <Coffee size={20} color="rgba(255,255,255,0.9)" />
                    <h3 style={{ fontSize: '0.95rem', color: 'white', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Lorong Rasa Member</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-inter)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                    Kamu adalah bagian dari keluarga besar Lorong Rasa. Nikmati voucher eksklusif dan tunjukkan QR member untuk poin loyalty!
                  </p>
                  <button
                    onClick={() => setShowMemberCardQr(true)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(10px)',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  >
                    <QrCode size={16} />
                    Kartu Member & QR Barista
                  </button>
                </div>
              </AnimateOnScroll>
            </div>

            {/* Right: Available Vouchers & My Orders Tabs */}
            <div>
              <AnimateOnScroll animation="fade-right">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
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
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Tag size={15} />
                    Voucher ({userVouchers.length})
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
                      gap: '6px',
                      fontFamily: 'var(--font-inter)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <ShoppingBag size={15} />
                    Pesanan Saya ({userOrders.length})
                  </button>
                </div>
              </AnimateOnScroll>

              {activeTab === 'vouchers' ? (
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
                                    {v ? (v.discount_type === 'percentage' ? `${v.discount_value}% OFF` : `Rp ${v.discount_value.toLocaleString('id-ID')}`) : uv.voucher_code}
                                  </div>
                                  
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
                                      <Link
                                        href="/menu"
                                        style={{
                                          background: 'var(--color-bg-card)',
                                          color: 'var(--color-text)',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          fontFamily: 'var(--font-inter)',
                                          textDecoration: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        Pakai Online
                                      </Link>
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
              ) : (
              /* Orders Tab */
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userOrders.map((o, idx) => (
                    <AnimateOnScroll key={o.id} animation="fade-right" delay={idx * 60}>
                      <div style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                              #{o.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              {new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: o.status === 'completed' ? 'rgba(74, 158, 106, 0.15)' : 'rgba(232, 160, 74, 0.15)',
                            color: o.status === 'completed' ? '#4a9e6a' : '#e8a04a',
                          }}>
                            {o.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Pesanan</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-playfair)' }}>
                              Rp {Number(o.total_amount).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <Link
                            href={`/orders/${o.id}`}
                            className="btn-outline"
                            style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            Lihat Struk <ChevronRight size={13} />
                          </Link>
                        </div>
                      </div>
                    </AnimateOnScroll>
                  ))}
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
              <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.4rem' }}>
                {offlineQrModal.vouchers
                  ? (offlineQrModal.vouchers.discount_type === 'percentage' ? `Diskon ${offlineQrModal.vouchers.discount_value}%` : `Hemat Rp ${offlineQrModal.vouchers.discount_value.toLocaleString('id-ID')}`)
                  : offlineQrModal.voucher_code}
              </h3>
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
                  value={`VOUCHER_CLAIM:${offlineQrModal.id}|${offlineQrModal.voucher_code}|${profile.id}`}
                  size={190}
                  bgColor="#ffffff"
                  fgColor="#1a0f00"
                  level="H"
                />
              </div>

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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter)' }}>Status</span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(212, 160, 74, 0.3)', color: 'var(--color-gold)', padding: '2px 8px', borderRadius: '50px', fontWeight: 600 }}>VIP MEMBER</span>
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
      </main>
      <Footer />
    </>
  )
}
