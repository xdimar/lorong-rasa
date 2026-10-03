'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Coffee, ShoppingCart, Star, Sparkles, ArrowRight, Eye } from 'lucide-react'
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
    <section id="menu" className="section-padding" style={{ background: 'var(--color-bg-secondary)', position: 'relative' }}>
      <div className="container-custom">
        {/* Header */}
        <AnimateOnScroll animation="fade-up">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginTop: '0.75rem',
              marginBottom: '1rem',
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
              maxWidth: '560px',
              margin: '0 auto',
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.8,
              fontSize: '0.95rem',
            }}>
              Dari kopi lokal single origin, seblak prasmanan gurih pedas, hingga kudapan nikmat. Seluruh hidangan dimasak segar dan siap dipesan.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Category Pills Filter */}
        <AnimateOnScroll animation="fade-up" delay={80}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            marginBottom: '2.5rem',
            justifyContent: 'center',
          }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.45rem 1.25rem',
                    borderRadius: '50px',
                    border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isActive
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                      : 'var(--color-bg-card)',
                    color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: 'var(--font-inter)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? '0 4px 15px var(--color-primary-glow)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.color = 'var(--color-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </AnimateOnScroll>

        {/* Menu Grid Content */}
        {loading ? (
          /* Loading Skeleton */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
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
                <div style={{ height: '190px', background: 'var(--color-bg)' }} />
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ height: '16px', background: 'var(--color-bg)', borderRadius: '6px', width: '40%' }} />
                  <div style={{ height: '20px', background: 'var(--color-bg)', borderRadius: '6px', width: '75%' }} />
                  <div style={{ height: '14px', background: 'var(--color-bg)', borderRadius: '6px', width: '90%' }} />
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.5rem',
          }}>
            {displayedItems.map((item, index) => {
              const color = categoryColors[item.category] || 'var(--color-primary)'
              return (
                <AnimateOnScroll key={item.id} animation="fade-up" delay={index * 60}>
                  <div
                    style={{
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      transition: 'all 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onClick={() => handleOpenReviews(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
                      e.currentTarget.style.borderColor = color
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                    }}
                  >
                    {/* Media Container */}
                    <div style={{
                      height: '190px',
                      backgroundColor: '#171412',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.06)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
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
                          <Coffee size={44} style={{ color, opacity: 0.5 }} />
                        </div>
                      )}

                      {/* Category Badge */}
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: color,
                        color: 'white',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-inter)',
                        letterSpacing: '0.04em',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}>
                        {item.category}
                      </span>

                      {/* Rating Badge / Modal Trigger */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '50px',
                          padding: '3px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#f5a623',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-inter)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Star size={11} fill="#f5a623" color="#f5a623" />
                        <span style={{ color: '#fff' }}>
                          {item.rating_avg && item.rating_avg > 0 ? item.rating_avg.toFixed(1) : '4.9'}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }}>
                      <h3 style={{
                        fontSize: '1.15rem',
                        marginBottom: '0.45rem',
                        color: 'var(--color-text)',
                        fontWeight: 700,
                        fontFamily: 'var(--font-playfair)',
                      }}>
                        {item.name}
                      </h3>

                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.6,
                        marginBottom: '1.25rem',
                        fontFamily: 'var(--font-inter)',
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.description}
                      </p>

                      {/* Footer: Harga & Tombol Pesan */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--color-border)',
                      }}>
                        <div>
                          <span style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-inter)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            Harga
                          </span>
                          <span style={{
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            fontFamily: 'var(--font-playfair)',
                          }}>
                            Rp {item.price.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleOrder(item, e)}
                          className="btn-primary"
                          style={{
                            padding: '0.45rem 1rem',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                          }}
                        >
                          <ShoppingCart size={13} />
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
          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <Link
              href="/menu"
              className="btn-outline"
              style={{
                fontSize: '0.95rem',
                padding: '0.85rem 2.25rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '50px',
              }}
            >
              Jelajahi Semua Menu & Kategori Lengkap ({items.length}+ Menu) <ArrowRight size={16} />
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
