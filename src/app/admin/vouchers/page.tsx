'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Tag, Percent, Gift, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

interface Voucher {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number
  current_uses: number
  expires_at: string
  is_active: boolean
  created_at: string
}

const emptyForm = {
  code: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 10,
  min_order: 0,
  max_uses: 100,
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  is_active: true,
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [qrModal, setQrModal] = useState<Voucher | null>(null)

  const supabase = createClient()

  const fetchVouchers = async () => {
    const { data } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setVouchers(data)
    setLoading(false)
  }

  useEffect(() => { fetchVouchers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      ...form,
      code: form.code.toUpperCase(),
      expires_at: form.expires_at.includes('T')
        ? new Date(form.expires_at).toISOString()
        : new Date(`${form.expires_at}T23:59:59.999Z`).toISOString(),
    }

    let result
    if (editingId) {
      result = await supabase.from('vouchers').update(payload).eq('id', editingId)
    } else {
      result = await supabase.from('vouchers').insert({ ...payload, current_uses: 0 })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchVouchers()
    }
    setSubmitting(false)
  }

  const handleEdit = (v: Voucher) => {
    setForm({
      code: v.code,
      description: v.description,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
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
    fetchVouchers()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('vouchers').update({ is_active: !current }).eq('id', id)
    fetchVouchers()
  }

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

  const labelStyle = {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px',
    fontFamily: 'var(--font-inter)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Manajemen Voucher</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-inter)' }}>
            Buat dan kelola voucher diskon untuk pelanggan
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
          className="btn-primary"
        >
          <Plus size={18} />
          Buat Voucher
        </button>
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
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.2rem' }}>
                {editingId ? 'Edit Voucher' : 'Buat Voucher Baru'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setError('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{
                background: '#e85a4a15',
                border: '1px solid #e85a4a44',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                color: '#e85a4a',
                fontFamily: 'var(--font-inter)',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Code */}
              <div>
                <label style={labelStyle}>Kode Voucher</label>
                <input
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="CONTOH10"
                  required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Deskripsi</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Deskripsi voucher untuk pelanggan"
                  required
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>

              {/* Discount Type */}
              <div>
                <label style={labelStyle}>Tipe Diskon</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {(['percentage', 'fixed'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, discount_type: type })}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${form.discount_type === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: form.discount_type === type ? 'var(--color-primary-glow)' : 'transparent',
                        color: form.discount_type === type ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-inter)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {type === 'percentage' ? <Percent size={16} /> : <Gift size={16} />}
                      {type === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Value & Min Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>
                    Nilai Diskon {form.discount_type === 'percentage' ? '(%)' : '(Rp)'}
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.discount_value}
                    onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })}
                    min={1}
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Min. Order (Rp)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.min_order}
                    onChange={e => setForm({ ...form, min_order: Number(e.target.value) })}
                    min={0}
                    required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              </div>

              {/* Max Uses & Expires */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Maks. Penggunaan</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={form.max_uses}
                    onChange={e => setForm({ ...form, max_uses: Number(e.target.value) })}
                    min={1}
                    required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tanggal Kadaluarsa</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })}
                    required
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    background: form.is_active ? 'var(--color-primary)' : 'var(--color-border)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.3s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: form.is_active ? '24px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }} />
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)' }}>
                  Voucher {form.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError('') }}
                  className="btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Buat Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vouchers Table */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
              Memuat voucher...
            </div>
          ) : vouchers.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Tag size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
              <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.5rem' }}>
                Belum ada voucher. Buat voucher pertamamu!
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                <Plus size={18} />
                Buat Voucher
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['Kode', 'Deskripsi', 'Diskon', 'Min. Order', 'Penggunaan', 'Status', 'Kadaluarsa', 'Aksi'].map(col => (
                    <th key={col} style={{
                      padding: '0.85rem 1.25rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr
                    key={v.id}
                    style={{ borderTop: '1px solid var(--color-border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
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
                    <td style={{ padding: '1rem 1.25rem', maxWidth: '220px' }}>
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-inter)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {v.description}
                      </p>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        fontFamily: 'var(--font-inter)',
                      }}>
                        {v.discount_type === 'percentage'
                          ? `${v.discount_value}%`
                          : `Rp ${v.discount_value.toLocaleString('id-ID')}`}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      Rp {v.min_order.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                          {v.current_uses}/{v.max_uses}
                        </span>
                        <div style={{ width: '60px', height: '4px', background: 'var(--color-border)', borderRadius: '2px' }}>
                          <div style={{
                            width: `${Math.min((v.current_uses / v.max_uses) * 100, 100)}%`,
                            height: '100%',
                            background: 'var(--color-primary)',
                            borderRadius: '2px',
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => toggleActive(v.id, v.is_active)}
                        style={{
                          background: v.is_active ? '#4a9e6a22' : '#e85a4a22',
                          color: v.is_active ? '#4a9e6a' : '#e85a4a',
                          border: `1px solid ${v.is_active ? '#4a9e6a44' : '#e85a4a44'}`,
                          borderRadius: '50px',
                          padding: '3px 12px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontFamily: 'var(--font-inter)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', whiteSpace: 'nowrap' }}>
                      {new Date(v.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(v)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                            e.currentTarget.style.color = 'var(--color-primary)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.color = 'var(--color-text-secondary)'
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirm === v.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleDelete(v.id)}
                              style={{
                                height: '32px',
                                padding: '0 10px',
                                borderRadius: '8px',
                                background: '#e85a4a',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-inter)',
                              }}
                            >
                              Ya, Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(v.id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'var(--color-bg-secondary)',
                              border: '1px solid var(--color-border)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--color-text-secondary)',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#e85a4a'
                              e.currentTarget.style.color = '#e85a4a'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = 'var(--color-border)'
                              e.currentTarget.style.color = 'var(--color-text-secondary)'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {/* QR Code button */}
                        <button
                          onClick={() => setQrModal(v)}
                          title="Lihat QR Code"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)'
                            e.currentTarget.style.color = 'var(--color-primary)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.color = 'var(--color-text-secondary)'
                          }}
                        >
                          <QrCode size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModal && (
        <div
          onClick={() => setQrModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(1.25rem, 5vw, 2rem)',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setQrModal(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>QR Code Voucher</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '1.25rem' }}>
              Pelanggan scan QR ini untuk klaim voucher
            </p>

            {/* QR Code */}
            <div style={{
              background: 'white',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'inline-block',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              maxWidth: '100%',
            }}>
              <QRCodeSVG
                value={`VOUCHER:${qrModal.code}|${qrModal.discount_type}|${qrModal.discount_value}|MIN:${qrModal.min_order}`}
                size={160}
                bgColor="#ffffff"
                fgColor="#1a0f00"
                level="H"
              />
            </div>

            {/* Code display */}
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kode Voucher</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)', letterSpacing: '0.12em' }}>{qrModal.code}</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrModal.code)
                }}
                className="btn-outline"
                style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
              >
                <Tag size={14} />
                Salin Kode
              </button>
              <button
                onClick={() => setQrModal(null)}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.6rem' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
