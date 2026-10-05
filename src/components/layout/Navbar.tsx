'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Coffee, User as UserIcon, ShoppingBag, Shield } from 'lucide-react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { DynamicCoffeeLogo } from '@/components/ui/DynamicCoffeeLogo'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ id?: string; email?: string } | null>(null)
  const [role, setRole] = useState<string>('user')
  const pathname = usePathname()
  const { totalItems, openCart } = useCart()

  // Track user IDs yang sudah pernah dicoba self-healing agar tidak memanggil insert berulang kali
  const healedUsersRef = useRef<Set<string>>(new Set())

  // Stable client instance — prevents listener duplication on every render
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Single auth listener — onAuthStateChange fires immediately with INITIAL_SESSION
  // so a separate checkAuth() call is redundant and causes double DB fetches.
  const fetchRole = useCallback(async (userId: string, userEmail?: string, userFullName?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      if (profile?.role) {
        setRole(profile.role)
      } else if (userId && userEmail && !healedUsersRef.current.has(userId)) {
        healedUsersRef.current.add(userId)
        // Self-healing: jika baris profil belum terbentuk, inisialisasi otomatis satu kali
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            full_name: userFullName || userEmail.split('@')[0],
            role: 'customer'
          })
          .select('role')
          .maybeSingle()
        if (created?.role) setRole(created.role)
      }
    } catch {
      // Abaikan error jaringan/offline agar Navbar tetap responsif
    }
  }, [supabase])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser(session.user)
          await fetchRole(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name
          )
        } else {
          setUser(null)
          setRole('user')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase, fetchRole])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/#home', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/#about', label: 'Tentang' },
    { href: '/#voucher', label: 'Voucher' },
    { href: '/panduan', label: 'Panduan' },
    { href: '/#contact', label: 'Kontak' },
  ]

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        background: scrolled
          ? 'var(--color-navbar-bg, rgba(var(--color-bg-rgb, 253, 248, 243), 0.88))'
          : 'transparent',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : 'none',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
        padding: scrolled ? '0.75rem 0' : '1.25rem 0',
      }}
    >
      <div className="container-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <DynamicCoffeeLogo scrolled={scrolled} />
          <span style={{
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
            fontSize: scrolled ? '1.3rem' : '1.45rem',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.01em',
            transition: 'font-size 0.35s ease',
          }}>
            Lorong Rasa
          </span>
        </Link>

        {/* Desktop Nav — hover via CSS .navbar-link class, no JS event handlers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="hidden-mobile">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === '/menu' && pathname.startsWith('/menu'))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Cart Trigger — hover via CSS .navbar-cart-btn */}
          <button
            id="navbar-cart-btn"
            onClick={openCart}
            aria-label="Buka Keranjang Belanja"
            className="navbar-cart-btn"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                color: 'white',
                borderRadius: '50px',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'var(--font-inter)',
                minWidth: '18px',
                textAlign: 'center',
                boxShadow: '0 2px 6px var(--color-primary-glow)',
              }}>
                {totalItems}
              </span>
            )}
          </button>

          <ThemeToggle />

          <div className="hidden-mobile" style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {(role === 'admin' || role === 'cashier') && (
              <Link
                href={role === 'cashier' ? '/admin/pos' : '/admin'}
                className="btn-outline"
                style={{
                  padding: '0.5rem 0.9rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)',
                }}
              >
                <Shield size={14} />
                {role === 'admin' ? 'Admin' : 'Kasir'}
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="btn-outline"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserIcon size={15} />
                  Profil
                </Link>
                <button onClick={handleSignOut} className="btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}>
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                  Masuk
                </Link>
                <Link href="/register" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>
                  Daftar
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '7px',
              cursor: 'pointer',
              color: 'var(--color-text)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="show-mobile"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          background: 'var(--color-bg-card)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          animation: 'slideInDown 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                color: pathname === link.href ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                fontWeight: pathname === link.href ? 600 : 500,
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--color-border-light)',
                fontFamily: 'var(--font-inter)',
                fontSize: '1rem',
              }}
            >
              {link.label}
            </Link>
          ))}
          {(role === 'admin' || role === 'cashier') && (
            <Link
              href={role === 'cashier' ? '/admin/pos' : '/admin'}
              onClick={() => setMobileOpen(false)}
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--color-border-light)',
                fontFamily: 'var(--font-inter)',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={16} /> {role === 'admin' ? 'Panel Admin' : 'Panel Kasir'}
            </Link>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="btn-outline"
                  style={{ flex: 1, textAlign: 'center', padding: '0.65rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserIcon size={16} /> Profil
                </Link>
                <button
                  onClick={handleSignOut}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.65rem', justifyContent: 'center' }}
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-outline" style={{ flex: 1, textAlign: 'center', padding: '0.65rem', justifyContent: 'center' }}>Masuk</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-primary" style={{ flex: 1, textAlign: 'center', padding: '0.65rem', justifyContent: 'center' }}>Daftar</Link>
              </>
            )}
          </div>
        </div>
      )}
      {/* Media queries moved to globals.css (.hidden-mobile, .show-mobile) */}
    </nav>
  )
}
