import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { CartProvider } from '@/components/providers/CartProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'

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
  title: 'Lorong Rasa — Coffee Shop',
  description: 'Temukan cita rasa kopi terbaik di Lorong Rasa. Nikmati suasana hangat, menu pilihan, dan pengalaman kopi yang tak terlupakan.',
  keywords: 'kopi, coffee shop, lorong rasa, cafe, espresso',
  openGraph: {
    title: 'Lorong Rasa — Coffee Shop',
    description: 'Temukan cita rasa kopi terbaik di Lorong Rasa.',
    type: 'website',
  },
}

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
            <ToastProvider>
              {children}
              <CartDrawer />
            </ToastProvider>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
