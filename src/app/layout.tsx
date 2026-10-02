import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { CartProvider } from '@/components/providers/CartProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { DevGreeting } from '@/components/layout/DevGreeting'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://lorong-rasa.my.id'),
  title: {
    default: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional Wajak',
    template: '%s | Lorong Rasa',
  },
  description:
    'Lorong Rasa hadir di Wajak, Malang — menyajikan specialty coffee single origin Nusantara, kudapan tradisional, dan suasana hangat untuk nongkrong, work from café, atau sekadar menikmati waktu. Pesan online, dine-in, atau takeaway.',
  keywords: [
    'lorong rasa',
    'coffee shop wajak',
    'café wajak malang',
    'specialty coffee malang',
    'kopi single origin',
    'kopi arabika nusantara',
    'seblak wajak',
    'tempat nongkrong wajak',
    'work from cafe malang',
    'pesan kopi online',
  ],
  authors: [{ name: 'Lorong Rasa', url: 'https://lorong-rasa.my.id' }],
  creator: 'Lorong Rasa',
  publisher: 'Lorong Rasa',
  alternates: {
    canonical: 'https://lorong-rasa.my.id',
  },
  openGraph: {
    title: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional',
    description:
      'Kopi single origin Nusantara, diracik sepenuh hati oleh barista kami. Pesan online atau kunjungi kami di Wajak, Malang.',
    type: 'website',
    url: 'https://lorong-rasa.my.id',
    siteName: 'Lorong Rasa',
    locale: 'id_ID',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional Wajak',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lorong Rasa — Specialty Coffee Wajak, Malang',
    description:
      'Kopi single origin Nusantara, diracik sepenuh hati. Pesan online atau kunjungi kami di Wajak, Malang.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

import { FlyToCartProvider } from '@/components/cart/FlyToCartOverlay'
import { MobileBottomBar } from '@/components/layout/MobileBottomBar'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <CartProvider>
            <FlyToCartProvider>
              <ToastProvider>
                <DevGreeting />
                {children}
                <CartDrawer />
                <MobileBottomBar />
              </ToastProvider>
            </FlyToCartProvider>
          </CartProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
