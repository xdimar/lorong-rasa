import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const alt = 'Official Voucher — Lorong Rasa Specialty Coffee'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const resolvedParams = await params
  const cleanToken = decodeURIComponent(resolvedParams.token || '').trim()

  let voucherCode = cleanToken.toUpperCase()
  let headline = 'PROMO VOUCHER'
  let subheadline = 'Specialty Coffee & Kudapan Tradisional'

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      let { data } = await supabase
        .from('vouchers')
        .select('*')
        .eq('share_token', cleanToken)
        .maybeSingle()

      if (!data) {
        const { data: byCode } = await supabase
          .from('vouchers')
          .select('*')
          .ilike('code', cleanToken)
          .maybeSingle()
        data = byCode
      }

      if (data) {
        voucherCode = (data.code || cleanToken).toUpperCase()
        if (data.discount_type === 'percentage') {
          headline = `DISKON ${data.discount_value}% OFF`
          subheadline = 'Berlaku untuk seluruh menu kopi & kudapan'
        } else if (data.discount_type === 'fixed') {
          headline = `POTONGAN Rp ${(data.discount_value / 1000).toFixed(0)}RB`
          subheadline = `Potongan langsung Rp ${data.discount_value.toLocaleString('id-ID')}`
        } else {
          // product
          const items = (data.product_name || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
          const target = items.length > 1 ? `Acak 1 dari ${items.length} Menu Pilihan` : (items[0] || 'Menu Spesial')
          headline = data.discount_value === 100 ? 'GRATIS 100%' : `DISKON ${data.discount_value}%`
          subheadline = `Hadiah Menu: ${target}`
        }
      }
    }
  } catch (e) {
    console.error('OG Image fetch error:', e)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #120905 0%, #24140b 50%, #150a06 100%)',
          padding: '40px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Container Kartu Voucher Fisik */}
        <div
          style={{
            width: '1080px',
            height: '520px',
            display: 'flex',
            flexDirection: 'row',
            borderRadius: '28px',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7)',
            border: '2px solid rgba(212, 160, 74, 0.6)',
            background: '#faf7f2',
          }}
        >
          {/* Kolom Kiri: Header & Detail Keuntungan */}
          <div
            style={{
              flex: 1.4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '44px 50px',
              borderRight: '3px dashed #d4a04a',
              position: 'relative',
              background: '#fcfaf7',
            }}
          >
            {/* Header Brand */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#c96427',
                }}
              >
                ☕ LORONG RASA WAJAK — OFFICIAL TICKET
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#1a1412',
                  marginTop: '4px',
                }}
              >
                Voucher Diskon Spesial
              </div>
            </div>

            {/* Headline Benefit */}
            <div style={{ display: 'flex', flexDirection: 'column', margin: '20px 0' }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: '#8c6b3e',
                  textTransform: 'uppercase',
                }}
              >
                KEUNTUNGAN VOUCHER
              </div>
              <div
                style={{
                  fontSize: '68px',
                  fontWeight: 900,
                  color: '#c96427',
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                }}
              >
                {headline}
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#4a3b32',
                  marginTop: '10px',
                }}
              >
                {subheadline}
              </div>
            </div>

            {/* Kode Voucher Monospace Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '3px dashed #c96427',
                borderRadius: '16px',
                padding: '16px 24px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#888', letterSpacing: '0.1em' }}>
                  KODE VOUCHER
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '38px',
                    fontWeight: 900,
                    letterSpacing: '0.15em',
                    color: '#c96427',
                  }}
                >
                  {voucherCode}
                </span>
              </div>
              <div
                style={{
                  background: '#c96427',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 800,
                }}
              >
                KLAIM ONLINE / KASIR
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Barcode & QR Code Section */}
          <div
            style={{
              flex: 0.9,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              background: '#ffffff',
              gap: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#8c6b3e', letterSpacing: '0.1em' }}>
                PEMINDAI BARCODE
              </span>
              <span style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                Scan di kasir saat memesan di outlet
              </span>
            </div>

            {/* Barcode Lines Graphic */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '80px',
                gap: '3px',
                padding: '10px 20px',
                background: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '12px',
                width: '100%',
              }}
            >
              {[3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 5, 2, 3, 1, 4, 2, 3, 5, 1, 4, 2, 3, 1, 4, 2, 5, 1, 3, 2, 4, 1].map(
                (w, i) => (
                  <div
                    key={i}
                    style={{
                      width: `${w * 2.5}px`,
                      height: '60px',
                      background: i % 2 === 0 ? '#1a1412' : '#ffffff',
                    }}
                  />
                )
              )}
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: '#1a1412',
              }}
            >
              *{voucherCode}*
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#7a6e65',
                textAlign: 'center',
                marginTop: '10px',
              }}
            >
              www.lorong-rasa.my.id/voucher/{voucherCode}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
