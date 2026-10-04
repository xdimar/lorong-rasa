'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Coffee, ShoppingCart, Star, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { useFlyToCart } from '@/components/cart/FlyToCartOverlay'
import { MenuReviewModal } from '@/components/menu/MenuReviewModal'
import {
  MenuItem,
  defaultCategories,
  categoryColors,
  defaultMenuItems,
} from '@/lib/constants/menu'

export function MenuSection() {
  const [items, setItems] = useState<MenuItem[]>(defaultMenuItems)
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [activeCategory, setActiveCategory] = useState<string>('Semua')
  const [loading, setLoading] = useState(true)
  const [selectedReviewItem, setSelectedReviewItem] = useState<MenuItem | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [animatingCards, setAnimatingCards] = useState(false)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const { addItem } = useCart()
  const { flyToCart } = useFlyToCart()
  const { showToast } = useToast()

  const handleOrder = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation()
    flyToCart(e, item.image_url)
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      image_url: item.image_url,
    })
    showToast(`${item.name} ditambahkan ke keranjang`, 'cart')
  }

  const handleOpenReviews = (item: MenuItem) => {
    setSelectedReviewItem(item)
    setReviewModalOpen(true)
  }

  const handleCategoryChange = (cat: string) => {
    if (cat === activeCategory) return
    setAnimatingCards(true)
    setTimeout(() => {
      setActiveCategory(cat)
      setAnimatingCards(false)
    }, 220)
  }

  const scrollCategories = (dir: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: dir === 'right' ? 160 : -160, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    const fetchMenuData = async () => {
      try {
        // 1. Ambil data menu aktif langsung dari database Supabase
        const { data: menuData, error: menuErr } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('category')
          .order('name')

        if (isMounted) {
          if (!menuErr && menuData && menuData.length > 0) {
            setItems(menuData)
          } else {
            // Gunakan fallback menu otentik Lorong Rasa
            setItems(defaultMenuItems)
          }
        }

        // 2. Ambil kategori dinamis dari database
        const { data: catData } = await supabase
          .from('menu_categories')
          .select('name')
          .order('name')

        if (isMounted) {
          if (catData && catData.length > 0) {
            const uniqueCats = Array.from<string>(
              new Set(catData.map((c: { name: string }) => c.name).filter((c: string) => c !== 'Semua'))
            )
            setCategories(['Semua', ...uniqueCats])
          } else if (menuData && menuData.length > 0) {
            const itemCats = Array.from<string>(
              new Set(menuData.map((i: MenuItem) => i.category).filter((c: string) => Boolean(c) && c !== 'Semua'))
            )
            setCategories(['Semua', ...itemCats])
          }
        }
      } catch {
        if (isMounted) {
          setItems(defaultMenuItems)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMenuData()

    // 3. Realtime listener: jika ada update menu/harga dari admin, perbarui otomatis
    const channel = supabase
      .channel('home-menu-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          fetchMenuData()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter menu berdasarkan kategori aktif
  const displayedItems = (
    activeCategory === 'Semua'
      ? items.slice(0, 8) // Tampilkan 8 item unggulan di beranda jika Semua
      : items.filter((item) => item.category === activeCategory)
  )

  return (
    <section id="menu" className="section-padding menu-section" style={{ background: 'var(--color-bg-secondary)', position: 'relative' }}>
      <div className="container-custom">
        {/* Header */}
        <AnimateOnScroll animation="fade-up">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <Sparkles size={14} /> Menu Pilihan Lorong Rasa
            </span>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              marginTop: '0.75rem',
              marginBottom: '0.875rem',
            }}>
              Racikan Rasa{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Terbaik
              </span>{' '}
              Hari Ini
            </h2>
            <p style={{
              color: 'var(--color-text-muted)',
              maxWidth: '520px',
              margin: '0 auto',
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.7,
              fontSize: '0.9rem',
            }}>
              Dari kopi lokal single origin, seblak prasmanan gurih pedas, hingga kudapan nikmat. Seluruh hidangan dimasak segar dan siap dipesan.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Category Pills Filter — horizontal scroll di mobile */}
        <AnimateOnScroll animation="fade-up" delay={80}>
          <div className="menu-category-wrapper">
            {/* Scroll arrow kiri (hanya tampil jika ada banyak kategori) */}
            {categories.length > 5 && (
              <button
                className="menu-cat-arrow menu-cat-arrow-left"
                onClick={() => scrollCategories('left')}
                aria-label="Scroll kategori ke kiri"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <div
              ref={categoryScrollRef}
              className="menu-category-scroll"
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`menu-cat-pill${isActive ? ' active' : ''}`}
                    style={{
                      '--cat-active-color': 'var(--color-primary)',
                    } as React.CSSProperties}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {categories.length > 5 && (
              <button
                className="menu-cat-arrow menu-cat-arrow-right"
                onClick={() => scrollCategories('right')}
                aria-label="Scroll kategori ke kanan"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </AnimateOnScroll>

        {/* Menu Grid Content */}
        {loading ? (
          /* Loading Skeleton */
          <div className="menu-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              >
                <div style={{ height: '160px', background: 'var(--color-bg)' }} />
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ height: '14px', background: 'var(--color-bg)', borderRadius: '6px', width: '40%' }} />
                  <div style={{ height: '18px', background: 'var(--color-bg)', borderRadius: '6px', width: '75%' }} />
                  <div style={{ height: '12px', background: 'var(--color-bg)', borderRadius: '6px', width: '90%' }} />
                  <div style={{ height: '32px', background: 'var(--color-bg)', borderRadius: '6px', width: '100%', marginTop: '0.5rem' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Coffee size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Belum ada menu di kategori ini.
            </p>
          </div>
        ) : (
          <div
            className="menu-grid"
            style={{
              opacity: animatingCards ? 0 : 1,
              transform: animatingCards ? 'translateY(12px)' : 'translateY(0)',
              transition: 'opacity 0.22s ease, transform 0.22s ease',
            }}
          >
            {displayedItems.map((item, index) => {
              const color = categoryColors[item.category] || 'var(--color-primary)'
              return (
                <AnimateOnScroll key={item.id} animation="fade-up" delay={index * 50} duration={550}>
                  <div
                    className="menu-card"
                    onClick={() => handleOpenReviews(item)}
                    style={{ '--card-accent': color } as React.CSSProperties}
                  >
                    {/* Media Container */}
                    <div className="menu-card-img-wrap">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="menu-card-img"
                        />
                      ) : (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(135deg, ${color}22, ${color}44)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Coffee size={36} style={{ color, opacity: 0.5 }} />
                        </div>
                      )}

                      {/* Category Badge */}
                      <span className="menu-card-category-badge" style={{ background: color }}>
                        {item.category}
                      </span>

                      {/* Rating Badge */}
                      <div className="menu-card-rating-badge">
                        <Star size={10} fill="#f5a623" color="#f5a623" />
                        <span style={{ color: '#fff' }}>
                          {item.rating_avg && item.rating_avg > 0 ? item.rating_avg.toFixed(1) : '4.9'}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="menu-card-body">
                      <h3 className="menu-card-title">{item.name}</h3>

                      <p className="menu-card-desc">
                        {item.description}
                      </p>

                      {/* Footer: Harga & Tombol Pesan */}
                      <div className="menu-card-footer">
                        <div>
                          <span className="menu-card-price-label">Harga</span>
                          <span className="menu-card-price">
                            Rp {item.price.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleOrder(item, e)}
                          className="btn-primary menu-card-btn"
                        >
                          <ShoppingCart size={12} />
                          Pesan
                        </button>
                      </div>
                    </div>
                  </div>
                </AnimateOnScroll>
              )
            })}
          </div>
        )}

        {/* Navigasi Lihat Seluruh Menu */}
        <AnimateOnScroll animation="fade-up" delay={150}>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link
              href="/menu"
              className="btn-outline"
              style={{
                fontSize: '0.9rem',
                padding: '0.8rem 2rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '50px',
              }}
            >
              Jelajahi Semua Menu ({items.length}+ Menu) <ArrowRight size={16} />
            </Link>
          </div>
        </AnimateOnScroll>
      </div>

      {/* Menu Detail & Reviews Modal */}
      <MenuReviewModal
        item={selectedReviewItem}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />
    </section>
  )
}
