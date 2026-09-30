'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Coffee, Thermometer, Leaf, Zap, ShoppingCart } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'

interface MenuItemData {
  id: string
  name: string
  description: string
  price: number
  category: string
  is_available: boolean
}

const iconMap: Record<string, typeof Coffee> = {
  Signature: Coffee,
  'Cold Brew': Thermometer,
  Herbal: Leaf,
  Espresso: Zap,
  Milk: Coffee,
  'Non Coffee': Coffee,
}

const tagMap: Record<string, { tag: string; tagColor: string }> = {
  'Lorong Espresso': { tag: 'Best Seller', tagColor: '#e8a04a' },
  'Rasa Hitam': { tag: 'New', tagColor: '#4a9e8a' },
  'Serai Tubruk': { tag: 'Favorit', tagColor: '#7a9e4a' },
  'Cortado Ambar': { tag: 'Premium', tagColor: '#9e4a9e' },
  'Coklat Tanah': { tag: 'Hits', tagColor: '#9e6a4a' },
}

// Fallback data if Supabase is unavailable
const fallbackMenuItems: MenuItemData[] = [
  { id: '1', category: 'Signature', name: 'Lorong Espresso', description: 'Espresso pekat dengan crema sempurna, diracik dari biji pilihan Sumatra Mandheling.', price: 32000, is_available: true },
  { id: '2', category: 'Cold Brew', name: 'Rasa Hitam', description: 'Cold brew 18 jam dengan sentuhan karamel gula aren, dingin dan meresap.', price: 38000, is_available: true },
  { id: '3', category: 'Herbal', name: 'Serai Tubruk', description: 'Kopi tubruk tradisional dengan serai segar dan jahe. Hangat dan menenangkan.', price: 25000, is_available: true },
  { id: '4', category: 'Espresso', name: 'Cortado Ambar', description: 'Cortado dengan susu segar dan sedikit madu ambar, sempurna untuk pagi hari.', price: 35000, is_available: true },
  { id: '5', category: 'Milk', name: 'Cappuccino Lorong', description: 'Cappuccino klasik dengan susu full cream, latte art berbentuk daun kopi.', price: 33000, is_available: true },
  { id: '6', category: 'Non Coffee', name: 'Coklat Tanah', description: 'Minuman coklat premium dari kakao asli Sulawesi dengan sentuhan vanilla.', price: 28000, is_available: true },
]

export function MenuSection() {
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(fallbackMenuItems)
  const { addItem, openCart } = useCart()
  const { showToast } = useToast()

  const handleOrder = (item: MenuItemData) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
    })
    showToast(`${item.name} ditambahkan ke keranjang`, 'cart')
    openCart()
  }

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('created_at', { ascending: true })
          .limit(6)
        if (data && data.length > 0) setMenuItems(data)
      } catch {
        // Keep fallback data
      }
    }
    fetchMenu()
  }, [])


  return (
    <section id="menu" className="section-padding" style={{ background: 'var(--color-bg-secondary)' }}>
      <div className="container-custom">
        {/* Header */}
        <AnimateOnScroll animation="fade-up">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              — Menu Kami —
            </span>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginTop: '0.75rem',
              marginBottom: '1rem',
            }}>
              Pilihan{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Terbaik
              </span>{' '}
              Untuk Kamu
            </h2>
            <p style={{
              color: 'var(--color-text-muted)',
              maxWidth: '500px',
              margin: '0 auto',
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.8,
            }}>
              Setiap menu kami diracik dengan bahan-bahan pilihan terbaik dari petani kopi lokal Indonesia.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Menu Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '1.5rem',
        }}>
          {menuItems.map((item, index) => {
            const Icon = iconMap[item.category] || Coffee
            const { tag = '', tagColor = '' } = tagMap[item.name] || {}
            return (
              <AnimateOnScroll key={item.id} animation="fade-up" delay={index * 70}>
                <div
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-6px)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}
                >
                  {/* Background accent */}
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 15px var(--color-primary-glow)',
                    }}>
                      <Icon size={22} color="white" />
                    </div>
                    {tag && (
                      <span style={{
                        background: tagColor + '22',
                        color: tagColor,
                        border: `1px solid ${tagColor}44`,
                        borderRadius: '50px',
                        padding: '3px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {tag}
                      </span>
                    )}
                  </div>

                  {/* Category */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                  }}>
                    {item.category}
                  </div>

                  <h3 style={{
                    fontSize: '1.2rem',
                    marginBottom: '0.6rem',
                    color: 'var(--color-text)',
                  }}>
                    {item.name}
                  </h3>

                  <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.7,
                    marginBottom: '1.25rem',
                    fontFamily: 'var(--font-inter)',
                    flex: 1,
                  }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-playfair)',
                    }}>
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => handleOrder(item)}
                      className="btn-primary"
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <ShoppingCart size={14} />
                      Pesan
                    </button>
                  </div>
                </div>
              </AnimateOnScroll>
            )
          })}
        </div>

        {/* See all */}
        <AnimateOnScroll animation="fade-up" delay={200}>
          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link href="/menu" className="btn-outline" style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}>
              Lihat Semua Menu & Kategori Lengkap →
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
