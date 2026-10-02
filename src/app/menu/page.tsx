'use client'

import { useEffect, useState } from 'react'
import { Search, Coffee, ShoppingCart, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll'
import { useCart } from '@/components/providers/CartProvider'
import { useFlyToCart } from '@/components/cart/FlyToCartOverlay'
import { useToast } from '@/components/providers/ToastProvider'
import { MenuReviewModal } from '@/components/menu/MenuReviewModal'

import {
  MenuItem,
  defaultCategories,
  categoryColors,
  defaultMenuItems,
} from '@/lib/constants/menu'

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [selectedReviewItem, setSelectedReviewItem] = useState<MenuItem | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('category')
          .order('name')

        if (data && data.length > 0) {
          setItems(data)
        } else {
          setItems(defaultMenuItems)
        }

        // Fetch dynamic categories
        const { data: catData } = await supabase.from('menu_categories').select('name').order('name')
        if (catData && catData.length > 0) {
          const uniqueCats = Array.from<string>(new Set(catData.map((c: { name: string }) => c.name).filter((c: string) => c !== 'Semua')))
          setCategories(['Semua', ...uniqueCats])
        } else if (data && data.length > 0) {
          const itemCats = Array.from<string>(new Set(data.map((i: MenuItem) => i.category).filter((c: string) => Boolean(c) && c !== 'Semua')))
          setCategories(['Semua', ...itemCats])
        }
      } catch {
        setItems(defaultMenuItems)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === 'Semua' || item.category === activeCategory
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by category
  const grouped = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '80px' }}>
        {/* Hero Banner */}
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
            background: 'radial-gradient(ellipse at 20% 50%, var(--color-primary-glow) 0%, transparent 60%)',
            pointerEvents: 'none',
          }} />
          <div className="container-custom" style={{ position: 'relative' }}>
            <AnimateOnScroll animation="fade-up">
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <span style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-inter)',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  — Lorong Rasa —
                </span>
                <h1 style={{
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  marginTop: '0.75rem',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-playfair)',
                }}>
                  Menu{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Pilihan Kami
                  </span>
                </h1>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-inter)',
                  maxWidth: '500px',
                  margin: '0 auto',
                  lineHeight: 1.8,
                }}>
                  Temukan cita rasa sempurna dari ratusan pilihan menu yang diracik dengan bahan-bahan terbaik.
                </p>
              </div>
            </AnimateOnScroll>

            {/* Search */}
            <AnimateOnScroll animation="fade-up" delay={100}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                maxWidth: '600px',
                margin: '0 auto',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1.25rem',
                  minWidth: '250px',
                }}>
                  <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari menu, kategori..."
                    style={{
                      flex: 1,
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-inter)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        <div className="container-custom" style={{ padding: 'clamp(1.5rem, 4vw, 3rem) 1rem' }}>
          {/* Category Filter */}
          <AnimateOnScroll animation="fade-up" delay={50}>
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '2.5rem',
              justifyContent: 'center',
            }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.45rem 1.15rem',
                    borderRadius: '50px',
                    border: `2px solid ${activeCategory === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: activeCategory === cat
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                      : 'transparent',
                    color: activeCategory === cat ? 'white' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: activeCategory === cat ? 600 : 400,
                    fontFamily: 'var(--font-inter)',
                    transition: 'all 0.25s ease',
                    boxShadow: activeCategory === cat ? '0 4px 15px var(--color-primary-glow)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategory !== cat) {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.color = 'var(--color-primary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== cat) {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text-muted)'
                    }
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </AnimateOnScroll>

          {/* Content */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}>
                  <div style={{ height: '200px', background: 'var(--color-bg-secondary)' }} />
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ height: '20px', background: 'var(--color-bg-secondary)', borderRadius: '6px', width: '60%' }} />
                    <div style={{ height: '14px', background: 'var(--color-bg-secondary)', borderRadius: '6px', width: '90%' }} />
                    <div style={{ height: '14px', background: 'var(--color-bg-secondary)', borderRadius: '6px', width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
              <Coffee size={56} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
              <h3 style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                Menu tidak ditemukan
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', fontFamily: 'var(--font-inter)' }}>
                Coba kata kunci atau kategori lain
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
              {activeCategory === 'Semua'
                ? Object.entries(grouped).map(([cat, catItems], catIdx) => (
                    <div key={cat}>
                      {/* Category header */}
                      <AnimateOnScroll animation="fade-left" delay={catIdx * 50}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '1.5rem',
                          flexWrap: 'wrap',
                        }}>
                          <div style={{
                            width: '6px',
                            height: '28px',
                            borderRadius: '3px',
                            background: `linear-gradient(180deg, ${categoryColors[cat] || 'var(--color-primary)'}, transparent)`,
                          }} />
                          <h2 style={{
                            fontSize: '1.3rem',
                            fontFamily: 'var(--font-playfair)',
                            color: 'var(--color-text)',
                          }}>
                            {cat}
                          </h2>
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-inter)',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '50px',
                            padding: '2px 10px',
                          }}>
                            {catItems.length} item
                          </span>
                        </div>
                      </AnimateOnScroll>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                        gap: '1.5rem',
                      }}>
                        {catItems.map((item, idx) => (
                          <MenuCard
                            key={item.id}
                            item={item}
                            delay={idx * 80}
                            onOpenReviews={() => {
                              setSelectedReviewItem(item)
                              setReviewModalOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                    gap: '1.5rem',
                  }}>
                    {filtered.map((item, idx) => (
                      <MenuCard
                        key={item.id}
                        item={item}
                        delay={idx * 60}
                        onOpenReviews={() => {
                          setSelectedReviewItem(item)
                          setReviewModalOpen(true)
                        }}
                      />
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      {/* Menu Detail & Reviews Modal */}
      <MenuReviewModal
        item={selectedReviewItem}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />

      <Footer />
    </>
  )
}

function MenuCard({
  item,
  delay,
  onOpenReviews,
}: {
  item: MenuItem
  delay: number
  onOpenReviews: () => void
}) {
  const color = categoryColors[item.category] || 'var(--color-primary)'
  const { addItem } = useCart()
  const { flyToCart } = useFlyToCart()
  const { showToast } = useToast()

  const handleAddToCart = (e: React.MouseEvent) => {
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

  return (
    <AnimateOnScroll animation="fade-up" delay={delay}>
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={onOpenReviews}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)'
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
          e.currentTarget.style.borderColor = color
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.borderColor = 'var(--color-border)'
        }}
      >
        {/* Image */}
        <div style={{
          height: '200px',
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
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s ease',
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
              <Coffee size={48} style={{ color: color, opacity: 0.5 }} />
            </div>
          )}
          {/* Category badge */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: color,
            color: 'white',
            borderRadius: '8px',
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 700,
            fontFamily: 'var(--font-inter)',
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {item.category}
          </div>

          {/* Rating Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenReviews()
            }}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '20px',
              padding: '3px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              zIndex: 2,
            }}
            title="Lihat ulasan pelanggan"
          >
            <Star size={11} style={{ fill: 'var(--color-gold)', color: 'var(--color-gold)' }} />
            <span>{item.rating_avg && item.rating_avg > 0 ? item.rating_avg.toFixed(1) : '4.9'}</span>
            <span style={{ opacity: 0.75, fontSize: '0.65rem' }}>({item.rating_count || 12})</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontFamily: 'var(--font-playfair)',
            color: 'var(--color-text)',
            marginBottom: '0.4rem',
          }}>
            {item.name}
          </h3>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-inter)',
            lineHeight: 1.7,
            flex: 1,
            marginBottom: '1rem',
          }}>
            {item.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <span style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              fontFamily: 'var(--font-playfair)',
              color: color,
            }}>
              Rp {item.price.toLocaleString('id-ID')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenReviews()
                }}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-muted)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.65rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                Ulasan
              </button>
              <button
                onClick={handleAddToCart}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-inter)',
                  transition: 'all 0.2s ease',
                  boxShadow: `0 4px 12px ${color}44`,
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <ShoppingCart size={14} />
                Pesan
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  )
}
