'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Shield,
  Store,
  Search,
  CheckCircle2,
  Trash2,
  Filter,
  RotateCcw,
  AlertTriangle,
  X,
  UserCheck,
  ArrowUpDown,
  Lock,
  Coins,
  Star,
  Crown,
  Gift,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getLoyaltyTier } from '@/lib/loyalty'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  loyalty_points?: number
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'cashier' | 'user'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'email_asc' | 'points_desc' | 'points_asc'>('newest')

  // Operation states
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<Profile | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Adjust Points states
  const [adjustPointsUser, setAdjustPointsUser] = useState<Profile | null>(null)
  const [pointsChange, setPointsChange] = useState<number>(10)
  const [pointsReason, setPointsReason] = useState<string>('Bonus Pelanggan Setia Lorong Rasa')
  const [adjustingPoints, setAdjustingPoints] = useState<boolean>(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev))
    }, 4000)
  }

  const fetchUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Update user role
  const updateRole = async (id: string, newRole: string) => {
    if (id === currentUserId && newRole !== 'admin') {
      showToast('error', 'Tindakan Ditolak: Anda tidak dapat menurunkan hak akses akun admin Anda sendiri (lockout prevention).')
      return
    }
    setUpdatingId(id)
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
      if (error) throw error

      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role: newRole } : u)))
      showToast('success', `Peran akun berhasil diubah menjadi ${newRole.toUpperCase()}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah peran pengguna'
      showToast('error', msg)
    } finally {
      setUpdatingId(null)
    }
  }

  // Delete user
  const handleDeleteUser = async (targetUser: Profile) => {
    if (targetUser.id === currentUserId) {
      showToast('error', 'Tindakan Ditolak: Anda tidak dapat menghapus akun Anda sendiri.')
      setDeleteConfirmUser(null)
      return
    }

    setDeletingId(targetUser.id)
    try {
      // 1. Disassociate any orders placed by this user to preserve sales/revenue data and avoid FK constraint errors
      await supabase.from('orders').update({ user_id: null }).eq('user_id', targetUser.id)

      // 2. Clean up any user voucher claims
      await supabase.from('user_vouchers').delete().eq('user_id', targetUser.id)

      // 3. Delete profile from public.profiles
      const { error } = await supabase.from('profiles').delete().eq('id', targetUser.id)
      if (error) throw error

      setUsers(prev => prev.filter(u => u.id !== targetUser.id))
      setDeleteConfirmUser(null)
      showToast('success', `Pengguna "${targetUser.full_name || targetUser.email}" berhasil dihapus.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus pengguna'
      showToast('error', 'Gagal menghapus pengguna: ' + msg)
    } finally {
      setDeletingId(null)
    }
  }

  // Reset filters
  const resetFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setSortBy('newest')
  }

  // Save adjusted points
  const handleSaveAdjustPoints = async () => {
    if (!adjustPointsUser) return
    setAdjustingPoints(true)
    try {
      const currentPts = adjustPointsUser.loyalty_points || 0
      const newPts = Math.max(0, currentPts + pointsChange)

      // Update profile in DB
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ loyalty_points: newPts })
        .eq('id', adjustPointsUser.id)

      if (pErr) throw pErr

      // Insert into loyalty_transactions
      await supabase.from('loyalty_transactions').insert({
        user_id: adjustPointsUser.id,
        points: pointsChange,
        type: pointsChange >= 0 ? 'bonus' : 'adjusted',
        description: pointsReason.trim() || (pointsChange >= 0 ? 'Bonus poin dari administrator' : 'Penyesuaian saldo poin oleh administrator'),
      })

      setUsers(prev => prev.map(u => u.id === adjustPointsUser.id ? { ...u, loyalty_points: newPts } : u))
      showToast('success', `Berhasil! Saldo poin ${adjustPointsUser.full_name || adjustPointsUser.email} kini ${newPts} Poin Rasa.`)
      setAdjustPointsUser(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyesuaikan poin'
      showToast('error', msg)
    } finally {
      setAdjustingPoints(false)
    }
  }

  const isFilterActive = search.trim() !== '' || roleFilter !== 'all' || sortBy !== 'newest'

  // Statistics
  const totalUsers = users.length
  const adminCount = users.filter(u => u.role === 'admin').length
  const cashierCount = users.filter(u => u.role === 'cashier').length
  const customerCount = users.filter(u => u.role !== 'admin' && u.role !== 'cashier').length

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()

    const list = users.filter(u => {
      // Role filter
      if (roleFilter === 'admin' && u.role !== 'admin') return false
      if (roleFilter === 'cashier' && u.role !== 'cashier') return false
      if (roleFilter === 'user' && (u.role === 'admin' || u.role === 'cashier')) return false

      // Search query
      if (q) {
        const matchEmail = u.email?.toLowerCase().includes(q)
        const matchName = u.full_name?.toLowerCase().includes(q)
        const matchId = u.id?.toLowerCase().includes(q)
        if (!matchEmail && !matchName && !matchId) return false
      }

      return true
    })

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'points_desc') {
        return (b.loyalty_points || 0) - (a.loyalty_points || 0)
      }
      if (sortBy === 'points_asc') {
        return (a.loyalty_points || 0) - (b.loyalty_points || 0)
      }
      if (sortBy === 'name_asc') {
        const nameA = (a.full_name || a.email || '').toLowerCase()
        const nameB = (b.full_name || b.email || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }
      if (sortBy === 'name_desc') {
        const nameA = (a.full_name || a.email || '').toLowerCase()
        const nameB = (b.full_name || b.email || '').toLowerCase()
        return nameB.localeCompare(nameA)
      }
      if (sortBy === 'email_asc') {
        return (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase())
      }
      return 0
    })
  }, [users, roleFilter, search, sortBy])

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
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ flex: 1 }}>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.25rem', color: 'var(--color-text)' }}>
          Manajemen Pengguna
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
          Kelola akun dan hak akses pengguna, filter berdasarkan peran, serta hapus akun yang sudah tidak aktif.
        </p>
      </div>

      {/* User Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Total Pengguna */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(232, 160, 74, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Total Pengguna</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>{totalUsers}</div>
          </div>
        </div>

        {/* Administrator */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(201, 100, 39, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Administrator</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>{adminCount}</div>
          </div>
        </div>

        {/* Kasir */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(74, 158, 106, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4a9e6a',
          }}>
            <Store size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Kasir</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: '#4a9e6a' }}>{cashierCount}</div>
          </div>
        </div>

        {/* Pelanggan */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(46, 122, 196, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2e7ac4',
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>Pelanggan</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)' }}>{customerCount}</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CARD */}
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              placeholder="Cari nama, email, ID..."
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.85rem',
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

          {/* Sort Order */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
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
              <option value="newest">Terbaru Mendaftar</option>
              <option value="oldest">Terlama Mendaftar</option>
              <option value="points_desc">Poin Tertinggi (Top VIP)</option>
              <option value="points_asc">Poin Terendah</option>
              <option value="name_asc">Nama (A - Z)</option>
              <option value="name_desc">Nama (Z - A)</option>
              <option value="email_asc">Email (A - Z)</option>
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <div>
              <button
                onClick={resetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
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
            </div>
          )}
        </div>

        {/* Role Tabs */}
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
              { key: 'all', label: 'Semua', count: totalUsers },
              { key: 'admin', label: 'Administrator', count: adminCount },
              { key: 'cashier', label: 'Kasir', count: cashierCount },
              { key: 'user', label: 'Pelanggan', count: customerCount },
            ].map(tab => {
              const isActive = roleFilter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setRoleFilter(tab.key as typeof roleFilter)}
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
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
            Menampilkan <strong style={{ color: 'var(--color-text)' }}>{filteredUsers.length}</strong> dari {totalUsers} pengguna
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Memuat pengguna...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                {isFilterActive ? 'Tidak ada pengguna yang cocok dengan filter yang dipilih.' : 'Belum ada pengguna terdaftar.'}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem', fontFamily: 'var(--font-inter)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Pengguna</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Peran</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Poin & Member</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Bergabung</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isCurrent = user.id === currentUserId
                  const isUpdating = updatingId === user.id
                  const isDeleting = deletingId === user.id

                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Avatar & Name */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: user.role === 'admin'
                              ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                              : user.role === 'cashier'
                              ? 'linear-gradient(135deg, #4a9e6a, #2f7a4a)'
                              : 'linear-gradient(135deg, #2e7ac4, #1b5085)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'white',
                            fontFamily: 'var(--font-inter)',
                            flexShrink: 0,
                          }}>
                            {(user.full_name || user.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                              {user.full_name || '—'}
                            </div>
                            {isCurrent && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Lock size={10} /> Akun Anda (Aktif)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '12px 16px' }}>
                        {user.role === 'admin' && (
                          <span style={{
                            background: 'rgba(201, 100, 39, 0.15)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '50px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <Shield size={12} />
                            Admin
                          </span>
                        )}
                        {user.role === 'cashier' && (
                          <span style={{
                            background: 'rgba(74, 158, 106, 0.15)',
                            color: '#4a9e6a',
                            border: '1px solid rgba(74, 158, 106, 0.4)',
                            borderRadius: '50px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <Store size={12} />
                            Kasir
                          </span>
                        )}
                        {user.role !== 'admin' && user.role !== 'cashier' && (
                          <span style={{
                            background: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '50px',
                            padding: '3px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <UserCheck size={12} />
                            Pelanggan
                          </span>
                        )}
                      </td>

                      {/* Loyalty Points & Member Tier */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const pts = user.loyalty_points || 0
                          const tier = getLoyaltyTier(pts)
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: tier.bgGlow,
                                color: tier.color,
                                border: `1px solid ${tier.borderGlow}`,
                                borderRadius: '50px',
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}>
                                {tier.name === 'Gold' ? <Crown size={11} /> : <Star size={11} />}
                                {tier.name}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-playfair)' }}>
                                {pts.toLocaleString('id-ID')} Pts
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustPointsUser(user)
                                  setPointsChange(10)
                                  setPointsReason('Bonus Pelanggan Setia Lorong Rasa')
                                }}
                                title="Sesuaikan / Tambah Poin"
                                style={{
                                  background: 'var(--color-bg-secondary)',
                                  border: '1px solid var(--color-border)',
                                  borderRadius: '6px',
                                  color: 'var(--color-primary)',
                                  width: '26px',
                                  height: '26px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                              >
                                <Coins size={13} />
                              </button>
                            </div>
                          )
                        })()}
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isCurrent ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            (Terproteksi)
                          </span>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {/* Role Selector */}
                            <select
                              value={user.role}
                              disabled={isUpdating || isDeleting}
                              onChange={(e) => updateRole(user.id, e.target.value)}
                              style={{
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-inter)',
                                cursor: (isUpdating || isDeleting) ? 'wait' : 'pointer',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                            >
                              <option value="user">Pelanggan (User)</option>
                              <option value="cashier">Kasir (Cashier)</option>
                              <option value="admin">Administrator</option>
                            </select>

                            {/* Delete User Button */}
                            <button
                              disabled={isDeleting || isUpdating}
                              onClick={() => setDeleteConfirmUser(user)}
                              style={{
                                background: 'rgba(232, 90, 74, 0.12)',
                                border: '1px solid rgba(232, 90, 74, 0.3)',
                                borderRadius: '8px',
                                padding: '6px 8px',
                                cursor: (isDeleting || isUpdating) ? 'wait' : 'pointer',
                                color: '#e85a4a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
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
          onClick={() => !deletingId && setDeleteConfirmUser(null)}
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
                  Hapus Pengguna?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Konfirmasi penghapusan akun pengguna
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
              <div><strong>Nama:</strong> {deleteConfirmUser.full_name || 'Tanpa Nama'}</div>
              <div><strong>Email:</strong> {deleteConfirmUser.email}</div>
              <div><strong>Peran:</strong> {deleteConfirmUser.role.toUpperCase()}</div>
              <div><strong>Bergabung:</strong> {new Date(deleteConfirmUser.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <p style={{ marginTop: '0.65rem', marginBottom: 0, fontSize: '0.78rem', color: '#e85a4a' }}>
                ⚠️ Akun pengguna akan dihapus dari sistem. Riwayat transaksi pesanan yang pernah dibuat tetap tersimpan dengan aman untuk pelaporan keuangan kafe.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteConfirmUser(null)}
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
                onClick={() => handleDeleteUser(deleteConfirmUser)}
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
                {deletingId ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {adjustPointsUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => !adjustingPoints && setAdjustPointsUser(null)}
        >
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '460px',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.15)',
                color: 'var(--color-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Coins size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', margin: 0 }}>
                  Sesuaikan Poin Loyalitas
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Tambah bonus poin atau sesuaikan saldo member
                </p>
              </div>
              <button
                disabled={adjustingPoints}
                onClick={() => setAdjustPointsUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Member Info Card */}
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {adjustPointsUser.full_name || 'Tanpa Nama'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {adjustPointsUser.email}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Saldo Saat Ini</div>
                <div style={{ fontWeight: 800, color: 'var(--color-gold)', fontFamily: 'var(--font-playfair)', fontSize: '1.1rem' }}>
                  {(adjustPointsUser.loyalty_points || 0).toLocaleString('id-ID')} Poin
                </div>
              </div>
            </div>

            {/* Quick Adjust Buttons */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Pilihan Cepat
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[+5, +10, +25, +50, -10].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPointsChange(val)}
                    style={{
                      background: pointsChange === val ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                      color: pointsChange === val ? 'white' : 'var(--color-text)',
                      border: `1px solid ${pointsChange === val ? 'transparent' : 'var(--color-border)'}`,
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {val > 0 ? `+${val}` : val} Poin
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Points Input */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Jumlah Perubahan Poin (+ untuk nambah, - untuk kurang)
              </label>
              <input
                type="number"
                value={pointsChange}
                onChange={e => setPointsChange(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: pointsChange >= 0 ? '#4a9e6a' : '#e85a4a',
                  outline: 'none',
                }}
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Alasan / Catatan Penyesuaian
              </label>
              <input
                type="text"
                value={pointsReason}
                onChange={e => setPointsReason(e.target.value)}
                placeholder="Contoh: Bonus Pelanggan Setia Lorong Rasa"
                style={{
                  width: '100%',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Preview new balance */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px dashed rgba(212, 175, 55, 0.4)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.85rem',
            }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Estimasi Saldo Baru:</span>
              <strong style={{ color: 'var(--color-gold)', fontSize: '1rem', fontFamily: 'var(--font-playfair)' }}>
                {Math.max(0, (adjustPointsUser.loyalty_points || 0) + pointsChange).toLocaleString('id-ID')} Poin
              </strong>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                disabled={adjustingPoints}
                onClick={() => setAdjustPointsUser(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: adjustingPoints ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={adjustingPoints || pointsChange === 0}
                onClick={handleSaveAdjustPoints}
                className="btn-primary"
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.84rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: (adjustingPoints || pointsChange === 0) ? 0.6 : 1,
                  cursor: (adjustingPoints || pointsChange === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {adjustingPoints ? <Loader2 size={15} className="animate-spin" /> : <Coins size={15} />}
                {adjustingPoints ? 'Menyimpan...' : 'Simpan Poin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
