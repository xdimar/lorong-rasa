'use client'

import React, { forwardRef } from 'react'
import { Coffee, Tag, Sparkles, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { BarcodeSVG } from './BarcodeSVG'

export interface PhysicalVoucherCardProps {
  code: string
  discountType: 'percentage' | 'fixed' | 'product'
  discountValue: number
  productName?: string | null
  awardedProduct?: string | null
  productPoolItems?: string[]
  minOrder?: number
  expiresAt?: string
  shareUrl: string
  userClaimId?: string | null
  className?: string
  compact?: boolean
}

/**
 * Komponen Kartu Voucher Fisik otentik berdesain tiket retro-luxury.
 * Dilengkapi lubang gerigi perforasi, barcode kasir 1D, dan QR Code resmi.
 */
export const PhysicalVoucherCard = forwardRef<HTMLDivElement, PhysicalVoucherCardProps>(
  function PhysicalVoucherCard(
    {
      code,
      discountType,
      discountValue,
      productName,
      awardedProduct,
      productPoolItems = [],
      minOrder = 0,
      expiresAt,
      shareUrl,
      userClaimId,
      className = '',
      compact = false,
    },
    ref
  ) {
    const cleanCode = (code || 'LORONG-RASA').toUpperCase().trim()

    // Tentukan label diskon & hadiah
    let headlineValue = ''
    let subHeadline = ''

    if (discountType === 'percentage') {
      headlineValue = `${discountValue}% OFF`
      subHeadline = 'Semua Menu Specialty Coffee & Kudapan'
    } else if (discountType === 'fixed') {
      headlineValue = `Rp ${(discountValue / 1000).toFixed(0)}K OFF`
      subHeadline = `Potongan langsung Rp ${discountValue.toLocaleString('id-ID')}`
    } else {
      // product voucher
      const targetName = awardedProduct || (productPoolItems.length > 0 ? productPoolItems[0] : productName) || 'Menu Pilihan'
      headlineValue = discountValue === 100 ? 'GRATIS 100%' : `DISKON ${discountValue}%`
      subHeadline = `Menu: ${targetName}`
    }

    const expiryFormatted = expiresAt
      ? new Date(expiresAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Berlaku Selamanya'

    const targetName = awardedProduct || (productPoolItems.length > 0 ? productPoolItems[0] : productName) || null
    const baseShareUrl = shareUrl || `https://www.lorong-rasa.my.id/voucher/${cleanCode}`
    const itemParam = targetName ? `?item=${encodeURIComponent(targetName)}` : ''
    const fullShareUrlWithItem = baseShareUrl.includes('item=')
      ? baseShareUrl
      : baseShareUrl.includes('?')
      ? `${baseShareUrl}${targetName ? `&item=${encodeURIComponent(targetName)}` : ''}`
      : `${baseShareUrl}${itemParam}`

    const qrValue = userClaimId
      ? `VOUCHER_CLAIM:${userClaimId}|${cleanCode}${targetName ? `|${targetName}` : ''}`
      : `VOUCHER:${cleanCode}${targetName ? `|${targetName}` : ''}`

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: '100%',
          maxWidth: compact ? '360px' : '440px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(26, 17, 10, 0.25), 0 2px 10px rgba(0,0,0,0.06)',
          border: '1.5px solid rgba(212, 160, 74, 0.4)',
          position: 'relative',
          fontFamily: 'var(--font-inter), -apple-system, sans-serif',
          color: '#1a1412',
          textAlign: 'left',
          userSelect: 'none',
        }}
      >
        {/* === HEADER TIKET MEWAH === */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1f130b 0%, #3a2213 50%, #2a180d 100%)',
            padding: compact ? '1rem 1.25rem' : '1.25rem 1.5rem',
            color: '#fdf8f3',
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '1px solid rgba(212, 160, 74, 0.3)',
          }}
        >
          {/* Aksen lingkaran abstrak emas di background */}
          <div
            style={{
              position: 'absolute',
              right: '-30px',
              top: '-30px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.66rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#d4a04a',
                  fontWeight: 700,
                }}
              >
                <Coffee size={12} /> LORONG RASA WAJAK
              </div>
              <div
                style={{
                  fontSize: compact ? '1.05rem' : '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  color: '#ffffff',
                  marginTop: '2px',
                  letterSpacing: '-0.01em',
                }}
              >
                Official Voucher Card
              </div>
            </div>

            {/* Stamp Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(212, 160, 74, 0.2)',
                border: '1px solid rgba(212, 160, 74, 0.5)',
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#f5c369',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              <Sparkles size={11} />
              VERIFIED
            </div>
          </div>
        </div>

        {/* === PERFORASI GERIGI TIKET DENGAN LUBANG NOTCH === */}
        <div
          style={{
            position: 'relative',
            height: '24px',
            background: '#faf7f2',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Lubang Notch Kiri */}
          <div
            style={{
              position: 'absolute',
              left: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-bg, #120c08)',
              boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.15)',
              zIndex: 2,
            }}
          />

          {/* Garis Perforasi Putus-putus */}
          <div
            style={{
              width: '100%',
              borderTop: '2px dashed rgba(212, 160, 74, 0.45)',
              margin: '0 20px',
            }}
          />

          {/* Lubang Notch Kanan */}
          <div
            style={{
              position: 'absolute',
              right: '-12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'var(--color-bg, #120c08)',
              boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.15)',
              zIndex: 2,
            }}
          />
        </div>

        {/* === BADAN TIKET (BODY) === */}
        <div
          style={{
            background: '#faf7f2',
            padding: compact ? '0.75rem 1.25rem 1.25rem' : '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Nilai Diskon / Hadiah Utama */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#8c6b3e',
                marginBottom: '2px',
              }}
            >
              KEUNTUNGAN VOUCHER
            </div>
            <div
              style={{
                fontSize: compact ? '2rem' : '2.4rem',
                fontWeight: 900,
                fontFamily: 'var(--font-playfair), Georgia, serif',
                color: '#c96427',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {headlineValue}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#3d2b1f',
                marginTop: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                justifyContent: 'center',
              }}
            >
              <Tag size={13} color="#c96427" />
              {subHeadline}
            </div>
          </div>

          {/* Box Stempel Kode Voucher */}
          <div
            style={{
              background: '#ffffff',
              border: '2px dashed #c96427',
              borderRadius: '12px',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.64rem', color: '#888', fontWeight: 700, letterSpacing: '0.08em' }}>
                KODE VOUCHER
              </div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: compact ? '1.25rem' : '1.45rem',
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  color: '#c96427',
                }}
              >
                {cleanCode}
              </div>
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(201, 100, 39, 0.12)',
                color: '#c96427',
                textTransform: 'uppercase',
              }}
            >
              Valid Code
            </div>
          </div>

          {/* Barcode 1D & QR Code Kasir */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #ebe4d8',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Barcode 1D Struk */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '4px' }}>
                BARCODE PEMINDAI KASIR
              </div>
              <BarcodeSVG code={cleanCode} height={compact ? 44 : 50} width="100%" />
            </div>

            {/* Separator kecil */}
            <div style={{ width: '1px', height: '60px', background: '#ece5d9' }} />

            {/* QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  padding: '4px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
              >
                <QRCodeSVG
                  className="voucher-physical-qrcode-svg"
                  value={qrValue}
                  size={compact ? 56 : 64}
                  bgColor="#ffffff"
                  fgColor="#1a1412"
                  level="M"
                />
              </div>
              <span style={{ fontSize: '0.58rem', color: '#666', marginTop: '2px', fontWeight: 600 }}>
                Scan QR
              </span>
            </div>
          </div>

          {/* Catatan Masa Berlaku & Ketentuan */}
          <div
            style={{
              fontSize: '0.7rem',
              color: '#7a6e65',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              textAlign: 'center',
              borderTop: '1px solid #ece5d9',
              paddingTop: '0.6rem',
            }}
          >
            <div>
              ⏳ <strong>Berlaku hingga:</strong> {expiryFormatted}
              {minOrder > 0 ? ` • Min. belanja: Rp ${minOrder.toLocaleString('id-ID')}` : ' • Tanpa minimum belanja'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#9c8e84' }}>
              Tunjukkan barcode ke kasir Lorong Rasa atau klaim di lorong-rasa.my.id
            </div>
          </div>
        </div>
      </div>
    )
  }
)
