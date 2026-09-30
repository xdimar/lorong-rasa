'use client'

import { useEffect, useState } from 'react'
import { Users, Shield, Store, Search, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const updateRole = async (id: string, newRole: string) => {
    if (id === currentUserId && newRole !== 'admin') {
      alert('Tindakan Ditolak: Anda tidak dapat menurunkan hak akses akun admin Anda sendiri untuk mencegah sistem terkunci (admin lockout).')
      return
    }
    setUpdatingId(id)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setUpdatingId(null)
    if (error) {
      alert('Gagal mengubah peran: ' + error.message)
    } else {
      setNotification(`Peran akun berhasil diubah menjadi ${newRole.toUpperCase()}`)
      setTimeout(() => setNotification(null), 3000)
      fetchUsers()
    }
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Manajemen Pengguna</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            Kelola akun dan hak akses pengguna
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 1rem',
          minWidth: '220px',
          flex: '1 1 220px',
          maxWidth: '320px',
        }}>
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari pengguna..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-inter)',
              fontSize: '0.9rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {notification && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0.75rem 1.25rem',
          background: 'rgba(74, 158, 106, 0.15)',
          border: '1px solid rgba(74, 158, 106, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#4a9e6a',
          fontSize: '0.85rem',
          fontWeight: 600,
          fontFamily: 'var(--font-inter)',
          marginBottom: '1.25rem',
        }}>
          <CheckCircle2 size={16} />
          {notification}
        </div>
      )}

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
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                {search ? 'Pengguna tidak ditemukan.' : 'Belum ada pengguna terdaftar.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Pengguna', 'Email', 'Peran', 'Bergabung', 'Aksi'].map(col => (
                    <th key={col} style={{
                      padding: '0.85rem 1.25rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr
                    key={user.id}
                    style={{ borderTop: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
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
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                          {user.full_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {user.role === 'admin' && (
                        <span style={{
                          background: 'rgba(201, 100, 39, 0.15)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary)',
                          borderRadius: '50px',
                          padding: '3px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-inter)',
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
                          padding: '3px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-inter)',
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
                          padding: '3px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          fontFamily: 'var(--font-inter)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}>
                          Pengguna
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {user.id === currentUserId ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-inter)' }}>
                          (Akun Anda)
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={user.role}
                            disabled={updatingId === user.id}
                            onChange={(e) => updateRole(user.id, e.target.value)}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              color: 'var(--color-text)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              padding: '0.45rem 0.85rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              fontFamily: 'var(--font-inter)',
                              cursor: updatingId === user.id ? 'wait' : 'pointer',
                              outline: 'none',
                              transition: 'border-color 0.2s',
                            }}
                          >
                            <option value="user">Pengguna (User)</option>
                            <option value="cashier">Kasir (Cashier)</option>
                            <option value="admin">Administrator</option>
                          </select>
                          {updatingId === user.id && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Menyimpan...</span>
                          )}
                        </div>
                      )}
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
