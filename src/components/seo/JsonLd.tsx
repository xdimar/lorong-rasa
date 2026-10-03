import React from 'react'

export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    '@id': 'https://lorong-rasa.my.id/#cafe',
    name: 'Lorong Rasa',
    alternateName: 'Lorong Rasa Coffee & Kudapan',
    description:
      'Specialty coffee single origin Nusantara, racikan espresso hangat, dan kudapan tradisional khas Wajak, Malang. Suasana hangat, Wi-Fi kencang, tempat nongkrong dan work from cafe favorit di Wajak.',
    url: 'https://lorong-rasa.my.id',
    telephone: '+6285196671398',
    email: 'lorongrasa30@gmail.com',
    priceRange: 'Rp 10.000 - Rp 35.000',
    currenciesAccepted: 'IDR',
    paymentAccepted: 'Cash, QRIS, GoPay, OVO, ShopeePay, DANA',
    servesCuisine: ['Coffee', 'Indonesian', 'Kudapan Tradisional', 'Snacks'],
    hasMenu: 'https://lorong-rasa.my.id/menu',
    image: [
      'https://lorong-rasa.my.id/og-image.jpg',
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Dadapan, RT.15 RW.05',
      addressLocality: 'Wajak',
      addressRegion: 'Jawa Timur',
      postalCode: '65173',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -8.1135,
      longitude: 112.723,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '10:00',
        closes: '22:00',
      },
    ],
    amenityFeature: [
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Free Wi-Fi',
        value: true,
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Outdoor Seating',
        value: true,
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Dine-In',
        value: true,
      },
      {
        '@type': 'LocationFeatureSpecification',
        name: 'Takeaway',
        value: true,
      },
    ],
    founder: {
      '@type': 'Person',
      name: 'Ratna',
    },
    sameAs: [
      'https://wa.me/6285196671398',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
