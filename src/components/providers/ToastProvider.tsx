'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Check, X, ShoppingBag } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'cart'
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: 'var(--color-bg-card)',
              border: `1px solid ${toast.type === 'error' ? '#e85a4a44' : toast.type === 'cart' ? 'var(--color-primary)' : '#4a9e6a44'}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              animation: 'toastSlideIn 0.3s ease, toastFadeOut 0.3s ease 2.2s forwards',
              pointerEvents: 'auto',
              maxWidth: '320px',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: toast.type === 'error' ? '#e85a4a22' : toast.type === 'cart' ? 'var(--color-primary-glow)' : '#4a9e6a22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {toast.type === 'error' ? (
                <X size={14} color="#e85a4a" />
              ) : toast.type === 'cart' ? (
                <ShoppingBag size={14} style={{ color: 'var(--color-primary)' }} />
              ) : (
                <Check size={14} color="#4a9e6a" />
              )}
            </div>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-inter)',
              fontWeight: 500,
            }}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                padding: '2px',
                marginLeft: 'auto',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: translateY(10px); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
