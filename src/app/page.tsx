
import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'
import { MenuSection } from '@/components/sections/MenuSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { VoucherSection } from '@/components/sections/VoucherSection'
import { TestimonialSection } from '@/components/sections/TestimonialSection'
import { ContactSection } from '@/components/sections/ContactSection'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional Wajak, Malang',
  description:
    'Nikmati specialty coffee single origin Nusantara dan kudapan tradisional di Lorong Rasa, Wajak, Malang. Pesan online, dine-in, atau takeaway. Suasana hangat, Wi-Fi kencang, harga ramah kantong.',
  alternates: {
    canonical: 'https://lorong-rasa.my.id',
  },
  openGraph: {
    title: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional',
    description:
      'Kopi single origin Nusantara dan kudapan khas, diracik sepenuh hati di Wajak, Malang. Pesan online sekarang!',
    url: 'https://lorong-rasa.my.id',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional Wajak Malang',
      },
    ],
  },
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <MenuSection />
        <AboutSection />
        <VoucherSection />
        <TestimonialSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}
