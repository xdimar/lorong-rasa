'use client'

import { useState } from 'react'
import { Printer, Copy, Check, X, Share2, Loader2 } from 'lucide-react'

export interface ReceiptOrder {
  id: string
  customer_name: string
  customer_phone?: string | null
  order_type: 'dine_in' | 'takeaway'
  table_number?: string | null
  payment_method: 'qris' | 'cash'
  payment_status: 'unpaid' | 'paid'
  status: string
  total_amount: number
  discount_amount: number
  voucher_code?: string | null
  notes?: string | null
  created_at: string
  cash_received?: number
  change_amount?: number
  loyalty_points_earned?: number | null
  customer_tier?: string | null
}

export interface ReceiptItem {
  id?: string
  menu_item_name: string
  quantity: number
  price: number
  subtotal: number
  notes?: string | null
}

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  order: ReceiptOrder | null
  items: ReceiptItem[]
  cashierName?: string
  title?: string
}

export function ReceiptModal({
  isOpen,
  onClose,
  order,
  items,
  cashierName = 'Kasir Lorong Rasa',
  title = 'Struk Pembelian',
}: ReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm')
  const [copied, setCopied] = useState(false)

  if (!isOpen || !order) return null

  const orderDate = order.created_at ? new Date(order.created_at) : null
  const formattedDate = orderDate
    ? orderDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-'
  const formattedTime = orderDate
    ? orderDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  const subtotal = items.reduce((acc, it) => acc + (it.subtotal || it.price * it.quantity), 0)
  const discount = order.discount_amount || 0
  const finalTotal = order.total_amount || Math.max(0, subtotal - discount)
  const shortOrderId = order.id ? order.id.slice(0, 8).toUpperCase() : 'LR-WALKIN'
  const [isPrinting, setIsPrinting] = useState(false)

  // Dedicated thermal receipt printer handler using an isolated iframe
  const handlePrint = () => {
    setIsPrinting(true)
    try {
      const printableElement = document.getElementById('thermal-receipt-printable')
      if (!printableElement) {
        window.print()
        setIsPrinting(false)
        return
      }

      // Create an invisible iframe for dedicated printing
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = 'none'
      iframe.style.visibility = 'hidden'
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document || iframe.contentDocument
      if (!doc) {
        window.print()
        setIsPrinting(false)
        return
      }

      const receiptHtml = printableElement.innerHTML
      const widthVal = paperWidth === '58mm' ? '58mm' : '80mm'
      const fontSize = paperWidth === '58mm' ? '11px' : '13px'

      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Struk_${shortOrderId}</title>
            <style>
              @page {
                size: ${widthVal} auto;
                margin: 0mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              html, body {
                width: ${widthVal};
                margin: 0 auto;
                padding: 3mm 2mm;
                background: #ffffff !important;
                color: #000000 !important;
                font-family: 'Courier New', Courier, monospace, monospace !important;
                font-size: ${fontSize} !important;
                line-height: 1.35 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              div, span, p, table, td, th {
                color: #000000 !important;
              }
            </style>
          </head>
          <body>
            ${receiptHtml}
          </body>
        </html>
      `)
      doc.close()

      // Give browser brief time to parse DOM before opening print dialog
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => {
          try {
            document.body.removeChild(iframe)
          } catch {
            // ignore
          }
          setIsPrinting(false)
        }, 1500)
      }, 250)
    } catch (err) {
      console.error('Dedicated iframe print failed, falling back to window.print():', err)
      window.print()
      setIsPrinting(false)
    }
  }

  const handleShareWhatsApp = () => {
    const text = generateReceiptText()
    const cleanPhone = (order.customer_phone || '').replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : cleanPhone.startsWith('8')
      ? '62' + cleanPhone
      : cleanPhone
    const url = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const generateReceiptText = () => {
    const divider = '--------------------------------'
    let text = `=== LORONG RASA ===\n`
    text += `Kopi & Kudapan Tradisional\n`
    text += `${divider}\n`
    text += `No. Pesanan : #${shortOrderId}\n`
    text += `Waktu       : ${formattedDate}, ${formattedTime}\n`
    text += `Kasir       : ${cashierName}\n`
    text += `Pelanggan   : ${order.customer_name}\n`
    text += `Tipe        : ${order.order_type === 'dine_in' ? `Dine-in (Meja ${order.table_number || '-'})` : 'Takeaway (Bungkus)'}\n`
    text += `${divider}\n`
    items.forEach((item) => {
      text += `${item.menu_item_name}\n`
      text += `  ${item.quantity} x Rp ${item.price.toLocaleString('id-ID')} = Rp ${(item.price * item.quantity).toLocaleString('id-ID')}\n`
      if (item.notes) text += `  * ${item.notes}\n`
    })
    text += `${divider}\n`
    text += `Subtotal    : Rp ${subtotal.toLocaleString('id-ID')}\n`
    if (discount > 0) {
      text += `Diskon      : -Rp ${discount.toLocaleString('id-ID')}${order.voucher_code ? ` (${order.voucher_code})` : ''}\n`
    }
    text += `TOTAL       : Rp ${finalTotal.toLocaleString('id-ID')}\n`
    text += `Metode Bayar: ${order.payment_method === 'cash' ? 'TUNAI' : 'QRIS'}\n`
    if (order.payment_method === 'cash' && order.cash_received) {
      text += `Tunai Diterima: Rp ${order.cash_received.toLocaleString('id-ID')}\n`
      text += `Kembalian   : Rp ${(order.change_amount || 0).toLocaleString('id-ID')}\n`
    }
    text += `Status      : LUNAS\n`
    text += `${divider}\n`
    text += `Terima kasih atas kunjungannya!\n`
    text += `Instagram: @rasalorong\n`
    return text
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateReceiptText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Failed to copy receipt text', err)
    }
  }

  return (
    <>
      {/* Fallback Standard Print Style for Thermal Printers */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable,
          #thermal-receipt-printable * {
            visibility: visible !important;
          }
          #thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 3mm 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: ${paperWidth === '58mm' ? '11px' : '13px'} !important;
            line-height: 1.35 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
            margin: 0mm;
          }
        }
      `,
        }}
      />

      {/* Screen Modal Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          zIndex: 9999,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg-secondary)',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(201, 100, 39, 0.15)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Printer size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                  {title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Format Thermal POS Printer
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Paper Width Selector */}
              <div
                style={{
                  display: 'flex',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '2px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: paperWidth === '58mm' ? 'var(--color-primary)' : 'transparent',
                    color: paperWidth === '58mm' ? '#ffffff' : 'var(--color-text-muted)',
                  }}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: paperWidth === '80mm' ? 'var(--color-primary)' : 'transparent',
                    color: paperWidth === '80mm' ? '#ffffff' : 'var(--color-text-muted)',
                  }}
                >
                  80mm
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Receipt Preview Area */}
          <div
            style={{
              padding: '0.85rem 0.5rem',
              overflowY: 'auto',
              display: 'flex',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* The Actual Receipt Paper Container */}
            <div
              id="thermal-receipt-printable"
              style={{
                width: paperWidth === '58mm' ? '280px' : '340px',
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#ffffff',
                color: '#1a1a1a',
                padding: '16px 12px',
                borderRadius: '6px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: paperWidth === '58mm' ? '12px' : '13px',
                lineHeight: 1.35,
                transition: 'width 0.2s',
              }}
            >
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '1px', color: '#000' }}>
                  LORONG RASA
                </div>
                <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px' }}>
                  Cita Rasa Hangat Penuh Cerita
                </div>
                <div style={{ fontSize: '0.7rem', color: '#777' }}>
                  Kopi & Kudapan Tradisional
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

              {/* Meta Info */}
              <div style={{ fontSize: '0.75rem', color: '#333', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No. Order:</span>
                  <span style={{ fontWeight: 700 }}>#{shortOrderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tanggal:</span>
                  <span>{formattedDate}, {formattedTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kasir:</span>
                  <span>{cashierName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pelanggan:</span>
                  <span style={{ fontWeight: 600 }}>{order.customer_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tipe Order:</span>
                  <span style={{ fontWeight: 700 }}>
                    {order.order_type === 'dine_in'
                      ? `Dine-in (Meja ${order.table_number || '-'})`
                      : 'Takeaway (Bungkus)'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

              {/* Item List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: '#111' }}>{it.menu_item_name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444' }}>
                      <span>
                        {it.quantity} x Rp {it.price.toLocaleString('id-ID')}
                      </span>
                      <span style={{ fontWeight: 600, color: '#111' }}>
                        Rp {(it.price * it.quantity).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {it.notes && (
                      <div style={{ fontSize: '0.7rem', color: '#777', fontStyle: 'italic', paddingLeft: '4px' }}>
                        * {it.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

              {/* Totals */}
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>

                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c42e2e' }}>
                    <span>Diskon {order.voucher_code ? `(${order.voucher_code})` : ''}:</span>
                    <span>-Rp {discount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px solid #111',
                    color: '#000',
                  }}
                >
                  <span>TOTAL:</span>
                  <span>Rp {finalTotal.toLocaleString('id-ID')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', color: '#444' }}>
                  <span>Metode:</span>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    {order.payment_method === 'cash' ? 'TUNAI (CASH)' : 'QRIS'}
                  </span>
                </div>

                {order.payment_method === 'cash' && order.cash_received !== undefined && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444' }}>
                      <span>Diterima:</span>
                      <span>Rp {order.cash_received.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#111' }}>
                      <span>Kembalian:</span>
                      <span>Rp {(order.change_amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}

                {order.loyalty_points_earned && order.loyalty_points_earned > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1a5f2a', fontWeight: 700, marginTop: '4px' }}>
                    <span>Poin Rasa Diperoleh:</span>
                    <span>+{order.loyalty_points_earned} Pts</span>
                  </div>
                ) : null}
              </div>

              <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

              {/* Status Badge */}
              <div style={{ textAlign: 'center', margin: '6px 0' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    border: '1px solid #222',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  *** LUNAS / PAID ***
                </span>
              </div>

              <div style={{ borderTop: '1px dashed #444', margin: '8px 0' }} />

              {/* Footer */}
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#666', marginTop: '6px' }}>
                <div>Terima Kasih atas Kunjungannya!</div>
                <div>Nikmati setiap tegukan & rasa.</div>
                <div style={{ marginTop: '4px', fontWeight: 600 }}>Instagram: @rasalorong</div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'var(--color-bg-secondary)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyText}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied ? <Check size={14} style={{ color: '#4a9e6a' }} /> : <Copy size={14} />}
                {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(37, 211, 102, 0.12)',
                  color: '#25D366',
                  border: '1px solid rgba(37, 211, 102, 0.35)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Kirim struk teks via WhatsApp"
              >
                <Share2 size={13} />
                Kirim WA
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Tutup
              </button>

              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isPrinting ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(201, 100, 39, 0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isPrinting ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                {isPrinting ? 'Mempersiapkan...' : 'Cetak Struk Thermal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
