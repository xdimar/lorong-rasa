'use client'

import React, { useState, useRef } from 'react'
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  Smartphone,
  QrCode,
} from 'lucide-react'
import { PhysicalVoucherCard } from './PhysicalVoucherCard'

export interface PhysicalVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  voucher: {
    code: string
    description?: string
    discount_type: 'percentage' | 'fixed' | 'product'
    discount_value: number
    product_name?: string | null
    min_order?: number
    expires_at?: string
    share_token?: string | null
  }
  awardedProduct?: string | null
  productPoolItems?: string[]
  siteUrl?: string
}

export function PhysicalVoucherModal({
  isOpen,
  onClose,
  voucher,
  awardedProduct,
  productPoolItems = [],
  siteUrl,
}: PhysicalVoucherModalProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingImg, setIsGeneratingImg] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !voucher) return null

  const baseUrl =
    siteUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://www.lorong-rasa.my.id')
  const cleanCode = (voucher.code || '').trim().toUpperCase()
  const shareToken = voucher.share_token || cleanCode
  const shareUrl = `${baseUrl}/voucher/${encodeURIComponent(shareToken)}`

  // Tentukan ringkasan keuntungan yang singkat
  let benefitText = ''
  if (voucher.discount_type === 'percentage') {
    benefitText = `Diskon ${voucher.discount_value}% OFF`
  } else if (voucher.discount_type === 'fixed') {
    benefitText = `Potongan Rp ${(voucher.discount_value / 1000).toFixed(0)}rb`
  } else {
    const targetItem =
      awardedProduct || (productPoolItems.length > 0 ? productPoolItems[0] : voucher.product_name) || 'Menu Spesial'
    benefitText = voucher.discount_value === 100 ? `Gratis 1x ${targetItem}` : `Diskon ${voucher.discount_value}% ${targetItem}`
  }

  // Teks WhatsApp yang sangat ringkas & to-the-point
  // (WhatsApp akan otomatis memunculkan preview gambar kartu voucher & barcode dari OpenGraph link)
  const handleShareWhatsApp = () => {
    const text =
      `🎟️ *VOUCHER LORONG RASA*\n` +
      `Kode: *${cleanCode}*\n` +
      `🎁 Promo: *${benefitText}*\n\n` +
      `📲 *Buka barcode & klaim di sini:*\n` +
      `${shareUrl}`

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download gambar kartu voucher menggunakan HTML5 Canvas
  const handleDownloadImage = async () => {
    try {
      setIsGeneratingImg(true)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = 800
      const height = 1000
      canvas.width = width
      canvas.height = height

      // Background kartu
      ctx.fillStyle = '#faf7f2'
      ctx.fillRect(0, 0, width, height)

      // Header gelap mewah
      const gradHeader = ctx.createLinearGradient(0, 0, width, 240)
      gradHeader.addColorStop(0, '#1f130b')
      gradHeader.addColorStop(0.5, '#3a2213')
      gradHeader.addColorStop(1, '#2a180d')
      ctx.fillStyle = gradHeader
      ctx.fillRect(0, 0, width, 240)

      // Garis border emas di header
      ctx.strokeStyle = '#d4a04a'
      ctx.lineWidth = 3
      ctx.strokeRect(20, 20, width - 40, 200)

      // Teks Header
      ctx.fillStyle = '#d4a04a'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('LORONG RASA WAJAK — SPECIALTY COFFEE', width / 2, 70)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 44px serif'
      ctx.fillText('OFFICIAL VOUCHER CARD', width / 2, 130)

      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '20px sans-serif'
      ctx.fillText('Verified In-Store & Online Promo Voucher', width / 2, 175)

      // Garis putus-putus perforasi
      ctx.strokeStyle = '#d4a04a'
      ctx.lineWidth = 4
      ctx.setLineDash([12, 10])
      ctx.beginPath()
      ctx.moveTo(40, 240)
      ctx.lineTo(width - 40, 240)
      ctx.stroke()
      ctx.setLineDash([])

      // Perforasi lubang notch di kiri & kanan
      ctx.fillStyle = '#120c08'
      ctx.beginPath()
      ctx.arc(0, 240, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(width, 240, 30, 0, Math.PI * 2)
      ctx.fill()

      // Body: Headline Keuntungan
      ctx.fillStyle = '#8c6b3e'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('KEUNTUNGAN VOUCHER', width / 2, 310)

      ctx.fillStyle = '#c96427'
      ctx.font = 'bold 64px serif'
      ctx.fillText(benefitText.toUpperCase(), width / 2, 385)

      // Box Stempel Kode Voucher
      ctx.strokeStyle = '#c96427'
      ctx.lineWidth = 4
      ctx.setLineDash([10, 8])
      ctx.strokeRect(100, 430, width - 200, 90)
      ctx.setLineDash([])

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(102, 432, width - 204, 86)

      ctx.fillStyle = '#c96427'
      ctx.font = 'bold 46px monospace'
      ctx.fillText(cleanCode, width / 2, 492)

      // Barcode simulasi presisi
      const barcodeY = 570
      const barcodeH = 100
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(80, barcodeY - 15, width - 160, barcodeH + 50)
      ctx.strokeStyle = '#e0d8cc'
      ctx.lineWidth = 1
      ctx.strokeRect(80, barcodeY - 15, width - 160, barcodeH + 50)

      ctx.fillStyle = '#1a1412'
      let bx = 120
      const codeBars = cleanCode + '99812'
      for (let i = 0; i < codeBars.length; i++) {
        const c = codeBars.charCodeAt(i)
        const w1 = ((c % 3) + 1) * 2.5
        const s1 = (((c >> 1) % 2) + 1) * 2.5
        const w2 = (((c >> 2) % 3) + 1) * 2.5
        const s2 = (((c >> 3) % 2) + 1) * 2.5

        ctx.fillRect(bx, barcodeY, w1, barcodeH)
        bx += w1 + s1
        ctx.fillRect(bx, barcodeY, w2, barcodeH)
        bx += w2 + s2
      }

      ctx.fillStyle = '#1a1412'
      ctx.font = 'bold 22px monospace'
      ctx.fillText(`* ${cleanCode} *`, width / 2, barcodeY + barcodeH + 26)

      // Instruksi Kasir & Ketentuan
      ctx.fillStyle = '#4a3b32'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('TUNJUKKAN KODE/BARCODE INI KE KASIR LORONG RASA', width / 2, 790)

      ctx.fillStyle = '#7a6e65'
      ctx.font = '18px sans-serif'
      const expiryText = voucher.expires_at
        ? `Berlaku hingga: ${new Date(voucher.expires_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`
        : 'Berlaku Selamanya'
      ctx.fillText(expiryText, width / 2, 825)

      // Footer strip
      ctx.fillStyle = '#e8dfd3'
      ctx.fillRect(0, 920, width, 80)
      ctx.fillStyle = '#3a2b22'
      ctx.font = 'bold 20px sans-serif'
      ctx.fillText('Klaim & Pesan Online: ' + shareUrl.replace(/^https?:\/\//, ''), width / 2, 968)

      // Konversi ke file blob dan trigger download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `VOUCHER-${cleanCode}-LORONG-RASA.png`
        a.click()
        URL.revokeObjectURL(url)
        setIsGeneratingImg(false)
      }, 'image/png')
    } catch (e) {
      console.error('Failed to generate voucher image:', e)
      setIsGeneratingImg(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 6, 4, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '2.5rem 1rem 3rem',
        overflowY: 'auto',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          position: 'relative',
          margin: 'auto',
        }}
      >
        {/* Header Bar dengan Tombol Tutup yang Selalu Terlihat */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-4px' }}>
          <button
            onClick={onClose}
            type="button"
            aria-label="Tutup"
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* === KARTU VOUCHER FISIK === */}
        <PhysicalVoucherCard
          ref={cardRef}
          code={cleanCode}
          discountType={voucher.discount_type}
          discountValue={voucher.discount_value}
          productName={voucher.product_name}
          awardedProduct={awardedProduct}
          productPoolItems={productPoolItems}
          minOrder={voucher.min_order}
          expiresAt={voucher.expires_at}
          shareUrl={shareUrl}
        />

        {/* === TOMBOL AKSI SHARE & DOWNLOAD === */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Tombol Share WhatsApp Utama */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              background: '#25D366',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)',
              transition: 'transform 0.15s, background 0.15s',
            }}
          >
            <Share2 size={18} />
            Kirim ke WhatsApp
          </button>

          {/* Baris Tombol Download Gambar & Salin Link */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGeneratingImg}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              {isGeneratingImg ? 'Menyimpan...' : 'Simpan Gambar'}
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                background: copied ? 'rgba(74, 158, 106, 0.3)' : 'rgba(255,255,255,0.12)',
                border: copied ? '1px solid #4a9e6a' : '1px solid rgba(255,255,255,0.25)',
                color: copied ? '#6ee7b7' : '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Tersalin!' : 'Salin Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
