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
import { generateBarcodeBars } from './BarcodeSVG'
import { parseProductPool } from '@/lib/voucher-draw'

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
  const shareUrl = `${baseUrl}/voucher/${encodeURIComponent(shareToken)}${awardedProduct ? `?item=${encodeURIComponent(awardedProduct)}` : ''}`

  // Deteksi multi-menu dari voucher
  const pool = parseProductPool(voucher.product_name)
  const allPoolItems = pool.items.length > 0 ? pool.items : productPoolItems
  const isMultiItem = !awardedProduct && allPoolItems.length > 1

  // Tentukan judul diskon & subjudul hadiah
  let headlineValue = ''
  let subHeadline = ''

  if (voucher.discount_type === 'percentage') {
    headlineValue = `${voucher.discount_value}% OFF`
    subHeadline = 'Semua Menu Specialty Coffee & Kudapan'
  } else if (voucher.discount_type === 'fixed') {
    headlineValue = `Rp ${(voucher.discount_value / 1000).toFixed(0)}K OFF`
    subHeadline = `Potongan langsung Rp ${voucher.discount_value.toLocaleString('id-ID')}`
  } else {
    headlineValue = voucher.discount_value === 100 ? 'GRATIS 100%' : `DISKON ${voucher.discount_value}%`
    if (awardedProduct) {
      subHeadline = `Menu: ${awardedProduct}`
    } else if (isMultiItem) {
      subHeadline =
        allPoolItems.length === 2
          ? `Pilihan 2 Menu: ${allPoolItems[0]} atau ${allPoolItems[1]}`
          : `Pilihan ${allPoolItems.length} Menu Spesifik`
    } else {
      const singleItem = allPoolItems[0] || voucher.product_name || 'Menu Pilihan'
      subHeadline = `Menu: ${singleItem}`
    }
  }

  const benefitText = `${headlineValue} (${subHeadline})`

  // Teks WhatsApp yang sangat ringkas, rapi & to-the-point
  const handleShareWhatsApp = () => {
    let menuDetails = ''
    if (isMultiItem) {
      const preview = allPoolItems.slice(0, 4).join(', ')
      const more = allPoolItems.length > 4 ? ` (+${allPoolItems.length - 4} lainnya)` : ''
      menuDetails = `📋 *Daftar Menu:* ${preview}${more}\n`
    }

    const text =
      `🎟️ *VOUCHER LORONG RASA*\n` +
      `Kode: *${cleanCode}*\n` +
      `🎁 Promo: *${benefitText}*\n` +
      menuDetails +
      `\n📲 *Buka barcode & klaim di sini:*\n` +
      `${shareUrl}`

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download gambar kartu voucher berkualitas tinggi (Retina 900x1350) dengan QR Code & Barcode asli
  const handleDownloadImage = async () => {
    try {
      setIsGeneratingImg(true)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = 900
      const height = 1350
      canvas.width = width
      canvas.height = height

      // Helper membuat jalur rounded rect
      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        if (ctx.roundRect) {
          ctx.beginPath()
          ctx.roundRect(x, y, w, h, r)
        } else {
          ctx.beginPath()
          ctx.moveTo(x + r, y)
          ctx.lineTo(x + w - r, y)
          ctx.quadraticCurveTo(x + w, y, x + w, y + r)
          ctx.lineTo(x + w, y + h - r)
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
          ctx.lineTo(x + r, y + h)
          ctx.quadraticCurveTo(x, y + h, x, y + h - r)
          ctx.lineTo(x, y + r)
          ctx.quadraticCurveTo(x, y, x + r, y)
          ctx.closePath()
        }
      }

      // Helper teks adaptif agar tidak meluap (auto-fit fontSize)
      const drawFittedText = (
        text: string,
        centerX: number,
        centerY: number,
        maxW: number,
        maxFontSize: number,
        fontFamily: string,
        fontWeight: string = 'bold'
      ) => {
        let size = maxFontSize
        ctx.font = `${fontWeight} ${size}px ${fontFamily}`
        while (ctx.measureText(text).width > maxW && size > 16) {
          size -= 2
          ctx.font = `${fontWeight} ${size}px ${fontFamily}`
        }
        ctx.fillText(text, centerX, centerY)
        return size
      }

      // 1. Ambil QR Code SVG langsung dari kartu yang dirender di modal
      let qrImg: HTMLImageElement | null = null
      try {
        const qrSvgEl = cardRef.current?.querySelector('.voucher-physical-qrcode-svg') as SVGElement | null
        if (qrSvgEl) {
          const svgData = new XMLSerializer().serializeToString(qrSvgEl)
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const svgUrl = URL.createObjectURL(svgBlob)
          const tempImg = new Image()
          await new Promise<void>((resolve) => {
            tempImg.onload = () => {
              qrImg = tempImg
              resolve()
            }
            tempImg.onerror = () => resolve()
            tempImg.src = svgUrl
          })
          URL.revokeObjectURL(svgUrl)
        }
      } catch (e) {
        console.warn('QR code capture notice:', e)
      }

      const cardMargin = 30
      const cardX = cardMargin
      const cardY = cardMargin
      const cardW = width - cardMargin * 2
      const cardH = height - cardMargin * 2
      const cardR = 28
      const headerH = 240
      const notchY = cardY + headerH

      // 2. Gambar dasar kartu dengan sudut melengkung
      ctx.save()
      drawRoundRect(cardX, cardY, cardW, cardH, cardR)
      ctx.fillStyle = '#faf7f2'
      ctx.fill()
      ctx.clip()

      // 3. Header Gelap Mewah (Gradient Espresso)
      const gradHeader = ctx.createLinearGradient(cardX, cardY, cardX, cardY + headerH)
      gradHeader.addColorStop(0, '#190e07')
      gradHeader.addColorStop(0.5, '#331c0e')
      gradHeader.addColorStop(1, '#221209')
      ctx.fillStyle = gradHeader
      ctx.fillRect(cardX, cardY, cardW, headerH)

      // Aksen Glow Radial Emas
      const gradGlow = ctx.createRadialGradient(
        cardX + cardW - 50,
        cardY + 50,
        10,
        cardX + cardW - 50,
        cardY + 50,
        180
      )
      gradGlow.addColorStop(0, 'rgba(212, 175, 55, 0.28)')
      gradGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = gradGlow
      ctx.fillRect(cardX, cardY, cardW, headerH)

      // Border ornamen dalam header
      ctx.strokeStyle = 'rgba(212, 160, 74, 0.35)'
      ctx.lineWidth = 2
      ctx.strokeRect(cardX + 24, cardY + 24, cardW - 48, headerH - 48)

      // Brand sub-header
      ctx.fillStyle = '#d4a04a'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('☕ LORONG RASA WAJAK — SPECIALTY COFFEE', cardX + 44, cardY + 70)

      // Judul Kartu
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 44px serif'
      ctx.fillText('Official Voucher Card', cardX + 44, cardY + 130)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.font = '19px sans-serif'
      ctx.fillText('Tiket Resmi Diskon & Promo Lorong Rasa', cardX + 44, cardY + 172)

      // Badge Stamp "VERIFIED" di pojok kanan header
      const stampX = cardX + cardW - 175
      const stampY = cardY + 60
      drawRoundRect(stampX, stampY, 130, 40, 20)
      ctx.fillStyle = 'rgba(212, 160, 74, 0.2)'
      ctx.fill()
      ctx.strokeStyle = '#d4a04a'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#fce4a6'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('★ VERIFIED', stampX + 65, stampY + 25)

      ctx.restore()

      // 4. Garis Perforasi Putus-putus
      ctx.strokeStyle = '#d4a04a'
      ctx.lineWidth = 3
      ctx.setLineDash([12, 10])
      ctx.beginPath()
      ctx.moveTo(cardX + 36, notchY)
      ctx.lineTo(cardX + cardW - 36, notchY)
      ctx.stroke()
      ctx.setLineDash([])

      // 5. Lubang Gerigi Notch Kiri & Kanan (Potongan Tembus Pandang / Transparent Cutouts)
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(cardX, notchY, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cardX + cardW, notchY, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 6. Border Luar Emas Mengelilingi Kartu
      ctx.save()
      drawRoundRect(cardX, cardY, cardW, cardH, cardR)
      ctx.strokeStyle = 'rgba(212, 160, 74, 0.45)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()

      // 7. Bagian Keuntungan Voucher
      ctx.fillStyle = '#8c6b3e'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('KEUNTUNGAN VOUCHER', width / 2, cardY + headerH + 68)

      // Headline Nilai Diskon
      ctx.fillStyle = '#c96427'
      drawFittedText(headlineValue, width / 2, cardY + headerH + 144, cardW - 80, 74, 'serif')

      // Subheadline / Rincian Menu
      ctx.fillStyle = '#3d2b1f'
      drawFittedText(`🏷️ ${subHeadline}`, width / 2, cardY + headerH + 192, cardW - 90, 24, 'sans-serif')

      // Render Badge Chips yang Rapi & Profesional jika Multi Menu
      let codeBoxOffset = 235
      if (isMultiItem && allPoolItems.length > 0) {
        const displayChips =
          allPoolItems.length <= 4
            ? allPoolItems
            : [...allPoolItems.slice(0, 3), `+${allPoolItems.length - 3} lainnya`]

        ctx.font = 'bold 15px sans-serif'
        const chipPad = 22
        const chipGap = 10
        const chipH = 32
        const chipWidths = displayChips.map((c) => ctx.measureText(c).width + chipPad)
        const totalW = chipWidths.reduce((a, b) => a + b, 0) + (displayChips.length - 1) * chipGap

        let cx = (width - totalW) / 2
        const chipY = cardY + headerH + 214

        for (let i = 0; i < displayChips.length; i++) {
          const cw = chipWidths[i]
          const isMore = displayChips[i].startsWith('+')

          drawRoundRect(cx, chipY, cw, chipH, 8)
          ctx.fillStyle = isMore ? 'rgba(201, 100, 39, 0.12)' : '#efe7da'
          ctx.fill()
          ctx.strokeStyle = isMore ? '#c96427' : 'rgba(196, 122, 46, 0.35)'
          ctx.lineWidth = 1.2
          ctx.stroke()

          ctx.fillStyle = isMore ? '#c96427' : '#54361c'
          ctx.font = 'bold 15px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(displayChips[i], cx + cw / 2, chipY + 21)

          cx += cw + chipGap
        }

        codeBoxOffset = 262
      }

      // 8. Box Stempel Kode Voucher
      const codeBoxY = cardY + headerH + codeBoxOffset
      const codeBoxH = 110
      const codeBoxW = cardW - 80
      const codeBoxX = cardX + 40

      drawRoundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 18)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#c96427'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 8])
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#888888'
      ctx.font = 'bold 17px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('KODE VOUCHER', codeBoxX + 32, codeBoxY + 40)

      ctx.fillStyle = '#c96427'
      ctx.textAlign = 'left'
      drawFittedText(cleanCode, codeBoxX + 32, codeBoxY + 86, codeBoxW - 200, 48, 'monospace')

      // Badge "VALID CODE"
      const validBadgeW = 120
      const validBadgeX = codeBoxX + codeBoxW - validBadgeW - 28
      const validBadgeY = codeBoxY + 36
      drawRoundRect(validBadgeX, validBadgeY, validBadgeW, 38, 8)
      ctx.fillStyle = 'rgba(201, 100, 39, 0.12)'
      ctx.fill()
      ctx.fillStyle = '#c96427'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('VALID CODE', validBadgeX + validBadgeW / 2, validBadgeY + 24)

      // 9. Box Panel Kasir: Barcode 1D + QR Code Side-by-Side
      const validBoxY = codeBoxY + codeBoxH + 30
      const validBoxH = 260
      const validBoxW = cardW - 80
      const validBoxX = cardX + 40

      drawRoundRect(validBoxX, validBoxY, validBoxW, validBoxH, 20)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#e6ded1'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#888888'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('BARCODE PEMINDAI KASIR (1D)', validBoxX + 32, validBoxY + 36)

      // Gambar Barcode 1D Presisi
      const barcodeY = validBoxY + 54
      const barcodeH = 95
      const barcodeMaxW = validBoxW - (qrImg ? 260 : 64)
      const bars = generateBarcodeBars(cleanCode)
      const totalUnits = bars.reduce((sum, b) => sum + b.width, 0)
      const unitW = barcodeMaxW / totalUnits
      let bx = validBoxX + 32

      ctx.fillStyle = '#1a1412'
      for (const bar of bars) {
        const bw = bar.width * unitW
        if (!bar.isSpace) {
          ctx.fillRect(bx, barcodeY, bw, barcodeH)
        }
        bx += bw
      }

      ctx.fillStyle = '#1a1412'
      ctx.font = 'bold 22px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`* ${cleanCode} *`, validBoxX + 32 + barcodeMaxW / 2, barcodeY + barcodeH + 34)

      // Panel QR Code Kasir
      if (qrImg) {
        const sepX = validBoxX + barcodeMaxW + 55
        ctx.strokeStyle = '#ebe4d8'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(sepX, validBoxY + 30)
        ctx.lineTo(sepX, validBoxY + validBoxH - 30)
        ctx.stroke()

        const qrBoxX = sepX + 25
        const qrBoxY = validBoxY + 36
        const qrSize = 145

        drawRoundRect(qrBoxX, qrBoxY, qrSize, qrSize, 12)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#e6ded1'
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.drawImage(qrImg, qrBoxX + 8, qrBoxY + 8, qrSize - 16, qrSize - 16)

        ctx.fillStyle = '#555555'
        ctx.font = 'bold 15px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('PINDAI QR', qrBoxX + qrSize / 2, qrBoxY + qrSize + 24)
      }

      // 10. Informasi Masa Berlaku & Ketentuan
      const termsY = validBoxY + validBoxH + 46
      ctx.fillStyle = '#4a3b32'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('TUNJUKKAN KODE ATAU BARCODE INI KE KASIR LORONG RASA', width / 2, termsY)

      ctx.fillStyle = '#7a6e65'
      ctx.font = '18px sans-serif'
      const expiryText = voucher.expires_at
        ? `⏳ Berlaku hingga: ${new Date(voucher.expires_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`
        : '⏳ Berlaku Selamanya'
      const minOrderText = (voucher.min_order || 0) > 0
        ? ` • Min. belanja: Rp ${(voucher.min_order || 0).toLocaleString('id-ID')}`
        : ' • Tanpa minimum belanja'
      ctx.fillText(`${expiryText}${minOrderText}`, width / 2, termsY + 32)

      if (isMultiItem) {
        ctx.fillStyle = '#8c6b3e'
        ctx.font = 'italic 16px sans-serif'
        ctx.fillText(
          `* Berlaku untuk salah satu dari ${allPoolItems.length} menu pilihan di atas`,
          width / 2,
          termsY + 60
        )
      }

      // 11. Footer Strip Mewah di bagian bawah kartu
      ctx.save()
      const footerH = 90
      const footerY = cardY + cardH - footerH
      drawRoundRect(cardX, footerY, cardW, footerH, 0)
      ctx.fillStyle = '#ece3d5'
      ctx.fill()

      ctx.fillStyle = '#3a2b22'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`🌐 Klaim & Pesan Online: ${shareUrl.replace(/^https?:\/\//, '')}`, width / 2, footerY + 52)
      ctx.restore()

      // 12. Konversi ke file PNG dan trigger download
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
