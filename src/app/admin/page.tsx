'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Tag, Coffee, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalVouchers: number
  activeVouchers: number
  totalUsers: number
  totalMenuItems: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalVouchers: 0, activeVouchers: 0, totalUsers: 0, totalMenuItems: 0 })
  const [recentVouchers, setRecentVouchers] = useState<{ id: string; code: string; discount_type: string; discount_value: number; min_order: number; is_active: boolean; expires_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setUserEmail(user.email)

      const [vouchersRes, usersRes, menuRes, activeVouchersRes, recentRes] = await Promise.all([
        supabase.from('vouchers').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('menu_items').select('id', { count: 'exact', head: true }),
        supabase.from('vouchers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('vouchers').select('*').order('created_at', { ascending: false }).limit(5),
      ])

      setStats({
        totalVouchers: vouchersRes.count ?? 0,
        activeVouchers: activeVouchersRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        totalMenuItems: menuRes.count ?? 0,
      })

      if (recentRes.data) setRecentVouchers(recentRes.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const statCards = [
    {
      label: 'Total Voucher',
      value: stats.totalVouchers,
      icon: Tag,
      color: '#c47a2e',
      change: `${stats.activeVouchers} aktif`,
    },
    {
      label: 'Total Pengguna',
      value: stats.totalUsers,
      icon: Users,
      color: '#4a7e9e',
      change: 'Terdaftar',
    },
    {
      label: 'Item Menu',
      value: stats.totalMenuItems,
      icon: Coffee,
      color: '#4a9e6a',
      change: 'Tersedia',
    },
    {
      label: 'Voucher Aktif',
      value: stats.activeVouchers,
      icon: TrendingUp,
      color: '#9e4a9e',
      change: 'Sedang berjalan',
    },
  ]

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
          Selamat Datang 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.9rem' }}>
          {userEmail || 'Admin'} — Panel Manajemen Lorong Rasa
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem',
      }}>
        {statCards.map(({ label, value, icon: Icon, color, change }) => (
          <div
            key={label}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: color + '15',
              pointerEvents: 'none',
            }} />
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: color + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${color}33`,
              }}>
                <Icon size={20} color={color} />
              </div>
              <ArrowUpRight size={16} style={{ color: color, opacity: 0.6 }} />
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'var(--font-playfair)',
              color: 'var(--color-text)',
              lineHeight: 1,
              marginBottom: '0.4rem',
            }}>
              {loading ? '—' : value}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '2px' }}>
              {label}
            </div>
            <div style={{ fontSize: '0.75rem', color: color, fontFamily: 'var(--font-inter)', fontWeight: 500 }}>
              {change}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Vouchers */}
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
          <h2 style={{ fontSize: '1rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}>
            Voucher Terbaru
          </h2>
          <a href="/admin/vouchers" style={{
            fontSize: '0.8rem',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontFamily: 'var(--font-inter)',
            fontWeight: 500,
          }}>
            Lihat semua →
          </a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Memuat...
            </div>
          ) : recentVouchers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Belum ada voucher. <a href="/admin/vouchers" style={{ color: 'var(--color-primary)' }}>Buat sekarang →</a>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Kode', 'Diskon', 'Min. Order', 'Status', 'Kadaluarsa'].map(col => (
                    <th key={col} style={{
                      padding: '0.75rem 1.25rem',
                      textAlign: 'left',
                      fontSize: '0.78rem',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-inter)',
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
                {recentVouchers.map((v, i) => (
                  <tr
                    key={v.id}
                    style={{
                      borderTop: '1px solid var(--color-border-light)',
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
                        borderRadius: '6px',
                      }}>
                        {v.code}
                      </code>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                      {v.discount_type === 'percentage'
                        ? `${v.discount_value}%`
                        : `Rp ${v.discount_value.toLocaleString('id-ID')}`}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      Rp {v.min_order.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        background: v.is_active ? '#4a9e6a22' : '#e85a4a22',
                        color: v.is_active ? '#4a9e6a' : '#e85a4a',
                        border: `1px solid ${v.is_active ? '#4a9e6a44' : '#e85a4a44'}`,
                        borderRadius: '50px',
                        padding: '2px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
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
