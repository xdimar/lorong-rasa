'use client'

import React from 'react'

interface BarcodeSVGProps {
  code: string
  width?: number | string
  height?: number
  className?: string
  showText?: boolean
}

/**
 * Komponen Barcode SVG 1D otentik untuk struk dan tiket kasir.
 * Mengubah string kode voucher menjadi pola bar vertikal hitam-putih
 * yang presisi dan estetis seperti barcode ritel fisik.
 */
export interface BarcodeBar {
  width: number
  isSpace: boolean
}

export function generateBarcodeBars(code: string): BarcodeBar[] {
  const cleanCode = (code || 'LORONG-RASA').toUpperCase().replace(/[^A-Z0-9-]/g, '')
  const bars: BarcodeBar[] = []

  // Guard bar di awal (101)
  bars.push({ width: 2, isSpace: false })
  bars.push({ width: 2, isSpace: true })
  bars.push({ width: 2, isSpace: false })

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i)
    const b1 = (charCode % 3) + 1
    const s1 = ((charCode >> 1) % 2) + 1
    const b2 = ((charCode >> 2) % 3) + 1
    const s2 = ((charCode >> 3) % 2) + 1

    bars.push({ width: b1 * 1.5, isSpace: false })
    bars.push({ width: s1 * 1.5, isSpace: true })
    bars.push({ width: b2 * 1.5, isSpace: false })
    bars.push({ width: s2 * 1.5, isSpace: true })
  }

  // Guard bar di akhir (101)
  bars.push({ width: 2, isSpace: false })
  bars.push({ width: 2, isSpace: true })
  bars.push({ width: 2, isSpace: false })

  return bars
}

export function BarcodeSVG({
  code,
  width = '100%',
  height = 54,
  className = '',
  showText = true,
}: BarcodeSVGProps) {
  const cleanCode = (code || 'LORONG-RASA').toUpperCase().replace(/[^A-Z0-9-]/g, '')
  const bars = generateBarcodeBars(cleanCode)

  // Hitung total lebar viewBox
  const totalBarWidth = bars.reduce((acc, curr) => acc + curr.width, 0)
  const paddingX = 14
  const viewBoxWidth = totalBarWidth + paddingX * 2
  const barHeight = showText ? height - 16 : height

  let currentX = paddingX

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#ffffff',
        padding: '6px 12px 4px',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
        maxWidth: '100%',
      }}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${barHeight}`}
        style={{
          width: width,
          height: `${barHeight}px`,
          maxWidth: '340px',
          display: 'block',
        }}
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX
          currentX += bar.width
          if (bar.isSpace) return null
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={barHeight}
              fill="#1a1412"
            />
          )
        })}
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            color: '#1a1412',
            marginTop: '3px',
            textAlign: 'center',
          }}
        >
          *{cleanCode}*
        </span>
      )}
    </div>
  )
}
