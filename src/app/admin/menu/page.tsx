'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Coffee, Upload, ImageIcon, FolderPlus, AlertCircle, Crop, Maximize2, Minimize2, Sliders, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ImageAdjustModal } from '@/components/admin/ImageAdjustModal'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number // Harga Jual Konsumen
  cost_price?: number // Harga Modal (HPP)
  category: string
  image_url: string | null
  is_available: boolean
  created_at: string
}

const defaultCategories = [
  'Makanan Berat',
  'Snack',
  'Milky Series',
  'Renceng Series',
  'Lokal Series',
  'Tea Series',
  'Coffee Series',
  'Mocktail Series',
]
const emptyForm = {
  name: '',
  description: '',
  price: 0,
  cost_price: 0,
  category: 'Makanan Berat',
  is_available: true,
  image_url: null as string | null
}

export default function MenuAdminPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState('')
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('Semua')
  const [uploading, setUploading] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'cashier'>('admin')
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [imageToAdjust, setImageToAdjust] = useState<string | null>(null)
  const [previewFitMode, setPreviewFitMode] = useState<'cover' | 'contain'>('cover')
  const fileRef = useRef<HTMLInputElement>(null)

  // Stable client — prevents re-instantiation on every render
  const supabase = useMemo(() => createClient(), [])

  // Returns the public URL of the uploaded image, or null on failure.
  // Supports File, Blob, and base64 DataURL (processed by dynamic cropper).
  // Also handles deletion of the previous image from Storage.
  const uploadImage = useCallback(async (input: File | Blob | string, prevUrl?: string | null): Promise<string | null> => {
    setUploading(true)
    setUploadMessage('')
    setUploadProgress(15)

    try {
      let blob: Blob
      let fileName: string

      if (typeof input === 'string') {
        if (input.startsWith('data:')) {
          // Convert base64 dataUrl from canvas to Blob
          const parts = input.split(';base64,')
          const contentType = parts[0].split(':')[1] || 'image/jpeg'
          const raw = atob(parts[1])
          const rawLength = raw.length
          const uInt8Array = new Uint8Array(rawLength)
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i)
          }
          blob = new Blob([uInt8Array], { type: contentType })
          fileName = `menu/${crypto.randomUUID()}.jpg`
        } else {
          // Normal HTTP/HTTPS URL
          setUploading(false)
          return input
        }
      } else {
        blob = input
        const ext = (input instanceof File ? input.name.split('.').pop() : 'jpg') ?? 'jpg'
        fileName = `menu/${crypto.randomUUID()}.${ext}`
      }

      setUploadProgress(40)

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(fileName, blob, { cacheControl: '3600', upsert: false })

      setUploadProgress(80)

      if (error || !data) {
        console.warn('Supabase storage upload fallback to optimized data URL:', error?.message)
        if (typeof input === 'string') {
          setUploading(false)
          setUploadProgress(null)
          setUploadMessage('✓ Foto disesuaikan & disimpan.')
          return input
        }
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            setUploading(false)
            setUploadProgress(null)
            setUploadMessage('✓ Foto disesuaikan & disimpan.')
            resolve(reader.result as string)
          }
          reader.readAsDataURL(blob)
        })
      }

      // Delete previous Storage object to prevent orphaned files
      if (prevUrl && prevUrl.includes('menu-images')) {
        try {
          const pathMatch = prevUrl.match(/menu-images\/(.+)$/)
          if (pathMatch?.[1]) {
            await supabase.storage.from('menu-images').remove([pathMatch[1]])
          }
        } catch {
          // Non-fatal
        }
      }

      const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(data.path)
      setUploadProgress(100)
      setUploadMessage('✓ Foto berhasil diunggah & disesuaikan!')
      return urlData.publicUrl
    } catch (err) {
      console.error('Error uploading image:', err)
      setUploadMessage('Gagal mengunggah foto.')
      return null
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }, [supabase])

  const fetchItems = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('category').order('name')
    if (data) setItems(data)
    setLoading(false)
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('name')
        .order('name')

      if (!error && data && data.length > 0) {
        setCategories(data.map((d: { name: string }) => d.name))
      } else {
        // Fallback: collect distinct categories from menu_items and defaultCategories
        const { data: menuData } = await supabase.from('menu_items').select('category')
        if (menuData) {
          const distinct = Array.from(new Set([...defaultCategories, ...menuData.map((m: { category?: string }) => m.category).filter(Boolean)]))
          setCategories(distinct as string[])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCatName.trim()
    if (!name) return

    if (name.toLowerCase() === 'semua') {
      setCatError("Nama 'Semua' adalah filter bawaan sistem dan tidak dapat digunakan sebagai nama kategori.")
      return
    }

    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      setCatError('Kategori dengan nama ini sudah ada.')
      return
    }

    setCatLoading(true)
    setCatError('')
    try {
      const { error } = await supabase
        .from('menu_categories')
        .insert({ name })

      if (error) {
        console.warn('DB category insert note:', error.message)
      }

      setCategories(prev => [...prev, name])
      setNewCatName('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menambahkan kategori.'
      setCatError(message)
    } finally {
      setCatLoading(false)
    }
  }

  const handleDeleteCategory = async (catName: string) => {
    const count = items.filter(i => i.category === catName).length
    if (count > 0) {
      setCatError(`Kategori "${catName}" masih digunakan oleh ${count} menu. Silakan ubah atau hapus menu tersebut terlebih dahulu sebelum menghapus kategori ini.`)
      return
    }

    setCatLoading(true)
    setCatError('')
    try {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('name', catName)

      if (error) {
        console.warn('DB category delete note:', error.message)
      }

      setCategories(prev => prev.filter(c => c !== catName))
      if (filterCat === catName) setFilterCat('Semua')
      if (form.category === catName) {
        setForm(prev => ({ ...prev, category: categories.find(c => c !== catName) || 'Signature' }))
      }
      setDeleteCatConfirm(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus kategori.'
      setCatError(message)
    } finally {
      setCatLoading(false)
    }
  }

  useEffect(() => {
    const initData = async () => {
      fetchItems()
      fetchCategories()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (profile?.role) {
            setUserRole(profile.role as 'admin' | 'cashier')
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    initData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      cost_price: Number(form.cost_price || 0),
      category: form.category,
      is_available: form.is_available,
      image_url: form.image_url,
    }

    let result
    if (editingId) {
      result = await supabase.from('menu_items').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('menu_items').insert(payload)
    }

    if (result.error) {
      // If cost_price column does not exist on remote db yet, fallback without it
      if (result.error.message.includes('cost_price') || result.error.message.includes('column')) {
        const { cost_price: _removed, ...fallbackPayload } = payload
        const fallbackRes = editingId
          ? await supabase.from('menu_items').update(fallbackPayload).eq('id', editingId)
          : await supabase.from('menu_items').insert(fallbackPayload)
        if (fallbackRes.error) {
          setError(fallbackRes.error.message)
        } else {
          setShowForm(false)
          setEditingId(null)
          setForm(emptyForm)
          fetchItems()
        }
      } else {
        setError(result.error.message)
      }
    } else {
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchItems()
    }
    setSubmitting(false)
  }

  const handleEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      cost_price: item.cost_price || 0,
      category: item.category,
      is_available: item.is_available,
      image_url: item.image_url,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id)
    setDeleteConfirm(null)
    fetchItems()
  }

  const toggleAvailable = async (id: string, current: boolean) => {
    await supabase.from('menu_items').update({ is_available: !current }).eq('id', id)
    fetchItems()
  }

  const filtered = filterCat === 'Semua' ? items : items.filter(i => i.category === filterCat)

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-inter)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
            {userRole === 'cashier' ? 'Ketersediaan Stok Menu' : 'Manajemen Menu'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            {userRole === 'cashier'
              ? 'Panel Kasir: Klik tombol status untuk mengubah status menu (Tersedia / Habis)'
              : 'Kelola item menu, harga, dan ketersediaan coffee shop kamu'}
          </p>
        </div>
        {userRole === 'admin' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowCatModal(true); setCatError('') }}
              className="btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <FolderPlus size={16} />
              Kelola Kategori
            </button>
            <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }} className="btn-primary">
              <Plus size={18} />
              Tambah Menu
            </button>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        {['Semua', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '50px',
              border: `1px solid ${filterCat === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: filterCat === cat ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' : 'transparent',
              color: filterCat === cat ? 'white' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: filterCat === cat ? 600 : 400,
              fontFamily: 'var(--font-inter)',
              transition: 'all 0.2s',
            }}
          >
            {cat}
          </button>
        ))}

        {userRole === 'admin' && (
          <button
            onClick={() => { setShowCatModal(true); setCatError('') }}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '50px',
              border: '1px dashed var(--color-primary)',
              background: 'var(--color-primary-glow)',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              fontFamily: 'var(--font-inter)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
            title="Tambah atau Hapus Kategori"
          >
            <Plus size={13} /> Atur Kategori
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>{editingId ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
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
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Nama Menu</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama menu" required onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'} />
              </div>

              {/* Image Upload & URL */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Foto Menu</label>
                  <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: imageMode === 'upload' ? 'var(--color-primary)' : 'transparent',
                        color: imageMode === 'upload' ? 'white' : 'var(--color-text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: imageMode === 'url' ? 'var(--color-primary)' : 'transparent',
                        color: imageMode === 'url' ? 'white' : 'var(--color-text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      URL Gambar
                    </button>
                  </div>
                </div>

                {uploadMessage && (
                  <div style={{ fontSize: '0.78rem', color: '#4a9e6a', marginBottom: '8px', fontFamily: 'var(--font-inter)' }}>
                    {uploadMessage}
                  </div>
                )}

                {imageMode === 'upload' ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (re) => {
                          const dataUrl = re.target?.result as string
                          if (dataUrl) {
                            setImageToAdjust(dataUrl)
                            setAdjustModalOpen(true)
                          }
                        }
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />

                    {form.image_url ? (
                      /* Enhanced Preview with Dynamic Fit & Adjust Controls */
                      <div style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        height: '190px',
                        background: '#171412',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <img
                          src={form.image_url}
                          alt="preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: previewFitMode,
                            transition: 'all 0.2s',
                          }}
                        />

                        {/* Top-Left: Fit Mode Switcher Pill */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'flex',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '20px',
                          padding: '2px',
                          gap: '2px',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}>
                          <button
                            type="button"
                            onClick={() => setPreviewFitMode('cover')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '16px',
                              border: 'none',
                              background: previewFitMode === 'cover' ? 'var(--color-primary)' : 'transparent',
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Tampilkan foto mengisi seluruh bingkai"
                          >
                            Isi Penuh (Cover)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewFitMode('contain')}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '16px',
                              border: 'none',
                              background: previewFitMode === 'contain' ? 'var(--color-primary)' : 'transparent',
                              color: 'white',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Tampilkan seluruh foto tanpa terpotong"
                          >
                            Muat Penuh (Contain)
                          </button>
                        </div>

                        {/* Bottom Action Bar */}
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: 0,
                          right: 0,
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '0 8px',
                        }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (form.image_url) {
                                setImageToAdjust(form.image_url)
                                setAdjustModalOpen(true)
                              }
                            }}
                            style={{
                              background: 'var(--color-primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 11px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            }}
                            title="Buka alat penyesuaian ukuran, zoom, dan potong foto"
                          >
                            <Crop size={13} /> Sesuaikan Ukuran
                          </button>

                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            style={{
                              background: 'rgba(0,0,0,0.7)',
                              color: 'white',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Ganti foto dengan file baru"
                          >
                            <Upload size={12} /> Ganti
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (form.image_url && form.image_url.includes('menu-images')) {
                                const pathMatch = form.image_url.match(/menu-images\/(.+)$/)
                                if (pathMatch?.[1]) {
                                  await supabase.storage.from('menu-images').remove([pathMatch[1]])
                                }
                              }
                              setForm(prev => ({ ...prev, image_url: null }))
                              setUploadMessage('')
                            }}
                            style={{
                              background: 'rgba(232,90,74,0.85)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Hapus foto ini"
                          >
                            <X size={12} /> Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Trigger */
                      <div
                        onClick={() => !uploading && fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOver(false)
                          const file = e.dataTransfer.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = (re) => {
                            const dataUrl = re.target?.result as string
                            if (dataUrl) {
                              setImageToAdjust(dataUrl)
                              setAdjustModalOpen(true)
                            }
                          }
                          reader.readAsDataURL(file)
                        }}
                        style={{
                          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          overflow: 'hidden',
                          transition: 'border-color 0.2s, background 0.2s',
                          minHeight: '135px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          background: dragOver ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                        }}
                      >
                        {uploading ? (
                          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', fontSize: '0.875rem', padding: '1.5rem', width: '100%' }}>
                            <Upload size={24} style={{ margin: '0 auto 10px', display: 'block', animation: 'float 1s ease-in-out infinite' }} />
                            <div style={{ marginBottom: '10px' }}>Memproses foto...</div>
                            {uploadProgress !== null && (
                              <div style={{ width: '80%', margin: '0 auto', height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${uploadProgress}%`,
                                  background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease',
                                }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', padding: '1.5rem' }}>
                            <ImageIcon size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                              {dragOver ? 'Lepaskan untuk upload & sesuaikan' : 'Pilih atau drag & drop foto menu'}
                            </span>
                            <br />
                            <span style={{ fontSize: '0.75rem', opacity: 0.7, color: 'var(--color-primary)' }}>
                              ✨ Ukuran dapat disesuaikan & diatur dinamis
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        style={inputStyle}
                        placeholder="https://images.unsplash.com/... atau URL foto"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (urlInput.trim()) {
                            setForm({ ...form, image_url: urlInput.trim() })
                            setUrlInput('')
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: '0 1rem', fontSize: '0.85rem', flexShrink: 0 }}
                      >
                        Pasang
                      </button>
                    </div>
                    {form.image_url && (
                      <div style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        height: '160px',
                        border: '1px solid var(--color-border)',
                        background: '#171412',
                      }}>
                        <img
                          src={form.image_url}
                          alt="preview"
                          style={{ width: '100%', height: '100%', objectFit: previewFitMode }}
                        />
                        <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (form.image_url) {
                                setImageToAdjust(form.image_url)
                                setAdjustModalOpen(true)
                              }
                            }}
                            style={{
                              background: 'var(--color-primary)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Crop size={12} /> Sesuaikan Ukuran
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image_url: null })}
                            style={{
                              background: 'rgba(232,90,74,0.9)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <X size={12} /> Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Deskripsi</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi menu" required onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'} />
              </div>

              {/* Input Harga Modal & Harga Jual */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    Harga Modal / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.cost_price}
                    onChange={e => setForm({ ...form, cost_price: Number(e.target.value) })}
                    min={0}
                    placeholder="0"
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '3px' }}>
                    Biaya bahan baku per porsi
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                    Harga Jual Konsumen (Rp)
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    min={0}
                    required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '3px' }}>
                    Harga tertera di menu
                  </span>
                </div>
              </div>

              {/* Profit Indicator Card */}
              {form.price > 0 && (
                <div style={{
                  background: (form.price - (form.cost_price || 0)) >= 0 ? 'rgba(74, 158, 106, 0.1)' : 'rgba(232, 90, 74, 0.1)',
                  border: `1px solid ${(form.price - (form.cost_price || 0)) >= 0 ? 'rgba(74, 158, 106, 0.35)' : 'rgba(232, 90, 74, 0.35)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    Estimasi Laba per Porsi:
                  </span>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontWeight: 700,
                      color: (form.price - (form.cost_price || 0)) >= 0 ? '#4a9e6a' : '#e85a4a',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      {(form.price - (form.cost_price || 0)) >= 0 ? '+' : ''}Rp {(form.price - (form.cost_price || 0)).toLocaleString('id-ID')}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      background: (form.price - (form.cost_price || 0)) >= 0 ? 'rgba(74, 158, 106, 0.2)' : 'rgba(232, 90, 74, 0.2)',
                      color: (form.price - (form.cost_price || 0)) >= 0 ? '#4a9e6a' : '#e85a4a',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}>
                      {form.price > 0 ? (((form.price - (form.cost_price || 0)) / form.price) * 100).toFixed(0) : 0}% Margin
                    </span>
                  </div>
                </div>
              )}

              {/* Kategori */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Kategori</label>
                  <button
                    type="button"
                    onClick={() => setShowCatModal(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontWeight: 600 }}
                  >
                    + Atur Kategori
                  </button>
                </div>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="button" onClick={() => setForm({ ...form, is_available: !form.is_available })} style={{ width: '48px', height: '26px', borderRadius: '13px', background: form.is_available ? 'var(--color-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '3px', left: form.is_available ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
                  Menu {form.is_available ? 'Tersedia' : 'Tidak Tersedia'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCatModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(5px)',
          zIndex: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-playfair)', margin: 0 }}>
                  Kelola Kategori Menu
                </h3>
              </div>
              <button
                onClick={() => { setShowCatModal(false); setCatError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error banner */}
            {catError && (
              <div style={{
                background: 'rgba(232, 90, 74, 0.12)',
                border: '1px solid rgba(232, 90, 74, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '1rem',
                color: '#e85a4a',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-inter)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{catError}</span>
              </div>
            )}

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru (cth: Mocktail, Dessert)"
                disabled={catLoading}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text)',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-inter)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={catLoading || !newCatName.trim()}
                className="btn-primary"
                style={{
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  opacity: (catLoading || !newCatName.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Plus size={15} />
                Tambah
              </button>
            </form>

            {/* Category List */}
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Daftar Kategori Saat Ini ({categories.length}):
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
              marginBottom: '1.25rem',
            }}>
              {categories.map(cat => {
                const itemCount = items.filter(i => i.category === cat).length
                const isConfirming = deleteCatConfirm === cat

                return (
                  <div
                    key={cat}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                        {cat}
                      </span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.72rem',
                        color: itemCount > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        background: itemCount > 0 ? 'var(--color-primary-glow)' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: '50px',
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {itemCount} menu terdaftar
                      </span>
                    </div>

                    <div>
                      {isConfirming ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={catLoading}
                            onClick={() => handleDeleteCategory(cat)}
                            style={{
                              background: '#e85a4a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCatConfirm(null)}
                            style={{
                              background: 'var(--color-bg-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (itemCount > 0) {
                              setCatError(`Kategori "${cat}" masih memiliki ${itemCount} menu. Pindahkan menu terlebih dahulu sebelum menghapus kategori ini.`)
                            } else {
                              setDeleteCatConfirm(cat)
                              setCatError('')
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: itemCount > 0 ? 'var(--color-text-muted)' : '#e85a4a',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: itemCount > 0 ? 0.4 : 1,
                          }}
                          title={itemCount > 0 ? 'Kategori memiliki menu' : 'Hapus Kategori'}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowCatModal(false); setCatError('') }}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>Memuat menu...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Coffee size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.5rem' }}>Belum ada menu. Tambah item pertamamu!</p>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} />Tambah Menu</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(item => (
            <div
              key={item.id}
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              {/* Image Preview */}
              {item.image_url ? (
                <div style={{
                  width: '100%',
                  height: '150px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  background: '#171412',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </div>
              ) : (
                <div style={{ width: '100%', height: '90px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-text-muted)', gap: '6px' }}>
                  <ImageIcon size={18} style={{ opacity: 0.4 }} />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-inter)', opacity: 0.6 }}>Belum ada foto</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '2px 10px', borderRadius: '50px', fontFamily: 'var(--font-inter)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {item.category}
                </span>
                <button
                  onClick={() => toggleAvailable(item.id, item.is_available)}
                  style={{
                    fontSize: '0.75rem',
                    background: item.is_available ? 'rgba(74, 158, 106, 0.15)' : 'rgba(232, 90, 74, 0.15)',
                    color: item.is_available ? '#4a9e6a' : '#e85a4a',
                    border: `1px solid ${item.is_available ? 'rgba(74, 158, 106, 0.4)' : 'rgba(232, 90, 74, 0.4)'}`,
                    borderRadius: '50px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  title="Klik untuk ubah ketersediaan menu"
                >
                  {item.is_available ? '● Tersedia' : '○ Habis'}
                </button>
              </div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>{item.name}</h3>
              <div style={{
                marginTop: 'auto',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--color-border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-playfair)' }}>
                      Rp {item.price.toLocaleString('id-ID')}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                      (Jual)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', fontSize: '0.73rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      Modal: Rp {(item.cost_price || 0).toLocaleString('id-ID')}
                    </span>
                    <span style={{
                      color: (item.price - (item.cost_price || 0)) >= 0 ? '#4a9e6a' : '#e85a4a',
                      fontWeight: 600,
                      background: (item.price - (item.cost_price || 0)) >= 0 ? 'rgba(74, 158, 106, 0.12)' : 'rgba(232, 90, 74, 0.12)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}>
                      Laba +Rp {(item.price - (item.cost_price || 0)).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
                {userRole === 'admin' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleEdit(item)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                      <Pencil size={14} />
                    </button>
                    {deleteConfirm === item.id ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleDelete(item.id)} style={{ height: '32px', padding: '0 8px', borderRadius: '8px', background: '#e85a4a', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.7rem', fontWeight: 600 }}>Hapus</button>
                        <button onClick={() => setDeleteConfirm(null)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#e85a4a'; e.currentTarget.style.color = '#e85a4a' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                    Klik status untuk ubah
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Dynamic Image Adjuster / Cropper Modal */}
      <ImageAdjustModal
        isOpen={adjustModalOpen}
        imageSrc={imageToAdjust}
        onClose={() => {
          setAdjustModalOpen(false)
          setImageToAdjust(null)
        }}
        onConfirm={async (processedDataUrl) => {
          const finalUrl = await uploadImage(processedDataUrl, form.image_url)
          if (finalUrl) {
            setForm(prev => ({ ...prev, image_url: finalUrl }))
          }
        }}
      />
    </div>
  )
}
