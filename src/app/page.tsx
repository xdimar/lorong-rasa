
import { Navbar } from '@/components/layout/Navbar'
import { HeroSection } from '@/components/sections/HeroSection'
import { MenuSection } from '@/components/sections/MenuSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { VoucherSection } from '@/components/sections/VoucherSection'
import { TestimonialSection } from '@/components/sections/TestimonialSection'
import { ContactSection } from '@/components/sections/ContactSection'
import { Footer } from '@/components/layout/Footer'

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
