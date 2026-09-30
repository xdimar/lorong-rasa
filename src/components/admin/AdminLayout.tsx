'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Tag,
  Coffee,
  Users,
  ShoppingBag,
  LogOut,
  Menu,
  X,
  ChevronRight,
  QrCode,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface NavItemConfig {
  href: string
  icon: any
  label: string
  roles: ('admin' | 'cashier')[]
}

const allNavItems: NavItemConfig[] = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
  { href: '/admin/pos', icon: Store, label: 'Kasir POS', roles: ['admin', 'cashier'] },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Pesanan', roles: ['admin', 'cashier'] },
  { href: '/admin/scan-voucher', icon: QrCode, label: 'Scan Voucher', roles: ['admin', 'cashier'] },
  { href: '/admin/menu', icon: Coffee, label: 'Menu & Stok', roles: ['admin', 'cashier'] },
  { href: '/admin/vouchers', icon: Tag, label: 'Voucher', roles: ['admin'] },
  { href: '/admin/users', icon: Users, label: 'Pengguna', roles: ['admin'] },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<'admin' | 'cashier' | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          if (profile?.role) {
            setRole(profile.role as 'admin' | 'cashier')
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchUserRole()
  }, [])

  const navItems = allNavItems
    .filter(item => !role || item.roles.includes(role))
    .map(item => {
      if (item.href === '/admin/menu' && role === 'cashier') {
        return { ...item, label: 'Ketersediaan Menu' }
      }
      return item
    })

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const renderSidebar = () => (
    <aside style={{
      width: '240px',
      background: 'var(--color-bg-card)',
      borderRight: '1px solid var(--color-border)',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--color-primary-glow)',
          flexShrink: 0,
        }}>
          <Coffee size={18} color="white" />
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Lorong Rasa
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {role === 'cashier' ? 'Panel Kasir' : 'Admin Panel'}
            {role && (
              <span style={{
                fontSize: '0.62rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: role === 'cashier' ? 'rgba(74, 158, 106, 0.2)' : 'rgba(201, 100, 39, 0.2)',
                color: role === 'cashier' ? '#4a9e6a' : 'var(--color-primary)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                {role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.7rem 1rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                background: isActive ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-inter)',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px var(--color-primary-glow)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-bg-secondary)'
                  e.currentTarget.style.color = 'var(--color-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }
              }}
            >
              <Icon size={18} />
              {label}
              {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div style={{
        padding: '1rem 0.75rem',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-inter)',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-bg-secondary)'
          e.currentTarget.style.color = 'var(--color-text)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--color-text-muted)'
        }}
        >
          ← Kembali ke Website
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '0.7rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: '#e85a4a',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter)',
            fontSize: '0.875rem',
            width: '100%',
            textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e85a4a15'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar */}
      <div className="admin-sidebar-desktop">
        {renderSidebar()}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
          }}
          className="admin-sidebar-mobile"
        >
          <div onClick={() => setSidebarOpen(false)} style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="admin-menu-btn"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              display: 'none',
            }}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-inter)',
          }}>
            {navItems.find(n => n.href === pathname)?.label ?? 'Admin'}
          </div>
          <ThemeToggle />
        </header>

        {/* Content */}
        <main className="admin-main-content" style={{ flex: 1 }}>
          {children}
        </main>
      </div>

      <style jsx>{`
        .admin-main-content {
          padding: 2rem 1.5rem;
        }
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none; }
          .admin-menu-btn { display: flex !important; }
          .admin-main-content { padding: 1.25rem 1rem !important; }
        }
        @media (min-width: 769px) {
          .admin-sidebar-mobile { display: none; }
        }
      `}</style>
    </div>
  )
}
