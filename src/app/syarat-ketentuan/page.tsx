import type { Metadata } from 'next'
import Link from 'next/link'
import {
  FileText,
  Coffee,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Tag,
  RefreshCw,
  Scale,
  ArrowLeft,
  Store,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — Lorong Rasa Coffee Shop',
  description:
    'Syarat dan Ketentuan layanan pemesanan kopi, makanan, penggunaan voucher diskon, dan transaksi kasir di Lorong Rasa Coffee Shop.',
  openGraph: {
    title: 'Syarat & Ketentuan — Lorong Rasa',
    description: 'Ketentuan pemesanan, pembayaran, dan pemakaian layanan Lorong Rasa Coffee Shop.',
  },
}

export default function TermsAndConditionsPage() {
  const lastUpdated = '30 September 2026'

  const sections = [
    {
      icon: <Store size={22} className="text-primary" />,
      title: '1. Ketentuan Umum & Penerimaan Layanan',
      content: [
        'Dengan mengakses situs web Lorong Rasa, melakukan pemesanan online, maupun bertransaksi langsung di meja kasir kami, Anda menyetujui untuk terikat oleh seluruh Syarat dan Ketentuan yang berlaku.',
        'Layanan ini diperuntukkan bagi pelanggan yang ingin menikmati sajian kopi, minuman non-kopi, makanan berat, dan snack resmi Lorong Rasa.',
        'Manajemen Lorong Rasa berhak melakukan penyesuaian menu, jam operasional, maupun harga sewaktu-waktu dengan pemberitahuan melalui sistem kami.',
      ],
    },
    {
      icon: <Coffee size={22} className="text-primary" />,
      title: '2. Pemesanan & Ketersediaan Menu',
      content: [
        'Pilihan Layanan: Pelanggan dapat memesan untuk disantap di tempat (Dine-in) dengan nomor meja, atau dibawa pulang (Takeaway/Bungkus).',
        'Ketersediaan Stok: Stok menu bersifat aktual (real-time). Jika bahan baku tertentu habis, status menu akan otomatis bertanda "HABIS" di katalog POS kasir dan website pelanggan.',
        'Waktu Pembuatan: Setiap pesanan kopi dan makanan diproses secara segar (freshly prepared). Waktu penyajian dapat bervariasi bergantung pada kepadatan antrean barista dan dapur gerai.',
      ],
    },
    {
      icon: <CreditCard size={22} className="text-primary" />,
      title: '3. Harga, Pembayaran & Struk Transaksi',
      content: [
        'Semua harga yang tertera di menu menggunakan mata uang Rupiah (IDR) dan merupakan harga final yang berlaku pada saat pemesanan.',
        'Metode Pembayaran: Kami menerima pembayaran Tunai (Cash) di kasir dan pembayaran non-tunai melalui QRIS (GoPay, OVO, Dana, BCA, Mandiri, ShopeePay, dll).',
        'Struk Kasir: Struk resmi belanja dicetak atau ditampilkan secara digital sebagai bukti sah transaksi. Harap simpan struk belanja Anda untuk keperluan verifikasi.',
      ],
    },
    {
      icon: <Tag size={22} className="text-primary" />,
      title: '4. Penggunaan Voucher Diskon & Promosi',
      content: [
        'Keabsahan Kode: Voucher hanya sah apabila masih aktif, belum melewati masa berlaku (expired date), dan kuota pemakaian masih tersedia.',
        'Penukaran Kasir: Voucher promosi yang diperoleh pelanggan online dapat ditukarkan langsung di kasir walk-in kami melalui pemindaian QR code atau input kode voucher oleh staf kasir.',
        'Syarat Minimum Pembelian: Sebagian voucher memiliki ketentuan minimum nominal belanja sebelum potongan harga diterapkan.',
        'Voucher tidak dapat diuangkan dan tidak dapat digabungkan dengan promo khusus tertentu kecuali dinyatakan secara tertulis.',
      ],
    },
    {
      icon: <RefreshCw size={22} className="text-primary" />,
      title: '5. Kebijakan Pembatalan & Penggantian Pesanan',
      content: [
        'Pesanan yang sudah masuk ke tahap peracikan barista atau penggorengan dapur tidak dapat dibatalkan secara sepihak oleh pelanggan.',
        'Apabila terjadi kesalahan penyajian menu atau ketidaksesuaian pesanan dengan struk belanja, staf kami akan dengan senang hati mengganti sajian tersebut dengan menu baru tanpa biaya tambahan.',
        'Kerusakan sajian setelah diserahterimakan secara aman kepada pelanggan berada di luar tanggung jawab pihak coffee shop.',
      ],
    },
    {
      icon: <Scale size={22} className="text-primary" />,
      title: '6. Hak Cipta & Etika Pengunjung',
      content: [
        'Seluruh logo, merek dagang, desain interior, foto produk, dan konten digital Lorong Rasa adalah kekayaan intelektual milik Lorong Rasa Coffee Shop.',
        'Pengunjung gerai diharapkan menjaga ketertiban, kebersihan, dan saling menghormati kenyamanan pengunjung lain di area indoor maupun outdoor gerai.',
      ],
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '7rem 1.5rem 4rem' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {/* Back Button & Breadcrumbs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} /> Kembali ke Beranda
            </Link>
          </div>

          {/* Header Banner */}
          <div
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(1.75rem, 4vw, 3rem)',
              marginBottom: '2.5rem',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <span
                style={{
                  background: 'rgba(196, 122, 46, 0.12)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(196, 122, 46, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '50px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FileText size={13} /> Ketentuan Layanan Gerai
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Diperbarui: {lastUpdated}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
                fontWeight: 800,
                color: 'var(--color-text)',
                margin: '0 0 0.85rem',
                lineHeight: 1.2,
              }}
            >
              Syarat &amp; Ketentuan
            </h1>

            <p
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.95rem',
                lineHeight: 1.7,
                margin: 0,
                maxWidth: '680px',
              }}
            >
              Panduan resmi mengenai hak dan kewajiban pelanggan saat menikmati sajian kopi, makanan, pemesanan meja,
              serta penggunaan promo diskon di Lorong Rasa Coffee Shop.
            </p>
          </div>

          {/* Content Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
            {sections.map((sec, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'var(--color-bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-border)',
                      flexShrink: 0,
                    }}
                  >
                    {sec.icon}
                  </div>
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      margin: 0,
                    }}
                  >
                    {sec.title}
                  </h2>
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.7,
                  }}
                >
                  {sec.content.map((point, pIdx) => (
                    <li key={pIdx} style={{ listStyleType: 'disc' }}>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-card) 100%)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                Siap Menikmati Seduhan Kopi Terbaik?
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Pilih menu kopi single origin, cemilan renyah, atau makanan berat favorit Anda langsung dari katalog menu kami.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <Link
                href="/menu"
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
              >
                Buka Katalog Menu ➔
              </Link>
              <Link
                href="/kebijakan-privasi"
                className="btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
              >
                Baca Kebijakan Privasi
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
