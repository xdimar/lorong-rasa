'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  MessageSquare,
  Search,
  Star,
  CornerDownRight,
  Send,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Coffee,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  MenuReview,
  fetchAllReviewsForAdmin,
  replyToReview,
  deleteReply,
  toggleReviewApproval,
  deleteUserReview,
} from '@/lib/reviews'
import { RatingStars } from '@/components/ui/RatingStars'
import { useToast } from '@/components/providers/ToastProvider'

const QUICK_REPLY_TEMPLATES = [
  'Terima kasih banyak atas ulasannya! Senang sekali racikan kopi dan menu kami cocok di lidah Kakak 🙏☕',
  'Terima kasih atas masukannya Kak! Kami akan terus menjaga kualitas racikan dan pelayanan terbaik untuk Kakak.',
  'Salam hangat dari tim barista Lorong Rasa! Ditunggu kedatangannya kembali nongkrong santai di Wajak ✨',
  'Mohon maaf atas ketidaknyamanannya Kak. Masukan Kakak sangat berharga untuk peningkatan menu kami ke depan.',
]

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<MenuReview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'replied' | 'low_rating' | 'high_rating'
  >('all')

  // Replying state
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const supabase = createClient()
  const { showToast } = useToast()

  const loadReviews = async () => {
    setLoading(true)
    try {
      const data = await fetchAllReviewsForAdmin(supabase)
      setReviews(data)
    } catch (err) {
      console.error('Error loading admin reviews:', err)
      showToast('Gagal memuat daftar ulasan', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  // Metrics
  const metrics = useMemo(() => {
    const total = reviews.length
    const pending = reviews.filter((r) => !r.reply).length
    const replied = reviews.filter((r) => Boolean(r.reply)).length
    const avg =
      total > 0
        ? Number(
            (
              reviews.reduce((acc, curr) => acc + curr.rating, 0) / total
            ).toFixed(1)
          )
        : 0
    const fiveStars = reviews.filter((r) => r.rating === 5).length

    return { total, pending, replied, avg, fiveStars }
  }, [reviews])

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Tab filter
      if (activeTab === 'pending' && r.reply) return false
      if (activeTab === 'replied' && !r.reply) return false
      if (activeTab === 'low_rating' && r.rating > 3) return false
      if (activeTab === 'high_rating' && r.rating < 4) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesUser = r.user_name.toLowerCase().includes(q)
        const matchesComment = r.comment.toLowerCase().includes(q)
        const matchesMenu = r.menu_item?.name.toLowerCase().includes(q)
        const matchesReply = r.reply?.toLowerCase().includes(q)
        if (!matchesUser && !matchesComment && !matchesMenu && !matchesReply) {
          return false
        }
      }

      return true
    })
  }, [reviews, activeTab, searchQuery])

  const handleStartReply = (rev: MenuReview) => {
    setReplyingId(rev.id)
    setReplyText(rev.reply || '')
  }

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      showToast('Teks balasan tidak boleh kosong', 'error')
      return
    }

    setSubmittingReply(true)
    const res = await replyToReview(supabase, reviewId, replyText)
    setSubmittingReply(false)

    if (res.success) {
      const now = new Date().toISOString()
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply: replyText.trim(), replied_at: now } : r
        )
      )
      setReplyingId(null)
      showToast('Balasan barista berhasil disimpan!', 'success')
    } else {
      showToast(res.error || 'Gagal menyimpan balasan', 'error')
    }
  }

  const handleDeleteReply = async (reviewId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus balasan barista ini?')) return

    const res = await deleteReply(supabase, reviewId)
    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, reply: null, replied_at: null } : r
        )
      )
      setReplyingId(null)
      showToast('Balasan berhasil dihapus', 'success')
    } else {
      showToast(res.error || 'Gagal menghapus balasan', 'error')
    }
  }

  const handleToggleApproval = async (rev: MenuReview) => {
    const res = await toggleReviewApproval(supabase, rev.id, rev.is_approved)
    if (res.success) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === rev.id ? { ...r, is_approved: !r.is_approved } : r
        )
      )
      showToast(
        rev.is_approved
          ? 'Ulasan disembunyikan dari publik'
          : 'Ulasan disetujui & ditampilkan ke publik',
        'success'
      )
    } else {
      showToast(res.error || 'Gagal mengubah status', 'error')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Hapus permanen ulasan pelanggan ini?')) return

    const res = await deleteUserReview(supabase, reviewId)
    if (res.success) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      showToast('Ulasan berhasil dihapus', 'success')
    } else {
      showToast(res.error || 'Gagal menghapus ulasan', 'error')
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '4px',
            }}
          >
            <Coffee size={14} /> Lorong Rasa Cafe &bull; Wajak
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: '1.75rem',
              fontWeight: 900,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            Manajemen Ulasan &amp; Balasan Menu
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
              marginTop: '4px',
              margin: 0,
            }}
          >
            Pantau ulasan cita rasa menu dari pengunjung dan berikan balasan resmi
            hangat dari tim barista.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReviews}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(201, 100, 39, 0.12)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Total Ulasan Masuk
            </div>
            <div
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-playfair)',
              }}
            >
              {metrics.total}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.15)',
              color: 'var(--color-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Star size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Rata-rata Rating
            </div>
            <div
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: 'var(--color-gold)',
                fontFamily: 'var(--font-playfair)',
              }}
            >
              {metrics.total > 0 ? `${metrics.avg} / 5.0` : '-'}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border:
              metrics.pending > 0
                ? '1.5px solid rgba(232, 90, 74, 0.35)'
                : '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background:
                metrics.pending > 0
                  ? 'rgba(232, 90, 74, 0.12)'
                  : 'rgba(74, 158, 106, 0.12)',
              color: metrics.pending > 0 ? '#e85a4a' : '#4a9e6a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {metrics.pending > 0 ? <Clock size={22} /> : <CheckCircle2 size={22} />}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Menunggu Balasan
            </div>
            <div
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: metrics.pending > 0 ? '#e85a4a' : 'var(--color-text)',
                fontFamily: 'var(--font-playfair)',
              }}
            >
              {metrics.pending}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(74, 158, 106, 0.12)',
              color: '#4a9e6a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Ulasan 5 Bintang
            </div>
            <div
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-playfair)',
              }}
            >
              {metrics.fiveStars}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Tab Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'all'
                    ? 'var(--color-primary)'
                    : 'var(--color-bg-secondary)',
                color: activeTab === 'all' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Semua ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'pending'
                    ? '#e85a4a'
                    : 'var(--color-bg-secondary)',
                color: activeTab === 'pending' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Perlu Dibalas ({metrics.pending})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('replied')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'replied'
                    ? '#4a9e6a'
                    : 'var(--color-bg-secondary)',
                color: activeTab === 'replied' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Sudah Dibalas ({metrics.replied})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('low_rating')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'low_rating'
                    ? 'var(--color-gold)'
                    : 'var(--color-bg-secondary)',
                color: activeTab === 'low_rating' ? '#000' : 'var(--color-text-muted)',
              }}
            >
              Rating 1-3★
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('high_rating')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTab === 'high_rating'
                    ? 'var(--color-gold)'
                    : 'var(--color-bg-secondary)',
                color: activeTab === 'high_rating' ? '#000' : 'var(--color-text-muted)',
              }}
            >
              Rating 4-5★
            </button>
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pelanggan, menu, atau isi ulasan..."
              style={{
                width: '100%',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '7px 12px 7px 32px',
                fontSize: '0.8rem',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Review Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Memuat daftar ulasan menu...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              background: 'var(--color-bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Coffee size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Tidak ada ulasan yang sesuai dengan filter ini.
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const isReplying = replyingId === rev.id

            return (
              <div
                key={rev.id}
                style={{
                  background: 'var(--color-bg-card)',
                  border: rev.reply
                    ? '1px solid var(--color-border)'
                    : '1.5px solid rgba(232, 90, 74, 0.3)',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header: Menu Name & User info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background:
                          'linear-gradient(135deg,var(--color-primary),var(--color-gold))',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        flexShrink: 0,
                      }}
                    >
                      {rev.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                          {rev.user_name}
                        </span>
                        {rev.order_id && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(74,158,106,0.12)',
                              color: '#4a9e6a',
                              border: '1px solid rgba(74,158,106,0.25)',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            <ShieldCheck size={11} /> Pembeli Terverifikasi
                          </span>
                        )}
                        {!rev.is_approved && (
                          <span
                            style={{
                              background: 'rgba(232, 90, 74, 0.1)',
                              color: '#e85a4a',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            Disembunyikan
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Menu:{' '}
                        <strong style={{ color: 'var(--color-text)' }}>
                          {rev.menu_item?.name || 'Menu Spesial'}
                        </strong>{' '}
                        &bull; {new Date(rev.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Rating & Moderation Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RatingStars rating={rev.rating} size={15} />

                    <button
                      type="button"
                      onClick={() => handleToggleApproval(rev)}
                      title={rev.is_approved ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}
                      style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: rev.is_approved ? 'var(--color-text-muted)' : '#e85a4a',
                      }}
                    >
                      {rev.is_approved ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      title="Hapus Ulasan"
                      style={{
                        background: 'rgba(232, 90, 74, 0.08)',
                        border: '1px solid rgba(232, 90, 74, 0.25)',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: '#e85a4a',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Customer Comment */}
                <div
                  style={{
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '0.88rem',
                    color: 'var(--color-text)',
                    lineHeight: 1.6,
                    fontFamily: 'var(--font-inter)',
                  }}
                >
                  &ldquo;{rev.comment}&rdquo;
                </div>

                {/* Barista Reply Section */}
                {rev.reply && !isReplying && (
                  <div
                    style={{
                      background: 'rgba(212, 160, 74, 0.08)',
                      borderLeft: '3px solid var(--color-gold)',
                      borderTop: '1px solid rgba(212, 160, 74, 0.2)',
                      borderRight: '1px solid rgba(212, 160, 74, 0.15)',
                      borderBottom: '1px solid rgba(212, 160, 74, 0.15)',
                      borderRadius: '0 12px 12px 0',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          color: 'var(--color-gold)',
                        }}
                      >
                        <CornerDownRight size={14} />
                        <span>☕ Balasan Resmi Barista Lorong Rasa:</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {rev.replied_at && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {new Date(rev.replied_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartReply(rev)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-gold)',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            textDecoration: 'underline',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(rev.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#e85a4a',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--color-text)',
                        margin: 0,
                        lineHeight: 1.55,
                      }}
                    >
                      {rev.reply}
                    </p>
                  </div>
                )}

                {/* Staff CTA: If no reply yet */}
                {!rev.reply && !isReplying && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      onClick={() => handleStartReply(rev)}
                      style={{
                        background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '9px',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px var(--color-primary-glow)',
                      }}
                    >
                      <CornerDownRight size={13} />
                      Balas Ulasan Ini Sebagai Barista
                    </button>
                  </div>
                )}

                {/* Inline Barista Reply Form */}
                {isReplying && (
                  <div
                    style={{
                      background: 'rgba(212, 160, 74, 0.08)',
                      border: '1.5px solid var(--color-gold)',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'var(--color-gold)',
                        }}
                      >
                        <CornerDownRight size={14} />
                        <span>Tulis Balasan Resmi Barista Lorong Rasa:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                    </div>

                    {/* Template chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_REPLY_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReplyText(tmpl)}
                          style={{
                            background: 'var(--color-bg-card)',
                            border: '1px solid rgba(212, 160, 74, 0.35)',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          💡 &quot;{tmpl.slice(0, 36)}...&quot;
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Ketik balasan ramah dari tim barista cafe..."
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '10px',
                        fontSize: '0.84rem',
                        color: 'var(--color-text)',
                        outline: 'none',
                        fontFamily: 'var(--font-inter)',
                        lineHeight: 1.5,
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setReplyingId(null)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={submittingReply}
                        onClick={() => handleSendReply(rev.id)}
                        style={{
                          background:
                            'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 16px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 10px var(--color-primary-glow)',
                        }}
                      >
                        <Send size={13} />
                        {submittingReply ? 'Menyimpan...' : 'Simpan Balasan Barista'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
