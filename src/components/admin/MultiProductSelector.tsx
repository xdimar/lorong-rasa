'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Coffee,
  Search,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'

export interface MenuItemOption {
  id: string
  name: string
  price: number
  category: string
  image_url?: string | null
  is_available?: boolean
}

export interface MultiProductSelectorProps {
  menuItems: MenuItemOption[]
  selectedNames: string[]
  onChange: (names: string[]) => void
}

export function MultiProductSelector({ menuItems, selectedNames, onChange }: MultiProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const inputRef = useRef<HTMLInputElement>(null)

  // Kategori menu dinamis dari database
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach(m => {
      if (m.category) set.add(m.category)
    })
    return ['Semua', ...Array.from(set)]
  }, [menuItems])

  // Filter rekomendasi dari database berdasarkan pencarian & kategori
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return menuItems.filter(item => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory
      const matchQuery = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
      return matchCat && matchQuery
    })
  }, [menuItems, searchQuery, selectedCategory])

  const handleToggleItem = (itemName: string) => {
    const exists = selectedNames.some(n => n.toLowerCase() === itemName.toLowerCase())
    if (exists) {
      onChange(selectedNames.filter(n => n.toLowerCase() !== itemName.toLowerCase()))
    } else {
      onChange([...selectedNames, itemName])
    }
  }

  const handleAddManual = (customName: string) => {
    const trimmed = customName.trim()
    if (!trimmed) return
    const exists = selectedNames.some(n => n.toLowerCase() === trimmed.toLowerCase())
    if (!exists) {
      onChange([...selectedNames, trimmed])
    }
    setSearchQuery('')
  }

  const handleRemove = (nameToRemove: string) => {
    onChange(selectedNames.filter(n => n.toLowerCase() !== nameToRemove.toLowerCase()))
  }

  const handleClearAll = () => {
    onChange([])
    setSearchQuery('')
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
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-inter)' }}>
          <Coffee size={16} /> Pilih Menu Spesifik (Bisa Banyak Menu)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedNames.length > 1 ? (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(147, 51, 234, 0.15)',
              color: '#9333ea',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-inter)',
            }}>
              🎲 {selectedNames.length} Menu (Acak 1 Saat Klaim)
            </span>
          ) : selectedNames.length === 1 ? (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(74, 158, 106, 0.15)',
              color: '#4a9e6a',
              border: '1px solid rgba(74, 158, 106, 0.3)',
              fontFamily: 'var(--font-inter)',
            }}>
              1 Menu Terpilih
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: '#e85a4a', fontWeight: 600, fontFamily: 'var(--font-inter)' }}>
              ⚠️ Belum ada menu dipilih
            </span>
          )}
        </div>
      </div>

      {/* Box Produk-Produk yang Sudah Terpilih */}
      {selectedNames.length > 0 && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-inter)' }}>
              Daftar Produk Terpilih ({selectedNames.length})
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#e85a4a',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                fontFamily: 'var(--font-inter)',
              }}
            >
              Hapus Semua
            </button>
          </div>

          {/* Grid Chip / Kartu Menu Terpilih */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedNames.map(name => {
              const matched = menuItems.find(m => m.name.toLowerCase() === name.toLowerCase())
              return (
                <div
                  key={name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px 4px 6px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {matched?.image_url ? (
                    <img
                      src={matched.image_url}
                      alt={name}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <Coffee size={14} style={{ color: 'var(--color-primary)' }} />
                  )}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                    {name}
                  </span>
                  {matched && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, marginLeft: '2px' }}>
                      (Rp {matched.price.toLocaleString('id-ID')})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#e85a4a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  >
                    <X size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Banner Penjelasan Sistem Random */}
          {selectedNames.length > 1 && (
            <div style={{
              background: 'rgba(147, 51, 234, 0.08)',
              border: '1px solid rgba(147, 51, 234, 0.2)',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '0.74rem',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.4,
              fontFamily: 'var(--font-inter)',
            }}>
              <span style={{ fontSize: '1rem' }}>🎲</span>
              <span>
                <strong>Mode Hadiah Acak:</strong> Setiap pelanggan yang mengklaim voucher ini akan otomatis mendapatkan <strong>1 menu acak</strong> dari {selectedNames.length} pilihan di atas.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bagian Input Pencarian & Pilihan dari Database */}
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
                if (searchQuery.trim()) {
                  handleAddManual(searchQuery)
                }
              }
            }}
            placeholder="Ketik untuk cari atau klik menu di bawah untuk menambahkan..."
            style={{
              width: '100%',
              padding: '0.75rem 2.25rem 0.75rem 2.25rem',
              background: 'var(--color-bg-card)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-inter)',
              fontSize: '0.88rem',
              outline: 'none',
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
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={15} />
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
                  flexShrink: 0,
                  fontFamily: 'var(--font-inter)',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Panel Pilihan Menu Database */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          maxHeight: '260px',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Opsi Tambah Manual jika user mengetik teks */}
          {searchQuery.trim().length > 0 && (
            <div
              onClick={() => handleAddManual(searchQuery)}
              style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(201, 100, 39, 0.08)',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                  Tambahkan Manual: <strong style={{ color: 'var(--color-primary)' }}>&ldquo;{searchQuery.trim()}&rdquo;</strong>
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                + Tambah
              </span>
            </div>
          )}

          {/* List Menu Database */}
          {filteredItems.length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
              Tidak ada menu database yang cocok.
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = selectedNames.some(n => n.toLowerCase() === item.name.toLowerCase())
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleItem(item.name)}
                  style={{
                    padding: '0.55rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--color-border-light)',
                    background: isSelected ? 'rgba(74, 158, 106, 0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover' }}
                        onError={e => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                        <Coffee size={15} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: isSelected ? 700 : 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-inter)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: '6px' }}>
                        <span>{item.category}</span>
                        <span>•</span>
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Rp {item.price.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(74, 158, 106, 0.15)',
                      color: '#4a9e6a',
                      border: '1px solid rgba(74, 158, 106, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      <CheckCircle2 size={12} /> Terpilih
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--color-bg-secondary)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      + Tambah
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
