'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X,
  MessageSquare,
  Send,
  Coffee,
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  CornerDownRight,
  ShieldCheck,
  AlertCircle,
  LogIn,
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

function ReviewSkeleton() {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-bg-secondary)', animation: 'shimmer 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: '12px', width: '40%', borderRadius: '6px', background: 'var(--color-bg-secondary)', animation: 'shimmer 1.5s ease-in-out infinite' }} />
          <div style={{ height: '10px', width: '25%', borderRadius: '6px', background: 'var(--color-bg-secondary)', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }} />
        </div>
        <div style={{ height: '12px', width: '70px', borderRadius: '6px', background: 'var(--color-bg-secondary)', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }} />
      </div>
      {[100, 80, 60].map((w, i) => (
        <div key={i} style={{ height: '11px', width: `${w}%`, borderRadius: '6px', background: 'var(--color-bg-secondary)', animation: `shimmer 1.5s ease-in-out infinite ${i * 0.1}s` }} />
      ))}
    </div>
  )
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
  const MAX_COMMENT = 400

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
  const filteredReviews = reviews.filter((r) => filterRating === 'all' || r.rating === filterRating)

  const handleAddToCart = () => {
    addItem({ id: item.id, name: item.name, price: item.price, category: item.category, image_url: item.image_url })
    showToast(`${item.name} ditambahkan ke keranjang`, 'cart')
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userComment.trim()) { setSubmitError('Silakan tulis ulasan atau kesan rasa kamu terlebih dahulu.'); return }
    setSubmitting(true)
    setSubmitError('')
    const res = await submitReview(supabase, { menu_item_id: item.id, order_id: prefillOrderId, rating: userRating, comment: userComment })
    setSubmitting(false)
    if (res.success && res.review) {
      setSubmitSuccess(true)
      setUserComment('')
      setReviews((prev) => [res.review!, ...prev])
      showToast('Ulasan kamu berhasil dikirim! Terima kasih.', 'success')
      setTimeout(() => { setShowReviewForm(false); setSubmitSuccess(false) }, 3000)
    } else {
      setSubmitError(res.error || 'Gagal mengirimkan ulasan.')
    }
  }

  const charLeft = MAX_COMMENT - userComment.length
  const charPercent = Math.min((userComment.length / MAX_COMMENT) * 100, 100)
  const charColor = charLeft <= 20 ? '#e85a4a' : charLeft <= 60 ? 'var(--color-gold)' : 'var(--color-text-muted)'

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease forwards' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '22px', width: '100%', maxWidth: '740px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative', animation: 'slideUpIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
      >
        {/* Header */}
        <div style={{ padding: '1.15rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: `${catColor}1a`, color: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Coffee size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', lineHeight: 1.2 }}>
                Detail &amp; Ulasan Menu
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.category} &bull; Lorong Rasa</span>
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Tutup modal"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background='var(--color-border)'; e.currentTarget.style.color='var(--color-text)'; e.currentTarget.style.transform='rotate(90deg) scale(1.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background='var(--color-bg-secondary)'; e.currentTarget.style.color='var(--color-text-muted)'; e.currentTarget.style.transform='rotate(0deg) scale(1)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>

          {/* 1. Menu Overview Card */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1.25rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '1.1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: '108px', height: '108px', borderRadius: '14px', overflow: 'hidden', backgroundColor: 'var(--color-bg)', flexShrink: 0, border: '1px solid var(--color-border)' }}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${catColor}1a, ${catColor}33)` }}>
                  <Coffee size={34} style={{ color: catColor, opacity: 0.7 }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: catColor, color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.category}</span>
                <RatingStars rating={summary.averageRating} showScore showCount count={summary.totalReviews} size={13} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', lineHeight: 1.25 }}>{item.name}</h3>
              <p style={{ fontSize: '0.81rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>{item.description || 'Menu racikan istimewa dari Lorong Rasa.'}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '4px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)', fontVariantNumeric: 'tabular-nums' }}>Rp {item.price.toLocaleString('id-ID')}</span>
                <button
                  type="button" onClick={handleAddToCart}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: '#fff', border: 'none', borderRadius: '9px', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px var(--color-primary-glow)', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', whiteSpace: 'nowrap' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 22px var(--color-primary-glow)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 14px var(--color-primary-glow)' }}
                >
                  <ShoppingCart size={14} />Pesan Sekarang
                </button>
              </div>
            </div>
          </div>

          {/* 2. Rating Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '1.25rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
              <div style={{ fontSize: '3.25rem', fontWeight: 900, fontFamily: 'var(--font-playfair)', lineHeight: 1, color: 'var(--color-gold)', marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>{summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '5.0'}</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><RatingStars rating={summary.averageRating || 5} size={20} /></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Berdasarkan {summary.totalReviews} ulasan</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const c = summary.ratingCounts[star as 1 | 2 | 3 | 4 | 5] || 0
                const pct = summary.totalReviews > 0 ? (c / summary.totalReviews) * 100 : 0
                const isActive = filterRating === star
                return (
                  <button
                    key={star} type="button"
                    onClick={() => setFilterRating(isActive ? 'all' : star)}
                    aria-label={`Filter ${star} bintang (${c} ulasan)`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)', background: isActive ? 'var(--color-bg-secondary)' : 'transparent', border: isActive ? '1px solid var(--color-border)' : '1px solid transparent', borderRadius: '8px', padding: '4px 6px', cursor: 'pointer', transition: 'all 0.18s ease', textAlign: 'left', width: '100%' }}
                  >
                    <span style={{ width: '18px', textAlign: 'right', fontWeight: 700, flexShrink: 0 }}>{star}</span>
                    <div style={{ flex: 1, height: '6px', background: 'var(--color-bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: star >= 4 ? 'var(--color-gold)' : star === 3 ? 'var(--color-primary)' : '#e85a4a', borderRadius: '10px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                    <span style={{ width: '24px', textAlign: 'left', fontWeight: 600, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setFilterRating('all')} style={{ padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, border: filterRating === 'all' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)', background: filterRating === 'all' ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: filterRating === 'all' ? '#fff' : 'var(--color-text)', cursor: 'pointer', transition: 'all 0.18s ease' }}>
                Semua ({summary.totalReviews})
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button key={star} type="button" onClick={() => setFilterRating(filterRating === star ? 'all' : star)} style={{ padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, border: filterRating === star ? '1.5px solid var(--color-gold)' : '1px solid var(--color-border)', background: filterRating === star ? 'rgba(212,175,55,0.15)' : 'var(--color-bg-secondary)', color: filterRating === star ? 'var(--color-gold)' : 'var(--color-text)', cursor: 'pointer', transition: 'all 0.18s ease' }}>
                  {star}★
                </button>
              ))}
            </div>
            {!showReviewForm && (
              <button
                type="button" onClick={() => setShowReviewForm(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(201,100,39,0.1)', color: 'var(--color-primary)', border: '1.5px solid rgba(201,100,39,0.28)', padding: '6px 14px', borderRadius: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(201,100,39,0.18)'; e.currentTarget.style.transform='translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(201,100,39,0.1)'; e.currentTarget.style.transform='translateY(0)' }}
              >
                <MessageSquare size={14} />Tulis Ulasan
              </button>
            )}
          </div>

          {/* 4. Review Form */}
          {showReviewForm && (
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeInUp 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Sparkles size={16} style={{ color: 'var(--color-gold)' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text)', fontFamily: 'var(--font-playfair)' }}>Bagikan Kesan Rasa Kamu</span>
                </div>
                <button type="button" onClick={() => setShowReviewForm(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.78rem', padding: '4px 8px', borderRadius: '6px' }}>Batal</button>
              </div>

              {currentUser ? (
                <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600 }}>Beri Bintang Kepuasan:</label>
                    <RatingStars rating={userRating} interactive onChange={(r) => setUserRating(r)} size={26} showLabel />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Ulasan / Komentar:</label>
                      <span style={{ fontSize: '0.7rem', color: charColor, fontVariantNumeric: 'tabular-nums' }}>{charLeft} karakter tersisa</span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        rows={3} value={userComment}
                        onChange={(e) => { if (e.target.value.length <= MAX_COMMENT) setUserComment(e.target.value) }}
                        placeholder="Bagaimana cita rasa, tekstur, atau kesegaran racikan menu ini?"
                        style={{ width: '100%', background: 'var(--color-bg-card)', border: `1.5px solid ${submitError ? '#e85a4a' : 'var(--color-border)'}`, borderRadius: '12px', padding: '0.75rem', paddingBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text)', outline: 'none', resize: 'vertical', transition: 'border-color 0.15s ease, box-shadow 0.15s ease', fontFamily: 'var(--font-inter)', lineHeight: 1.55 }}
                        onFocus={(e) => { e.target.style.borderColor='var(--color-primary)'; e.target.style.boxShadow='0 0 0 3px var(--color-primary-glow)' }}
                        onBlur={(e) => { e.target.style.borderColor=submitError ? '#e85a4a' : 'var(--color-border)'; e.target.style.boxShadow='none' }}
                      />
                      <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px', height: '2px', background: 'var(--color-bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${charPercent}%`, height: '100%', background: charLeft <= 20 ? '#e85a4a' : charLeft <= 60 ? 'var(--color-gold)' : 'var(--color-primary)', borderRadius: '2px', transition: 'width 0.15s ease, background 0.15s ease' }} />
                      </div>
                    </div>
                  </div>
                  {submitError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#e85a4a', background: 'rgba(232,90,74,0.08)', border: '1px solid rgba(232,90,74,0.2)', borderRadius: '8px', padding: '8px 12px', animation: 'fadeInUp 0.18s ease forwards' }}>
                      <AlertCircle size={14} /><span>{submitError}</span>
                    </div>
                  )}
                  {submitSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.78rem', color: '#4a9e6a', background: 'rgba(74,158,106,0.08)', border: '1px solid rgba(74,158,106,0.2)', borderRadius: '8px', padding: '8px 12px', animation: 'fadeInUp 0.18s ease forwards' }}>
                      <CheckCircle2 size={14} /><span>Ulasan kamu berhasil tersimpan! Terima kasih banyak.</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit" disabled={submitting}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: submitting ? 'var(--color-bg-secondary)' : 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: submitting ? 'var(--color-text-muted)' : '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem 1.35rem', fontSize: '0.85rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 16px var(--color-primary-glow)', transition: 'all 0.2s ease' }}
                    >
                      <Send size={14} style={{ opacity: submitting ? 0.4 : 1 }} />
                      {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--color-bg-card)', borderRadius: '14px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(201,100,39,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}><LogIn size={22} /></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: '280px', lineHeight: 1.55 }}>Silakan masuk ke akun Lorong Rasa kamu terlebih dahulu untuk menuliskan ulasan menu ini.</p>
                  <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-dark))', color: '#fff', padding: '0.5rem 1.35rem', borderRadius: '9px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px var(--color-primary-glow)' }}>Masuk Sekarang</Link>
                </div>
              )}
            </div>
          )}

          {/* 5. Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={15} style={{ color: 'var(--color-text-muted)' }} />
              Ulasan Pelanggan
              <span style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '0px 8px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{filteredReviews.length}</span>
            </h4>

            {loadingReviews ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map((i) => <ReviewSkeleton key={i} />)}
              </div>
            ) : filteredReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--color-bg-secondary)', borderRadius: '18px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.2s ease forwards' }}>
                <Coffee size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.25 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: '240px', lineHeight: 1.55 }}>
                  {filterRating === 'all' ? 'Belum ada ulasan untuk menu ini. Jadilah yang pertama!' : `Belum ada ulasan dengan ${filterRating} bintang untuk menu ini.`}
                </p>
                {filterRating !== 'all' && (
                  <button type="button" onClick={() => setFilterRating('all')} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px 14px', fontSize: '0.78rem', color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.15s ease' }}>Lihat semua ulasan</button>
                )}
              </div>
            ) : (
              filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor='var(--color-border-light)'; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor='var(--color-border)'; e.currentTarget.style.boxShadow='none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div aria-hidden="true" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--color-primary),var(--color-gold))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0, boxShadow: '0 2px 8px var(--color-primary-glow)' }}>
                        {rev.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{rev.user_name}</span>
                          {rev.order_id && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(74,158,106,0.12)', color: '#4a9e6a', border: '1px solid rgba(74,158,106,0.25)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              <ShieldCheck size={10} />Terverifikasi
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.71rem', color: 'var(--color-text-muted)', display: 'block' }}>
                          {new Date(rev.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <RatingStars rating={rev.rating} size={14} />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.62, margin: 0, fontFamily: 'var(--font-inter)' }}>{rev.comment}</p>
                  {rev.reply && (
                    <div style={{ marginTop: '4px', background: 'var(--color-bg-secondary)', borderLeft: '3px solid var(--color-gold)', borderRadius: '0 10px 10px 0', padding: '0.65rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                        <CornerDownRight size={12} /><span>Balasan Barista Lorong Rasa</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55, fontFamily: 'var(--font-inter)' }}>{rev.reply}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
