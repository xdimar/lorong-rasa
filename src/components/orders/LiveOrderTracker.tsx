'use client'

import React from 'react'
import Link from 'next/link'
import {
  Clock,
  CheckCircle2,
  Coffee,
  Bell,
  Sparkles,
  AlertCircle,
  ArrowRight,
  UtensilsCrossed,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface LiveOrderTrackerProps {
  order: {
    id: string
    status: OrderStatus
    order_type?: 'dine_in' | 'takeaway'
    table_number?: string | null
    created_at: string
    total_amount?: number
    customer_name?: string
  }
  variant?: 'full' | 'compact' | 'card'
  showQuickLinks?: boolean
}

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    stepIndex: number
    label: string
    title: string
    desc: string
    color: string
    bgColor: string
  }
> = {
  pending: {
    stepIndex: 0,
    label: 'Menunggu',
    title: 'Pesanan Diterima',
    desc: 'Pesanan Anda sudah masuk ke sistem kasir dan sedang diverifikasi.',
    color: '#e8a04a',
    bgColor: 'rgba(232, 160, 74, 0.15)',
  },
  confirmed: {
    stepIndex: 1,
    label: 'Dikonfirmasi',
    title: 'Pesanan Dikonfirmasi',
    desc: 'Kasir telah mengonfirmasi pesanan Anda. Segera diteruskan ke barista.',
    color: '#d4a04a',
    bgColor: 'rgba(212, 160, 74, 0.15)',
  },
  preparing: {
    stepIndex: 2,
    label: 'Sedang Diracik',
    title: 'Barista Sedang Meracik',
    desc: 'Kopi dan kudapan pesanan Anda sedang diseduh & diracik dengan presisi.',
    color: '#e8973a',
    bgColor: 'rgba(232, 151, 58, 0.18)',
  },
  ready: {
    stepIndex: 3,
    label: 'Siap Disajikan',
    title: 'Pesanan Telah Siap!',
    desc: 'Pesanan Anda sudah selesai dibuat dan siap disajikan di meja atau diambil di konter.',
    color: '#4a9e6a',
    bgColor: 'rgba(74, 158, 106, 0.18)',
  },
  completed: {
    stepIndex: 4,
    label: 'Selesai',
    title: 'Pesanan Selesai',
    desc: 'Terima kasih telah menikmati momen di Lorong Rasa. Sampai jumpa kembali!',
    color: '#4a9e6a',
    bgColor: 'rgba(74, 158, 106, 0.12)',
  },
  cancelled: {
    stepIndex: -1,
    label: 'Dibatalkan',
    title: 'Pesanan Dibatalkan',
    desc: 'Pesanan ini telah dibatalkan. Silakan hubungi kasir bila membutuhkan bantuan.',
    color: '#e85a4a',
    bgColor: 'rgba(232, 90, 74, 0.15)',
  },
}

const STEPS = [
  { key: 'pending', label: 'Diterima', icon: Clock },
  { key: 'confirmed', label: 'Terkonfirmasi', icon: CheckCircle2 },
  { key: 'preparing', label: 'Diracik', icon: Coffee },
  { key: 'ready', label: 'Siap', icon: Bell },
  { key: 'completed', label: 'Selesai', icon: Sparkles },
]

export function LiveOrderTracker({
  order,
  variant = 'full',
  showQuickLinks = true,
}: LiveOrderTrackerProps) {
  const currentConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending
  const currentIdx = currentConfig.stepIndex
  const isCancelled = order.status === 'cancelled'
  const isCompleted = order.status === 'completed'
  const isActive = !isCancelled && !isCompleted

  // Progress percentage (0 to 100)
  const progressPercent = isCancelled
    ? 0
    : Math.min(100, Math.max(0, (currentIdx / (STEPS.length - 1)) * 100))

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: isActive
          ? '1.5px solid var(--color-primary)'
          : '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: variant === 'compact' ? '1.25rem' : 'clamp(1.5rem, 4vw, 2.25rem)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isActive
          ? '0 12px 35px var(--color-primary-glow), 0 0 1px rgba(0,0,0,0.1)'
          : '0 4px 18px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Ambient background glow if active */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
            opacity: 0.8,
          }}
        />
      )}

      {/* Top Header: Badge, ID, Live Pulse */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isActive ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(232, 151, 58, 0.15)',
                color: 'var(--color-primary)',
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '0.76rem',
                fontWeight: 700,
                fontFamily: 'var(--font-inter)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  boxShadow: '0 0 10px var(--color-primary)',
                  display: 'inline-block',
                  animation: 'pulse 1.8s infinite',
                }}
              />
              Live Tracker
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: currentConfig.bgColor,
                color: currentConfig.color,
                padding: '4px 12px',
                borderRadius: '50px',
                fontSize: '0.76rem',
                fontWeight: 700,
                fontFamily: 'var(--font-inter)',
                textTransform: 'uppercase',
              }}
            >
              {isCancelled ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
              Status: {currentConfig.label}
            </div>
          )}

          {order.order_type && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.76rem',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-secondary)',
                padding: '4px 10px',
                borderRadius: '50px',
                fontWeight: 600,
                fontFamily: 'var(--font-inter)',
              }}
            >
              {order.order_type === 'dine_in' ? (
                <>
                  <UtensilsCrossed size={12} color="var(--color-primary)" />
                  Dine In {order.table_number ? `(Meja ${order.table_number})` : ''}
                </>
              ) : (
                <>
                  <ShoppingBag size={12} color="var(--color-gold)" />
                  Take Away
                </>
              )}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'var(--color-primary)',
            background: 'var(--color-bg-secondary)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          #{order.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Main Status Headline */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h3
          style={{
            fontSize: variant === 'compact' ? '1.2rem' : '1.45rem',
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {currentConfig.title}
        </h3>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-inter)',
            fontSize: '0.88rem',
            lineHeight: 1.55,
          }}
        >
          {currentConfig.desc}
        </p>
      </div>

      {/* Stepper Timeline (if not cancelled) */}
      {!isCancelled && (
        <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
          {/* Progress bar background line */}
          <div
            style={{
              position: 'absolute',
              top: '18px',
              left: '5%',
              right: '5%',
              height: '3px',
              background: 'var(--color-border)',
              borderRadius: '2px',
              zIndex: 1,
            }}
          >
            {/* Active progress fill */}
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--color-primary), #4a9e6a)',
                borderRadius: '2px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px var(--color-primary-glow)',
              }}
            />
          </div>

          {/* Stepper Nodes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
              position: 'relative',
              zIndex: 2,
            }}
          >
            {STEPS.map((step, idx) => {
              const isPast = currentIdx > idx
              const isNow = currentIdx === idx
              const StepIcon = step.icon

              return (
                <div
                  key={step.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  {/* Circle Icon Node */}
                  <div
                    style={{
                      width: isNow ? '38px' : '34px',
                      height: isNow ? '38px' : '34px',
                      borderRadius: '50%',
                      background: isNow
                        ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
                        : isPast
                        ? '#4a9e6a'
                        : 'var(--color-bg-card)',
                      border: isPast || isNow ? 'none' : '2px solid var(--color-border)',
                      color: isPast || isNow ? '#ffffff' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isNow
                        ? '0 0 18px var(--color-primary-glow), 0 4px 10px rgba(0,0,0,0.1)'
                        : isPast
                        ? '0 2px 8px rgba(74, 158, 106, 0.25)'
                        : 'none',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isNow ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {isPast ? (
                      <CheckCircle2 size={18} strokeWidth={2.5} />
                    ) : (
                      <StepIcon
                        size={17}
                        strokeWidth={2}
                        style={{
                          animation:
                            isNow && step.key === 'preparing'
                              ? 'spin 4s linear infinite'
                              : isNow && step.key === 'ready'
                              ? 'bounce 1.5s infinite'
                              : 'none',
                        }}
                      />
                    )}
                  </div>

                  {/* Node Label */}
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-inter)',
                      fontWeight: isNow ? 700 : isPast ? 600 : 500,
                      color: isNow
                        ? 'var(--color-primary)'
                        : isPast
                        ? 'var(--color-text)'
                        : 'var(--color-text-muted)',
                      marginTop: '8px',
                      transition: 'color 0.2s',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer Details & Action Buttons */}
      {showQuickLinks && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
              Waktu Pemesanan
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              {new Date(order.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={`https://wa.me/6285196671398?text=${encodeURIComponent(
                `Halo Kasir Lorong Rasa, saya ingin menanyakan status pesanan saya #${order.id.slice(0, 8).toUpperCase()}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '50px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <MessageCircle size={14} color="#4a9e6a" />
              Chat Kasir
            </a>

            <Link
              href={`/orders/${order.id}`}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Lihat QR &amp; Struk
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
