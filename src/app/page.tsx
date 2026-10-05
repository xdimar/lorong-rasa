
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'

const MenuSection = dynamic(
  () => import('@/components/sections/MenuSection').then((m) => m.MenuSection),
  { loading: () => <div style={{ minHeight: '600px' }} /> }
)
const AboutSection = dynamic(
  () => import('@/components/sections/AboutSection').then((m) => m.AboutSection),
  { loading: () => <div style={{ minHeight: '400px' }} /> }
)
const VoucherSection = dynamic(
  () => import('@/components/sections/VoucherSection').then((m) => m.VoucherSection),
  { loading: () => <div style={{ minHeight: '500px' }} /> }
)
const TestimonialSection = dynamic(
  () => import('@/components/sections/TestimonialSection').then((m) => m.TestimonialSection),
  { loading: () => <div style={{ minHeight: '400px' }} /> }
)
const ContactSection = dynamic(
  () => import('@/components/sections/ContactSection').then((m) => m.ContactSection),
  { loading: () => <div style={{ minHeight: '400px' }} /> }
)
const Footer = dynamic(
  () => import('@/components/layout/Footer').then((m) => m.Footer),
  { loading: () => <div style={{ minHeight: '200px' }} /> }
)

export const metadata: Metadata = {
  title: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional Wajak, Malang',
  description:
    'Nikmati specialty coffee single origin Nusantara dan kudapan tradisional di Lorong Rasa, Wajak, Malang. Pesan online, dine-in, atau takeaway. Suasana hangat, Wi-Fi kencang, harga ramah kantong.',
  alternates: {
    canonical: 'https://www.lorong-rasa.my.id',
  },
  openGraph: {
    title: 'Lorong Rasa — Specialty Coffee & Kudapan Tradisional',
    description:
      'Kopi single origin Nusantara dan kudapan khas, diracik sepenuh hati di Wajak, Malang. Pesan online sekarang!',
    url: 'https://www.lorong-rasa.my.id',
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
