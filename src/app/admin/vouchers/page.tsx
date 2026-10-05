'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  Percent,
  Gift,
  QrCode,
  Share2,
  Copy,
  Check,
  Coffee,
  Package,
  Search,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

type DiscountType = 'percentage' | 'fixed' | 'product'

interface Voucher {
  id: string
  code: string
  description: string
  discount_type: DiscountType
  discount_value: number
  product_name: string | null
  product_menu_item_id: string | null
  share_token: string | null
  min_order: number
  max_uses: number
  current_uses: number
  expires_at: string
  is_active: boolean
  created_at: string
}

interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  image_url?: string | null
  is_available?: boolean
}

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: 10,
  product_name: '',
  product_menu_item_id: '',
  min_order: 0,
  max_uses: 100,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  is_active: true,
}

interface ProductSelectorProps {
  menuItems: MenuItem[]
  selectedId: string
  selectedName: string
  onSelect: (item: { id: string; name: string }) => void
}

function ProductSelector({ menuItems, selectedId, selectedName, onSelect }: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cari item database yang cocok jika ada
  const currentDbItem = useMemo(() => {
    if (selectedId) {
      return menuItems.find(m => m.id === selectedId) || null
    }
    if (selectedName) {
      return menuItems.find(m => m.name.toLowerCase() === selectedName.toLowerCase()) || null
    }
    return null
  }, [menuItems, selectedId, selectedName])

  const hasSelection = Boolean(selectedId || selectedName)

  // Kategori menu dinamis
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach(m => {
      if (m.category) set.add(m.category)
    })
    return ['Semua', ...Array.from(set)]
  }, [menuItems])

  // Filter rekomendasi dari database
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory
      const matchQuery = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      return matchCat && matchQuery
    })
  }, [menuItems, searchQuery, selectedCategory])

  const handlePickDbItem = (item: MenuItem) => {
    onSelect({ id: item.id, name: item.name })
    setIsEditing(false)
    setSearchQuery('')
  }

  const handlePickManual = (customName: string) => {
    const trimmed = customName.trim()
    if (!trimmed) return
    const matched = menuItems.find(m => m.name.toLowerCase() === trimmed.toLowerCase())
    if (matched) {
      onSelect({ id: matched.id, name: matched.name })
    } else {
      onSelect({ id: '', name: trimmed })
    }
    setIsEditing(false)
    setSearchQuery('')
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setSearchQuery(selectedName || '')
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }

  const handleClear = () => {
    onSelect({ id: '', name: '' })
    setIsEditing(true)
    setSearchQuery('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>
          <Coffee size={15} /> Produk Spesifik yang Didiskon
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
          Pilih Database / Ketik Manual
        </span>
      </div>

      {/* Tampilan 1: Menu Sudah Terpilih & Tidak Sedang Diedit */}
      {hasSelection && !isEditing ? (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {currentDbItem?.image_url ? (
              <img
                src={currentDbItem.image_url}
                alt={selectedName}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid var(--color-border)',
                }}
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '8px',
                background: 'var(--color-primary-glow)',
                border: '1px solid rgba(201, 100, 39, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}>
                <Coffee size={22} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'var(--font-inter)',
              }}>
                {selectedName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                {currentDbItem ? (
                  <>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(74, 158, 106, 0.12)',
                      color: '#4a9e6a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      <CheckCircle2 size={11} /> Menu Database
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, fontFamily: 'var(--font-inter)' }}>
                      {currentDbItem.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>•</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
                      Rp {currentDbItem.price.toLocaleString('id-ID')}
                    </span>
                  </>
                ) : (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(147, 51, 234, 0.12)',
                    color: '#9333ea',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontFamily: 'var(--font-inter)',
                  }}>
                    ✏️ Nama Manual / Kustom
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleStartEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-inter)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.color = 'var(--color-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
            >
              <Pencil size={12} /> Ganti
            </button>
            <button
              type="button"
              onClick={handleClear}
              title="Hapus pilihan"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#e85a4a'
                e.currentTarget.style.color = '#e85a4a'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Tampilan 2: Input Pencarian & Rekomendasi Menu */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Kolom Pencarian */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filteredItems.length > 0) {
                    handlePickDbItem(filteredItems[0])
                  } else if (searchQuery.trim()) {
                    handlePickManual(searchQuery)
                  }
                }
              }}
              placeholder="Cari menu database atau ketik menu manual..."
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 2.25rem',
                background: 'var(--color-bg-card)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)'
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-glow)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: hasSelection ? '56px' : '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
            {hasSelection && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  fontFamily: 'var(--font-inter)',
                }}
              >
                Batal
              </button>
            )}
          </div>

          {/* Quick Filter Kategori */}
          <div style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}>
            {categories.map(cat => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: active ? 'var(--color-primary)' : 'var(--color-bg-card)',
                    color: active ? '#ffffff' : 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Panel Rekomendasi Menu */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            maxHeight: '260px',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Rekomendasi 1: Opsi teks manual sesuai yang diketik */}
            {searchQuery.trim().length > 0 && (
              <div
                onClick={() => handlePickManual(searchQuery)}
                style={{
                  padding: '0.7rem 0.85rem',
                  background: 'rgba(201, 100, 39, 0.08)',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201, 100, 39, 0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(201, 100, 39, 0.08)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Sparkles size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-inter)' }}>
                      Gunakan Input Manual: <strong style={{ color: 'var(--color-primary)' }}>&ldquo;{searchQuery.trim()}&rdquo;</strong>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                      Terapkan diskon untuk menu apapun yang mengandung kata ini di keranjang
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  fontFamily: 'var(--font-inter)',
                }}>
                  + Pilih Manual
                </span>
              </div>
            )}

            {/* Header List Rekomendasi Database */}
            <div style={{
              padding: '0.4rem 0.85rem',
              background: 'var(--color-bg-secondary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-inter)',
            }}>
              <span>Rekomendasi dari Database</span>
              <span>{filteredItems.length} menu</span>
            </div>

            {/* List Menu Database */}
            {filteredItems.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <Coffee size={28} style={{ color: 'var(--color-text-muted)', margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontFamily: 'var(--font-inter)' }}>
                  Tidak ada menu database yang cocok dengan &ldquo;{searchQuery}&rdquo;.
                </div>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handlePickManual(searchQuery)}
                    className="btn-primary"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', margin: '0 auto' }}
                  >
                    <Sparkles size={13} /> Gunakan &ldquo;{searchQuery.trim()}&rdquo; sebagai Nama Manual
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handlePickDbItem(item)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid var(--color-border)',
                        }}
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '6px',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary)',
                        flexShrink: 0,
                      }}>
                        <Coffee size={16} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                        <span>{item.category}</span>
                        <span>•</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>
                        {item.is_available === false && (
                          <span style={{ color: '#e85a4a', fontWeight: 600 }}>(Habis)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-inter)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.color = 'var(--color-primary)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)'
                      e.currentTarget.style.color = 'var(--color-text)'
                    }}
                  >
                    Pilih
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PaperVoucherCard({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin)
    }
  }, [])

  const effectiveSiteUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://lorong-rasa.my.id'
  const shareIdentifier = voucher.share_token || voucher.code
  const shareUrl = `${effectiveSiteUrl}/voucher/${shareIdentifier}`
  // QR Code langsung mengarah ke URL klaim otomatis di smartphone
  const qrValue = `${effectiveSiteUrl}/voucher/${shareIdentifier}?scan=1`

  const discountLabel =
    voucher.discount_type === 'percentage'
      ? `${voucher.discount_value}%`
      : voucher.discount_type === 'fixed'
      ? `Rp ${voucher.discount_value.toLocaleString('id-ID')}`
      : `${voucher.discount_value}% — ${voucher.product_name || 'Produk Spesifik'}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    const text = `🎉 *Voucher Spesial Lorong Rasa!*\n\n` +
      `Kode: *${voucher.code}*\n` +
      `Diskon: *${discountLabel}*\n` +
      `${voucher.product_name ? `Berlaku untuk: *${voucher.product_name}*\n` : ''}` +
      `Min. order: *Rp ${voucher.min_order.toLocaleString('id-ID')}*\n` +
      `Berlaku hingga: *${new Date(voucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n` +
      `Klaim sekarang 👉 ${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleShareInstagram = () => {
    navigator.clipboard.writeText(
      `✨ Dapatkan diskon ${discountLabel} di Lorong Rasa!\n\nKode voucher: ${voucher.code}\nKlaim di: ${shareUrl}\n\n#LorongRasa #SpecialtyCoffee #WajakMalang #KopiLokal`
    )
    alert('Caption Instagram telah disalin! Buka Instagram Stories atau feed untuk paste caption.')
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '-48px', right: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>

        {/* === PAPER VOUCHER CARD === */}
        <div style={{ background: '#faf8f5', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)', position: 'relative' }}>
          {/* Top colored strip */}
          <div style={{ background: 'linear-gradient(135deg, #c96427, #d4a04a)', padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '2px' }}>
                  LORONG RASA OFFICIAL VOUCHER
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  {voucher.discount_type === 'product' ? 'Diskon Produk Spesifik' : voucher.discount_type === 'percentage' ? 'Voucher Diskon Persen' : 'Voucher Potongan Harga'}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={20} color="white" />
              </div>
            </div>
          </div>

          {/* Perforation holes */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', margin: '0 -1px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.82)', flexShrink: 0, marginLeft: '-12px' }} />
            <div style={{ flex: 1, borderTop: '2px dashed #e0d8d0', margin: '0 8px' }} />
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.82)', flexShrink: 0, marginRight: '-12px' }} />
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem', alignItems: 'center', background: '#faf8f5' }}>
            {/* Left info */}
            <div>
              <div style={{ fontSize: '0.65rem', color: '#9b8e82', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Diskon</div>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#c96427', fontFamily: 'Georgia, serif', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                {voucher.discount_type === 'percentage'
                  ? `${voucher.discount_value}%`
                  : voucher.discount_type === 'fixed'
                  ? `Rp${(voucher.discount_value / 1000).toFixed(0)}rb`
                  : `${voucher.discount_value}% OFF`}
              </div>
              {voucher.product_name && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0ebe6', border: '1px solid #e0d8d0', borderRadius: '6px', padding: '3px 8px', fontSize: '0.72rem', color: '#7a6a5a', fontWeight: 600, marginBottom: '8px' }}>
                  <Coffee size={11} />
                  {voucher.product_name}
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#9b8e82', marginBottom: '2px' }}>Min. order: Rp {voucher.min_order.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.75rem', color: '#9b8e82' }}>Berlaku s/d: {new Date(voucher.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>

              {/* Voucher code */}
              <div style={{ marginTop: '12px', background: '#f0ebe6', border: '1.5px dashed #c96427', borderRadius: '8px', padding: '6px 12px', display: 'inline-block' }}>
                <div style={{ fontSize: '0.6rem', color: '#9b8e82', letterSpacing: '0.08em', marginBottom: '1px' }}>KODE VOUCHER</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#c96427', letterSpacing: '0.14em' }}>{voucher.code}</div>
              </div>
            </div>

            {/* Right QR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ background: 'white', borderRadius: '10px', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e0d8d0' }}>
                <QRCodeSVG
                  value={qrValue}
                  size={110}
                  bgColor="#ffffff"
                  fgColor="#2c1a0e"
                  level="H"
                  imageSettings={{
                    src: '/favicon.ico',
                    x: undefined,
                    y: undefined,
                    height: 20,
                    width: 20,
                    excavate: true,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.6rem', color: '#9b8e82', textAlign: 'center', fontWeight: 600, letterSpacing: '0.06em' }}>SCAN TO REDEEM</div>
            </div>
          </div>

          {/* Bottom strip */}
          <div style={{ background: '#f0ebe6', borderTop: '1px solid #e0d8d0', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.65rem', color: '#9b8e82', fontFamily: 'monospace' }}>lorong-rasa.my.id</div>
            <div style={{ fontSize: '0.65rem', color: '#9b8e82' }}>Sisa kuota: {voucher.max_uses - voucher.current_uses}/{voucher.max_uses}</div>
          </div>
        </div>

        {/* === Share Actions === */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '1.1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>Bagikan ke Media Sosial</div>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopyLink}
              style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: copied ? 'rgba(74,158,106,0.2)' : 'rgba(255,255,255,0.08)', border: `1px solid ${copied ? 'rgba(74,158,106,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', padding: '0.6rem 1rem', color: copied ? '#4a9e6a' : 'rgba(255,255,255,0.85)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-inter)' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Tersalin!' : 'Salin Link'}
            </button>
            <button
              onClick={handleShareWhatsApp}
              style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '10px', padding: '0.6rem 1rem', color: '#25D366', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-inter)' }}
            >
              <Share2 size={14} />WhatsApp
            </button>
            <button
              onClick={handleShareInstagram}
              style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(225,48,108,0.12)', border: '1px solid rgba(225,48,108,0.25)', borderRadius: '10px', padding: '0.6rem 1rem', color: '#e1306c', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-inter)' }}
            >
              <Share2 size={14} />Instagram
            </button>
          </div>
          <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>
            {shareUrl}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [paperModal, setPaperModal] = useState<Voucher | null>(null)

  const supabase = createClient()

  const fetchData = async () => {
    const [{ data: vData }, { data: mData }] = await Promise.all([
      supabase.from('vouchers').select('*').order('created_at', { ascending: false }),
      supabase.from('menu_items').select('id,name,price,category,image_url,is_available').order('name'),
    ])
    if (vData) setVouchers(vData)
    if (mData) setMenuItems(mData)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    let finalMenuItemId = form.product_menu_item_id
    const finalProductName = form.product_name?.trim() || null

    if (form.discount_type === 'product') {
      if (!finalProductName) {
        setError('Harap pilih menu dari database atau ketik nama produk manual.')
        setSubmitting(false)
        return
      }
      // Jika ketik nama manual tapi namanya persis ada di database, hubungkan ID otomatis
      if (!finalMenuItemId && finalProductName) {
        const matched = menuItems.find(m => m.name.toLowerCase() === finalProductName.toLowerCase())
        if (matched) {
          finalMenuItemId = matched.id
        }
      }
    }

    const shareToken = Math.random().toString(36).substring(2, 14)
    const payload: Record<string, unknown> = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order: form.discount_type === 'product' ? 0 : form.min_order,
      max_uses: form.max_uses,
      expires_at: form.expires_at.includes('T')
        ? new Date(form.expires_at).toISOString()
        : new Date(`${form.expires_at}T23:59:59.999Z`).toISOString(),
      is_active: form.is_active,
      product_name: form.discount_type === 'product' ? finalProductName : null,
      product_menu_item_id: form.discount_type === 'product' && finalMenuItemId ? finalMenuItemId : null,
    }

    let result
    if (editingId) {
      result = await supabase.from('vouchers').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('vouchers').insert({ ...payload, current_uses: 0, share_token: shareToken })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchData()
    }
    setSubmitting(false)
  }

  const handleEdit = (v: Voucher) => {
    setForm({
      code: v.code,
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      product_name: v.product_name || '',
      product_menu_item_id: v.product_menu_item_id || '',
      min_order: v.min_order,
      max_uses: v.max_uses,
      expires_at: v.expires_at.split('T')[0],
      is_active: v.is_active,
    })
    setEditingId(v.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('vouchers').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchData()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('vouchers').update({ is_active: !current }).eq('id', id)
    fetchData()
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
    fontFamily: 'var(--font-inter)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
  }
  const labelStyle = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--color-text-secondary)', marginBottom: '6px',
    fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }

  const DISCOUNT_TYPES = [
    { key: 'percentage' as DiscountType, label: 'Persentase (%)', icon: Percent, desc: 'Diskon % dari total order' },
    { key: 'fixed' as DiscountType, label: 'Nominal (Rp)', icon: Gift, desc: 'Potongan harga tetap' },
    { key: 'product' as DiscountType, label: 'Produk Spesifik', icon: Coffee, desc: 'Diskon pada menu tertentu' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Manajemen Voucher</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            Buat voucher diskon persentase, nominal, atau produk spesifik
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
          className="btn-primary"
        >
          <Plus size={18} />Buat Voucher
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'clamp(1.25rem, 4vw, 2rem)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingId ? 'Edit Voucher' : 'Buat Voucher Baru'}</h2>
              <button onClick={() => { setShowForm(false); setError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: '#e85a4a15', border: '1px solid #e85a4a44', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#e85a4a', fontFamily: 'var(--font-inter)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Kode */}
              <div>
                <label style={labelStyle}>Kode Voucher</label>
                <input style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="CONTOH10" required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label style={labelStyle}>Deskripsi</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi voucher untuk pelanggan" required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Tipe Diskon — 3 pilihan */}
              <div>
                <label style={labelStyle}>Tipe Diskon</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                  {DISCOUNT_TYPES.map(({ key, label, icon: Icon, desc }) => (
                    <button key={key} type="button" onClick={() => setForm({ ...form, discount_type: key })}
                      style={{ padding: '0.85rem 0.65rem', borderRadius: 'var(--radius-md)', border: `2px solid ${form.discount_type === key ? 'var(--color-primary)' : 'var(--color-border)'}`, background: form.discount_type === key ? 'var(--color-primary-glow)' : 'transparent', color: form.discount_type === key ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', textAlign: 'center' }}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 400, opacity: 0.7, lineHeight: 1.3 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product fields (only when discount_type = product) */}
              {form.discount_type === 'product' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Selector Interaktif Database & Rekomendasi Manual */}
                  <ProductSelector
                    menuItems={menuItems}
                    selectedId={form.product_menu_item_id}
                    selectedName={form.product_name}
                    onSelect={item => {
                      setForm(prev => ({
                        ...prev,
                        product_menu_item_id: item.id,
                        product_name: item.name,
                      }))
                    }}
                  />

                  {/* Persentase Diskon Produk (%) */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Persentase Diskon Produk (%)</label>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: form.discount_value === 100 ? '#4a9e6a' : 'var(--color-primary)', fontFamily: 'var(--font-inter)' }}>
                        {form.discount_value === 100 ? '🎁 PRODUK GRATIS (100%)' : `${form.discount_value}% Diskon`}
                      </span>
                    </div>

                    {/* Quick presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
                      {[
                        { val: 10, label: '10%' },
                        { val: 20, label: '20%' },
                        { val: 50, label: '50% (Separuh)' },
                        { val: 100, label: '100% (Gratis)' },
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setForm({ ...form, discount_value: preset.val })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${form.discount_value === preset.val ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: form.discount_value === preset.val ? 'var(--color-primary-glow)' : 'var(--color-bg-card)',
                            color: form.discount_value === preset.val ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s',
                            fontFamily: 'var(--font-inter)',
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="number"
                      style={inputStyle}
                      value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                      min={1}
                      max={100}
                      required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', fontFamily: 'var(--font-inter)' }}>
                      {form.discount_value === 100
                        ? '✨ 100% = Produk Gratis! Pelanggan mendapatkan menu ini secara cuma-cuma saat checkout.'
                        : `${form.discount_value}% = Potongan harga sebesar ${form.discount_value}% untuk menu ${form.product_name || 'terpilih'}.`}
                    </div>
                  </div>
                </div>
              )}

              {/* Diskon Value + Min Order (untuk non-product) */}
              {form.discount_type !== 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Nilai Diskon {form.discount_type === 'percentage' ? '(%)' : '(Rp)'}</label>
                    <input type="number" style={inputStyle} value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                      min={1} max={form.discount_type === 'percentage' ? 100 : undefined} required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Min. Order (Rp)</label>
                    <input type="number" style={inputStyle} value={form.min_order}
                      onChange={e => setForm({ ...form, min_order: Number(e.target.value) })}
                      min={0} required
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    />
                  </div>
                </div>
              )}

              {/* Max Uses & Expires */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Maks. Penggunaan</label>
                  <input type="number" style={inputStyle} value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })}
                    min={1} required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tanggal Kadaluarsa</label>
                  <input type="date" style={inputStyle} value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })} required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{ width: '48px', height: '26px', borderRadius: '13px', background: form.is_active ? 'var(--color-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: '3px', left: form.is_active ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
                  Voucher {form.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Buat Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vouchers Table */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>Memuat voucher...</div>
          ) : vouchers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Tag size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.5rem' }}>Belum ada voucher.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} />Buat Voucher</button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Kode', 'Tipe & Diskon', 'Produk', 'Min. Order', 'Kuota', 'Status', 'Kadaluarsa', 'Aksi'].map(col => (
                    <th key={col} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <code style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '6px' }}>{v.code}</code>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                          background: v.discount_type === 'percentage' ? 'rgba(74,158,106,0.12)' : v.discount_type === 'fixed' ? 'rgba(201,100,39,0.12)' : 'rgba(147,51,234,0.12)',
                          color: v.discount_type === 'percentage' ? '#4a9e6a' : v.discount_type === 'fixed' ? 'var(--color-primary)' : '#9333ea',
                          textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {v.discount_type === 'percentage' ? '%' : v.discount_type === 'fixed' ? 'Rp' : 'Produk'}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-inter)' }}>
                          {v.discount_type === 'percentage' ? `${v.discount_value}%` : v.discount_type === 'fixed' ? `Rp ${v.discount_value.toLocaleString('id-ID')}` : `${v.discount_value}%`}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', maxWidth: '160px' }}>
                      {v.product_name ? (
                        <span style={{ fontSize: '0.8rem', color: '#9333ea', background: 'rgba(147,51,234,0.08)', border: '1px solid rgba(147,51,234,0.2)', borderRadius: '6px', padding: '2px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Coffee size={11} />{v.product_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Semua produk</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {v.min_order > 0 ? `Rp ${v.min_order.toLocaleString('id-ID')}` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>{v.current_uses}/{v.max_uses}</span>
                        <div style={{ width: '50px', height: '4px', background: 'var(--color-border)', borderRadius: '2px' }}>
                          <div style={{ width: `${Math.min((v.current_uses / v.max_uses) * 100, 100)}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <button onClick={() => toggleActive(v.id, v.is_active)}
                        style={{ background: v.is_active ? '#4a9e6a22' : '#e85a4a22', color: v.is_active ? '#4a9e6a' : '#e85a4a', border: `1px solid ${v.is_active ? '#4a9e6a44' : '#e85a4a44'}`, borderRadius: '50px', padding: '3px 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-inter)', transition: 'all 0.2s' }}>
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {new Date(v.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleEdit(v)} title="Edit" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setPaperModal(v)} title="QR & Share" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                          <QrCode size={13} />
                        </button>
                        {deleteConfirm === v.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => handleDelete(v.id)} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', background: '#e85a4a', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>Ya</button>
                            <button onClick={() => setDeleteConfirm(null)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(v.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#e85a4a'; e.currentTarget.style.color = '#e85a4a' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Paper Voucher Modal with QR & Share */}
      {paperModal && <PaperVoucherCard voucher={paperModal} onClose={() => setPaperModal(null)} />}
    </div>
  )
}
