'use client'

import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Coffee } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/components/providers/CartProvider'

export function CartDrawer() {
  const { items, isCartOpen, closeCart, updateQuantity, removeItem, totalItems, subtotal, discount, total, voucher } = useCart()

  if (!isCartOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1500,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '420px',
          background: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 1600,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-bg-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{
              fontSize: '1.1rem',
              fontFamily: 'var(--font-playfair)',
              color: 'var(--color-text)',
            }}>
              Keranjang
            </h2>
            {totalItems > 0 && (
              <span style={{
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'var(--font-inter)',
              }}>
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <Coffee size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
              <p style={{
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.9rem',
              }}>
                Keranjang masih kosong
              </p>
              <Link
                href="/menu"
                onClick={closeCart}
                className="btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
              >
                Lihat Menu
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map(item => (
                <div
                  key={item.id}
                  className="cart-item-card"
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    gap: '0.85rem',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Image */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '10px',
                    background: item.image_url
                      ? `url(${item.image_url}) center/cover`
                      : 'linear-gradient(135deg, var(--color-primary-glow), var(--color-primary))',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {!item.image_url && <Coffee size={20} color="white" />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <h4 style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.name}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-primary)',
                          fontFamily: 'var(--font-inter)',
                          fontWeight: 500,
                        }}>
                          {item.category}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="cart-trash-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          padding: '2px',
                          flexShrink: 0,
                          transition: 'color 0.2s',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '0.5rem',
                    }}>
                      {/* Quantity controls */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="cart-qty-btn"
                          style={{
                            width: '28px',
                            height: '28px',
                            background: 'var(--color-bg-secondary)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)',
                            transition: 'background 0.15s',
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{
                          width: '32px',
                          textAlign: 'center',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-inter)',
                          background: 'var(--color-bg)',
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="cart-qty-btn"
                          style={{
                            width: '28px',
                            height: '28px',
                            background: 'var(--color-bg-secondary)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)',
                            transition: 'background 0.15s',
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Price */}
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        fontFamily: 'var(--font-playfair)',
                      }}>
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{
            borderTop: '1px solid var(--color-border)',
            padding: '1.25rem 1.5rem',
            background: 'var(--color-bg-card)',
          }}>
            {/* Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Subtotal ({totalItems} item)</span>
                <span style={{ color: 'var(--color-text)' }}>Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              {voucher && discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
                  <span style={{ color: '#4a9e6a' }}>Diskon ({voucher.code})</span>
                  <span style={{ color: '#4a9e6a', fontWeight: 600 }}>-Rp {discount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 700,
                paddingTop: '0.5rem',
                borderTop: '1px dashed var(--color-border)',
              }}>
                <span style={{ color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>Total</span>
                <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-playfair)', fontSize: '1.15rem' }}>
                  Rp {total.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Checkout button */}
            <Link
              href="/checkout"
              onClick={closeCart}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.85rem',
                fontSize: '0.95rem',
                gap: '8px',
              }}
            >
              Checkout
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
