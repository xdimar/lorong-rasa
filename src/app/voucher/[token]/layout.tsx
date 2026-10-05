import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const resolved = await params
  const cleanToken = decodeURIComponent(resolved.token || '').trim()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.lorong-rasa.my.id'
  let code = cleanToken.toUpperCase()
  let title = `Voucher ${code} — Lorong Rasa Wajak`
  let description = `Klaim voucher ${code}! Tunjukkan barcode ke kasir atau pesan online untuk nikmati promo diskon spesial di Lorong Rasa.`

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      let { data } = await supabase
        .from('vouchers')
        .select('code, discount_type, discount_value, product_name')
        .eq('share_token', cleanToken)
        .maybeSingle()

      if (!data) {
        const { data: byCode } = await supabase
          .from('vouchers')
          .select('code, discount_type, discount_value, product_name')
          .ilike('code', cleanToken)
          .maybeSingle()
        data = byCode
      }

      if (data) {
        code = (data.code || cleanToken).toUpperCase()
        let benefit = ''
        if (data.discount_type === 'percentage') {
          benefit = `Diskon ${data.discount_value}% OFF`
        } else if (data.discount_type === 'fixed') {
          benefit = `Potongan Rp ${(data.discount_value / 1000).toFixed(0)}rb`
        } else {
          benefit = data.discount_value === 100 ? 'Gratis Menu Spesial' : `Diskon ${data.discount_value}%`
        }
        title = `🎟️ Voucher ${code} (${benefit}) — Lorong Rasa`
        description = `Klaim promo voucher ${code} (${benefit}). Tunjukkan barcode ke kasir atau pesan online sekarang!`
      }
    }
  } catch {}

  const ogImageUrl = `${siteUrl}/voucher/${encodeURIComponent(cleanToken)}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/voucher/${encodeURIComponent(cleanToken)}`,
      siteName: 'Lorong Rasa Specialty Coffee',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Kartu Voucher ${code} Lorong Rasa`,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function VoucherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
