import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Shield,
  Lock,
  Eye,
  FileText,
  UserCheck,
  CreditCard,
  Database,
  Mail,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Lorong Rasa Coffee Shop',
  description:
    'Kebijakan Privasi Lorong Rasa menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi pelanggan saat menggunakan layanan coffee shop kami.',
  openGraph: {
    title: 'Kebijakan Privasi — Lorong Rasa',
    description: 'Perlindungan data dan transparansi privasi pelanggan Lorong Rasa Coffee Shop.',
  },
}

export default function PrivacyPolicyPage() {
  const lastUpdated = '30 September 2026'

  const sections = [
    {
      icon: <Database size={22} className="text-primary" />,
      title: '1. Informasi yang Kami Kumpulkan',
      content: [
        'Data Akun & Identitas: Nama lengkap, alamat email, dan nomor telepon yang Anda daftarkan saat membuat akun atau melakukan reservasi/pemesanan.',
        'Data Transaksi: Rincian pesanan menu, catatan pesanan khusus (seperti tingkat kemanisan atau alergi), nomor meja dine-in, status takeaway, dan riwayat klaim voucher diskon.',
        'Data Pembayaran: Metode pembayaran yang dipilih (Tunai di kasir atau QRIS). Kami tidak pernah menyimpan data rahasia seperti PIN perbankan atau kode OTP Anda.',
        'Data Teknis: Alamat IP sementara, tipe perangkat, dan preferensi tema tampilan yang tersimpan secara lokal di peramban Anda untuk kenyamanan penjelajahan.',
      ],
    },
    {
      icon: <Eye size={22} className="text-primary" />,
      title: '2. Cara Kami Menggunakan Informasi Anda',
      content: [
        'Memproses dan menyiapkan pesanan kopi, makanan, dan snack Anda di kasir maupun dapur secara akurat.',
        'Menyediakan struk belanja digital atau fisik dan memvalidasi keabsahan voucher diskon yang Anda tukarkan.',
        'Menghubungi Anda via WhatsApp atau telepon hanya bila diperlukan terkait status pesanan (misal saat stok menu habis atau konfirmasi takeaway).',
        'Meningkatkan mutu menu, layanan barista, dan kenyamanan suasana gerai Lorong Rasa berdasarkan ulasan dan masukan Anda.',
      ],
    },
    {
      icon: <Lock size={22} className="text-primary" />,
      title: '3. Perlindungan & Keamanan Data (Security)',
      content: [
        'Penyimpanan Terenkripsi: Seluruh pertukaran data dilindungi oleh enkripsi modern SSL/HTTPS 256-bit standar industri.',
        'Row Level Security (RLS): Database kami menerapkan kebijakan RLS ketat berbasis Supabase, memastikan akun pelanggan lain tidak dapat melihat atau memodifikasi data profil maupun tiket transaksi Anda.',
        'Akses Terbatas: Hanya staf kasir dan manajer resmi yang memiliki izin akses terbatas untuk memproses pesanan dan mencetak struk transaksi.',
      ],
    },
    {
      icon: <UserCheck size={22} className="text-primary" />,
      title: '4. Berbagi Data dengan Pihak Ketiga',
      content: [
        'Kami berkomitmen penuh TIDAK AKAN PERNAH menjual, menyewakan, atau memperdagangkan data pribadi Anda kepada pihak ketiga untuk kepentingan periklanan pihak luar.',
        'Data hanya dibagikan kepada penyedia infrastruktur terpercaya (seperti gateway pembayaran QRIS resmi dan penyedia database cloud) semata-mata untuk kelancaran transaksi pesanan Anda.',
      ],
    },
    {
      icon: <FileText size={22} className="text-primary" />,
      title: '5. Penggunaan Cookie & Penyimpanan Lokal',
      content: [
        'Kami menggunakan Cookie sesi dan LocalStorage pada browser Anda untuk mengingat isi keranjang belanja sementara (cart), preferensi tema (Light/Dark mode), dan token sesi autentikasi yang aman.',
        'Anda dapat menonaktifkan cookie melalui pengaturan peramban Anda, namun beberapa fungsi seperti keranjang belanja otomatis mungkin tidak bekerja maksimal.',
      ],
    },
    {
      icon: <Shield size={22} className="text-primary" />,
      title: '6. Hak Anda atas Data Pribadi',
      content: [
        'Hak Akses & Koreksi: Anda berhak melihat dan memperbarui informasi profil Anda kapan saja melalui menu Pengaturan Akun di website.',
        'Hak Penghapusan Akun: Anda berhak mengajukan permohonan penutupan akun dan penghapusan data kontak pribadi dengan menghubungi tim kami.',
        'Riwayat Transaksi: Salinan riwayat pesanan Anda tersimpan secara transparan di dashboard akun Anda.',
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
                <Shield size={13} /> Dokumen Legal Resmi
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
              Kebijakan Privasi
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
              Kepercayaan Anda adalah prioritas utama kami. Kebijakan ini menjelaskan prinsip transparansi Lorong Rasa
              dalam melindungi data pribadi, kenyamanan pemesanan, dan keamanan transaksi digital maupun offline Anda.
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
                  transition: 'border-color 0.2s',
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

          {/* Contact Box */}
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
              <Mail size={20} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                Pertanyaan Seputar Privasi?
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Jika Anda memiliki pertanyaan mengenai penggunaan data atau ingin mengajukan permohonan terkait privasi Anda,
              silakan hubungi manajemen Lorong Rasa di gerai kami atau kirim pesan melalui kontak resmi di bawah ini.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <Link
                href="/#contact"
                className="btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
              >
                Hubungi Kami ➔
              </Link>
              <Link
                href="/syarat-ketentuan"
                className="btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
              >
                Baca Syarat &amp; Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
