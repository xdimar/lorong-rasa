'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X,
  Star,
  MessageSquare,
  Send,
  Coffee,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  ThumbsUp,
  CornerDownRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { MenuItem, categoryColors } from '@/lib/constants/menu'
import {
  MenuReview,
  calculateReviewSummary,
  fetchReviewsByMenuItem,
  submitReview,
} from '@/lib/reviews'
import { RatingStars } from '@/components/ui/RatingStars'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'

interface MenuReviewModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  prefillOrderId?: string | null
}

export function MenuReviewModal({
  item,
  isOpen,
  onClose,
  prefillOrderId = null,
}: MenuReviewModalProps) {
  const [reviews, setReviews] = useState<MenuReview[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [filterRating, setFilterRating] = useState<number | 'all'>('all')

  // Review Form States
  const [showReviewForm, setShowReviewForm] = useState(Boolean(prefillOrderId))
  const [userRating, setUserRating] = useState<number>(5)
  const [userComment, setUserComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  const supabase = createClient()
  const { addItem } = useCart()
  const { showToast } = useToast()

  // Fetch current user and reviews
  useEffect(() => {
    if (!isOpen || !item) return

    const loadData = async () => {
      setLoadingReviews(true)
      setSubmitSuccess(false)
      setSubmitError('')

      try {
        const { data: authData } = await supabase.auth.getUser()
        setCurrentUser(authData?.user || null)

        const data = await fetchReviewsByMenuItem(supabase, item.id)
        setReviews(data)
      } catch (err) {
        console.error('Error fetching reviews:', err)
      } finally {
        setLoadingReviews(false)
      }
    }

    loadData()
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const catColor = categoryColors[item.category] || 'var(--color-primary)'
  const summary = calculateReviewSummary(reviews)

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === 'all') return true
    return r.rating === filterRating
  })

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      image_url: item.image_url,
    })
    showToast(`${item.name} ditambahkan ke keranjang`, 'cart')
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userComment.trim()) {
      setSubmitError('Silakan tulis ulasan atau kesan rasa kamu terlebih dahulu.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const res = await submitReview(supabase, {
      menu_item_id: item.id,
      order_id: prefillOrderId,
      rating: userRating,
      comment: userComment,
    })

    setSubmitting(false)

    if (res.success && res.review) {
      setSubmitSuccess(true)
      setUserComment('')
      setReviews((prev) => [res.review!, ...prev])
      showToast('Ulasan kamu berhasil dikirim! Terima kasih.', 'success')
      setTimeout(() => {
        setShowReviewForm(false)
        setSubmitSuccess(false)
      }, 3000)
    } else {
      setSubmitError(res.error || 'Gagal mengirimkan ulasan.')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(201, 100, 39, 0.12)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coffee size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: 0,
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--color-text)',
                }}
              >
                Detail & Ulasan Menu
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {item.category} • Lorong Rasa
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Menu Overview Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '1.25rem',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#1a1410',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${catColor}22, ${catColor}44)`,
                  }}
                >
                  <Coffee size={32} style={{ color: catColor }} />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    background: catColor,
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.category}
                </span>
                <RatingStars
                  rating={summary.averageRating}
                  showScore
                  showCount
                  count={summary.totalReviews}
                  size={14}
                />
              </div>

              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--color-text)',
                }}
              >
                {item.name}
              </h3>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  margin: '0 0 8px',
                  lineHeight: 1.5,
                }}
              >
                {item.description || 'Menu racikan istimewa dari Lorong Rasa.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <span
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    color: 'var(--color-primary)',
                    fontFamily: 'var(--font-playfair)',
                  }}
                >
                  Rp {item.price.toLocaleString('id-ID')}
                </span>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px var(--color-primary-glow)',
                    transition: 'all 0.2s',
                  }}
                >
                  <ShoppingCart size={14} />
                  Pesan Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* Rating Summary & Breakdown Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '1.25rem',
              alignItems: 'center',
            }}
          >
            {/* Big Score Box */}
            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
              <div
                style={{
                  fontSize: '3rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-playfair)',
                  lineHeight: 1,
                  color: 'var(--color-gold)',
                  marginBottom: '4px',
                }}
              >
                {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '5.0'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <RatingStars rating={summary.averageRating || 5} size={18} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Berdasarkan {summary.totalReviews} ulasan pelanggan
              </span>
            </div>

            {/* Distribution Bar Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0
                const percent = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0
                return (
                  <div
                    key={star}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <span style={{ width: '22px', textAlign: 'right', fontWeight: 700 }}>{star}★</span>
                    <div
                      style={{
                        flex: 1,
                        height: '7px',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: star >= 4 ? 'var(--color-gold)' : 'var(--color-primary)',
                          borderRadius: '10px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <span style={{ width: '26px', textAlign: 'left', fontWeight: 600 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Bar: Write Review Button & Filter Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Filter Rating Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setFilterRating('all')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: filterRating === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: filterRating === 'all' ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                  color: filterRating === 'all' ? '#ffffff' : 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Semua ({summary.totalReviews})
              </button>
              {[5, 4, 3].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFilterRating(star)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '50px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: filterRating === star ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                    background: filterRating === star ? 'rgba(212, 175, 55, 0.15)' : 'var(--color-bg-secondary)',
                    color: filterRating === star ? 'var(--color-gold)' : 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  {star} Bintang
                </button>
              ))}
            </div>

            {/* Toggle Review Form */}
            {!showReviewForm && (
              <button
                type="button"
                onClick={() => setShowReviewForm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(201, 100, 39, 0.12)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(201, 100, 39, 0.3)',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <MessageSquare size={14} />
                Tulis Ulasan Menu
              </button>
            )}
          </div>

          {/* Write Review Form Card */}
          {showReviewForm && (
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} style={{ color: 'var(--color-gold)' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                    Bagikan Kesan Rasa Kamu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                  }}
                >
                  Batal
                </button>
              </div>

              {currentUser ? (
                <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Rating Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      Beri Bintang Kepuasan:
                    </label>
                    <RatingStars
                      rating={userRating}
                      interactive
                      onChange={(r) => setUserRating(r)}
                      size={24}
                      showLabel
                    />
                  </div>

                  {/* Comment Textarea */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                      Ulasan / Komentar:
                    </label>
                    <textarea
                      rows={3}
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder="Bagaimana cita rasa, tekstur, atau kesegaran racikan menu ini? Tulis pendapatmu di sini..."
                      style={{
                        width: '100%',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-text)',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {submitError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#e85a4a' }}>
                      <AlertCircle size={14} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#4a9e6a' }}>
                      <CheckCircle2 size={14} />
                      <span>Ulasan kamu berhasil tersimpan! Terima kasih banyak.</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px var(--color-primary-glow)',
                      }}
                    >
                      <Send size={14} />
                      {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-bg-card)', borderRadius: '12px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                    Silakan masuk ke akun Lorong Rasa kamu terlebih dahulu untuk menuliskan ulasan menu ini.
                  </p>
                  <Link
                    href="/login"
                    style={{
                      display: 'inline-block',
                      background: 'var(--color-primary)',
                      color: '#ffffff',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Masuk Sekarang
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Ulasan Pelanggan ({filteredReviews.length})
            </h4>

            {loadingReviews ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Memuat ulasan menu...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: '16px',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Coffee size={36} style={{ color: 'var(--color-text-muted)', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Belum ada ulasan untuk filter bintang ini.
                </p>
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Review Header: User Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-gold))',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {rev.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                            {rev.user_name}
                          </span>
                          {rev.order_id && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'rgba(74, 158, 106, 0.15)',
                                color: '#4a9e6a',
                                border: '1px solid rgba(74, 158, 106, 0.3)',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                              }}
                            >
                              <ShieldCheck size={11} />
                              Terverifikasi Membeli
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                          {new Date(rev.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <RatingStars rating={rev.rating} size={14} />
                  </div>

                  {/* Comment */}
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--color-text)',
                      lineHeight: 1.6,
                      margin: 0,
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    {rev.comment}
                  </p>

                  {/* Barista Reply */}
                  {rev.reply && (
                    <div
                      style={{
                        marginTop: '6px',
                        background: 'var(--color-bg-secondary)',
                        borderLeft: '3px solid var(--color-gold)',
                        borderRadius: '0 8px 8px 0',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                        <CornerDownRight size={13} />
                        <span>Balasan Barista Lorong Rasa</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                        {rev.reply}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
