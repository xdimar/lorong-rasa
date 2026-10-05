'use client'

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Coffee,
  ShoppingBag,
  Store,
  Shield,
  Search,
  CheckCircle2,
  QrCode,
  Banknote,
  UtensilsCrossed,
  Package,
  Clock,
  Tag,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Camera,
  ChevronDown,
  ChevronUp,
  Printer,
  Sliders,
  Users,
  Smartphone,
  Info,
  ExternalLink,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

type RoleTab = 'customer' | 'cashier' | 'admin' | 'faq'

interface GuideStep {
  title: string
  desc: string
  details?: string[]
  tips?: string
  actionLink?: { href: string; label: string }
  badge?: string
}

interface GuideModule {
  id: string
  title: string
  icon: typeof Coffee
  summary: string
  targetRole: 'customer' | 'cashier' | 'admin'
  steps: GuideStep[]
}

const GUIDE_MODULES: GuideModule[] = [
  // ===================== PELANGGAN =====================
  {
    id: 'customer-order',
    title: 'Cara Memesan Menu (Dine In & Take Away)',
    icon: UtensilsCrossed,
    targetRole: 'customer',
    summary: 'Panduan lengkap memesan makanan dan minuman, memilih meja, atau membawa pulang pesanan.',
    steps: [
      {
        title: '1. Pilih Menu Favorit',
        desc: 'Buka katalog menu melalui tombol "Menu" di navigasi atas atau beranda.',
        details: [
          'Gunakan filter kategori (Makanan Berat, Snack, Coffee Series, Milky Series, dll) untuk mempermudah pencarian.',
          'Klik foto atau nama menu untuk melihat deskripsi rasa dan harga.',
          'Tentukan jumlah porsi dan klik "+ Keranjang" untuk menambahkan menu.',
        ],
        actionLink: { href: '/menu', label: 'Buka Katalog Menu' },
      },
      {
        title: '2. Cek Keranjang & Masukkan Catatan Rasa',
        desc: 'Klik ikon keranjang di pojok kanan atas untuk melihat ringkasan item.',
        details: [
          'Sesuaikan porsi dengan tombol (+) atau (-).',
          'Tuliskan catatan khusus untuk barista bila diperlukan (contoh: "Less sugar", "Es dipisah", "Pedas sedang").',
          'Pastikan seluruh menu yang diinginkan sudah sesuai sebelum klik "Checkout".',
        ],
      },
      {
        title: '3. Pilih Tipe Pemesanan & Nomor Meja',
        desc: 'Pilih apakah Anda ingin menikmati hidangan di kafe atau dibawa pulang.',
        details: [
          'Dine In (Makan di Tempat): Wajib mengisi nomor meja tempat Anda duduk (contoh: "Meja 04" atau "Meja Bar 2").',
          'Take Away (Bungkus): Menu akan dikemas rapi untuk dibawa pulang.',
        ],
      },
      {
        title: '4. Isi Data Pemesan (Bisa Tanpa Login!)',
        desc: 'Lorong Rasa mendukung pemesanan tamu langsung tanpa ribet.',
        details: [
          'Tamu (Guest): Masukkan Nama Lengkap dan Nomor WhatsApp aktif (Email bersifat opsional).',
          'Member Terdaftar: Jika Anda sudah login, data otomatis terisi dan Anda berhak mendapatkan Poin Rasa serta catatan riwayat transaksi.',
        ],
        tips: 'Ingin mengumpulkan poin loyalitas dan diskon member? Buat akun dalam 30 detik di halaman Daftar Akun.',
        actionLink: { href: '/register?redirect=/checkout', label: 'Daftar Member' },
      },
    ],
  },
  {
    id: 'customer-payment',
    title: 'Metode Pembayaran & Pelacakan Pesanan',
    icon: QrCode,
    targetRole: 'customer',
    summary: 'Cara membayar pesanan via QRIS Instant atau Tunai di Kasir, serta melacak status racikan barista.',
    steps: [
      {
        title: '1. Pilih Metode Pembayaran',
        desc: 'Tersedia dua opsi pembayaran yang fleksibel sesuai kenyamanan Anda:',
        details: [
          'QRIS Instant: Pembayaran instan melalui GoPay, OVO, ShopeePay, DANA, BCA Mobile, atau aplikasi bank apapun.',
          'Bayar di Kasir: Pembayaran menggunakan uang tunai (cash) atau kartu debit langsung di meja kasir.',
        ],
      },
      {
        title: '2. Konfirmasi & Dapatkan Struk Digital',
        desc: 'Tekan tombol "Konfirmasi & Pesan Sekarang". Sistem akan membuat tiket pesanan resmi.',
        details: [
          'Anda akan otomatis diarahkan ke halaman pelacakan pesanan (/orders/[id]).',
          'Simpan atau bookmark tautan halaman ini untuk memantau status pesanan kapan saja.',
          'Di halaman ini terdapat QR Code struk unik yang dapat Anda tunjukkan ke barista.',
        ],
      },
      {
        title: '3. Lacak Status Racikan Barista Real-Time',
        desc: 'Pesanan Anda diperbarui secara langsung (live-sync) tanpa perlu refresh browser:',
        details: [
          '1. Menunggu: Pesanan berhasil masuk ke sistem kasir.',
          '2. Dikonfirmasi: Kasir telah memverifikasi pesanan Anda.',
          '3. Diracik: Barista dan dapur sedang menyiapkan menu pesanan.',
          '4. Siap: Pesanan siap diambil di counter kasir atau akan diantar ke mejamu!',
          '5. Selesai: Pesanan tuntas dan nikmati racikan istimewa Lorong Rasa.',
        ],
      },
    ],
  },
  {
    id: 'customer-voucher-points',
    title: 'Klaim Voucher Diskon & Poin Loyalitas',
    icon: Tag,
    targetRole: 'customer',
    summary: 'Cara berhemat dengan kode promo kafe dan mengumpulkan Poin Rasa untuk ditukar menu gratis.',
    steps: [
      {
        title: '1. Memasang Voucher Saat Checkout',
        desc: 'Gunakan voucher aktif untuk memotong total tagihan pesanan Anda.',
        details: [
          'Lihat daftar promo kafe di tab "Voucher" pada halaman utama.',
          'Ketik kode promo (contoh: RASA10, HEMAT20) ke kolom "Kode Voucher" di halaman checkout.',
          'Klik tombol "Gunakan". Potongan harga akan otomatis mengurangi total pembayaran Anda.',
        ],
        actionLink: { href: '/#voucher', label: 'Lihat Promo Voucher' },
      },
      {
        title: '2. Cara Kerja Poin Rasa (Member)',
        desc: 'Setiap transaksi kelipatan Rp 10.000 oleh member akan otomatis menghasilkan 1 Poin Rasa.',
        details: [
          'Poin otomatis masuk ke akun Anda setelah status pesanan berubah menjadi Selesai.',
          'Cek saldo poin di halaman Profil Akun (/profile).',
          'Poin dapat ditukarkan dengan aneka voucher diskon hingga Traktiran Kopi Signature gratis!',
        ],
        actionLink: { href: '/profile', label: 'Buka Profil & Saldo Poin' },
      },
    ],
  },

  // ===================== KASIR =====================
  {
    id: 'cashier-pos',
    title: 'Panduan Sistem Kasir POS (Point of Sale)',
    icon: Store,
    targetRole: 'cashier',
    summary: 'Cara menerima order langsung di meja kasir, memilih meja, menghitung kembalian, dan cetak struk.',
    steps: [
      {
        title: '1. Membuka Halaman Kasir POS',
        desc: 'Login dengan akun ber-role Kasir atau Admin, lalu buka menu "Kasir POS" di sidebar (/admin/pos).',
        details: [
          'Tampilan POS dioptimalkan untuk perangkat layar sentuh (Tablet) maupun Desktop/Laptop kasir.',
          'Bagian kiri menampilkan katalog menu dengan filter kategori cepat.',
          'Bagian kanan menampilkan keranjang tiket transaksi (Ticket Summary).',
        ],
        actionLink: { href: '/admin/pos', label: 'Buka Halaman Kasir POS' },
      },
      {
        title: '2. Input Pesanan & Opsi Khusus',
        desc: 'Klik menu yang dipesan pelanggan untuk memasukkannya ke tiket.',
        details: [
          'Klik berkali-kali untuk menambah kuantitas atau gunakan tombol (+) dan (-).',
          'Tentukan tipe: Dine In (isi nomor meja pelanggan) atau Take Away.',
          'Tuliskan catatan rasa pelanggan jika ada permintaan khusus.',
        ],
      },
      {
        title: '3. Proses Pembayaran & Kembalian',
        desc: 'Pilih metode pembayaran yang digunakan pembeli:',
        details: [
          'Pembayaran Tunai (Cash): Masukkan nominal uang yang diterima pembeli (atau klik tombol cepat Rp 10rb, 20rb, 50rb, 100rb). Sistem akan otomatis menghitung uang kembalian secara presisi.',
          'Pembayaran QRIS: Tampilkan kode QRIS meja kasir ke pelanggan, verifikasi status dana masuk di aplikasi pembayaran, lalu tekan tombol Bayar.',
        ],
      },
      {
        title: '4. Konfirmasi & Cetak Struk Pelanggan',
        desc: 'Tekan tombol "Bayar & Cetak Struk".',
        details: [
          'Sistem akan mencatat transaksi ke database secara real-time.',
          'Muncul modal struk bukti belanja. Klik "Cetak Struk" untuk mencetak ke printer thermal Bluetooth/USB atau tutup untuk transaksi berikutnya.',
        ],
      },
    ],
  },
  {
    id: 'cashier-orders',
    title: 'Manajemen Pesanan Online Masuk',
    icon: ShoppingBag,
    targetRole: 'cashier',
    summary: 'Memantau pesanan yang dikirim pelanggan dari meja kafe / online dan memperbarui status racikan.',
    steps: [
      {
        title: '1. Pantau Daftar Pesanan Masuk (/admin/orders)',
        desc: 'Halaman ini dilengkapi notifikasi audio dan pembaruan otomatis (Realtime Sync).',
        details: [
          'Pesanan baru dari web akan muncul di bagian atas dengan badge kuning "Menunggu".',
          'Periksa nomor meja, rincian menu, dan catatan pelanggan.',
        ],
        actionLink: { href: '/admin/orders', label: 'Buka Daftar Pesanan' },
      },
      {
        title: '2. Memperbarui Status Pesanan',
        desc: 'Klik tombol status untuk memajukan alur kerja kafe:',
        details: [
          'Klik "Konfirmasi" $\\rightarrow$ Pesanan resmi diterima kasir.',
          'Klik "Mulai Diracik" $\\rightarrow$ Berikan instruksi ke barista/dapur.',
          'Klik "Pesanan Siap" $\\rightarrow$ Panggil nomor meja pembeli atau serahkan paket takeaway.',
          'Klik "Selesaikan" $\\rightarrow$ Pesanan ditutup tuntas (poin member akan otomatis cair).',
        ],
      },
      {
        title: '3. Verifikasi Status Pembayaran',
        desc: 'Jika pelanggan memilih metode "Bayar di Kasir" atau bayar tunai belakangan:',
        details: [
          'Saat pelanggan membayar, klik tombol status pembayaran dari "Belum Bayar" (Unpaid) menjadi "Lunas" (Paid).',
          'Pastikan status lunas sudah diverifikasi sebelum pelanggan meninggalkan gerai.',
        ],
      },
    ],
  },
  {
    id: 'cashier-tools',
    title: 'Scan Voucher & Cek Ketersediaan Menu',
    icon: QrCode,
    targetRole: 'cashier',
    summary: 'Memvalidasi voucher promo dari HP pelanggan dan mengontrol menu yang sedang habis stok.',
    steps: [
      {
        title: '1. Scan Voucher Pelanggan (/admin/scan-voucher)',
        desc: 'Validasi voucher diskon digital yang ditunjukkan oleh member.',
        details: [
          'Arahkan kamera ke QR Code voucher di layar smartphone pelanggan.',
          'Atau ketikkan kode voucher secara manual lalu klik "Periksa Voucher".',
          'Sistem akan memvalidasi masa berlaku dan memastikan voucher belum pernah dipakai.',
        ],
        actionLink: { href: '/admin/scan-voucher', label: 'Buka Scanner Voucher' },
      },
      {
        title: '2. Toggle Ketersediaan Menu Habis (/admin/menu)',
        desc: 'Jika suatu bahan baku habis di dapur:',
        details: [
          'Buka menu "Ketersediaan Menu" di sidebar.',
          'Cari menu yang stoknya kosong, lalu klik tombol toggle "Tersedia" menjadi "Habis".',
          'Menu tersebut otomatis tidak dapat dipesan oleh pengunjung di website.',
        ],
      },
    ],
  },

  // ===================== ADMIN =====================
  {
    id: 'admin-menu-mgmt',
    title: 'Manajemen Menu, Kategori & Crop Foto',
    icon: Coffee,
    targetRole: 'admin',
    summary: 'Cara menambah menu baru, mengatur harga jual & HPP modal, serta menyesuaikan framing foto produk.',
    steps: [
      {
        title: '1. Menambah Menu Baru (/admin/menu)',
        desc: 'Klik tombol "+ Tambah Menu Baru" di sudut kanan atas.',
        details: [
          'Nama Menu: Tulis nama menu yang menarik (contoh: "Kopi Susu Gula Aren Dadapan").',
          'Kategori: Pilih dari kategori yang ada atau tambahkan kategori baru.',
          'Harga Jual: Masukkan harga yang dibayar pelanggan.',
          'Harga Modal (HPP): Masukkan estimasi modal bahan untuk penghitungan laba bersih.',
          'Deskripsi: Tuliskan highlight rasa dan bahan utama menu.',
        ],
        actionLink: { href: '/admin/menu', label: 'Kelola Menu Kafe' },
      },
      {
        title: '2. Upload & Sesuaikan Foto (Image Cropper)',
        desc: 'Gunakan fitur studio foto terintegrasi untuk tampilan profesional:',
        details: [
          'Tarik & lepas (drag-and-drop) atau pilih file foto dari komputer/HP.',
          'Gunakan modal Image Adjuster: Anda dapat memilih rasio (4:3, 1:1, 16:9), melakukan Zoom in/out, memutar rotasi 90°, dan menggeser posisi fokus foto.',
          'Klik "Terapkan & Simpan Foto" $\\rightarrow$ Foto akan otomatis diunggah ke Supabase Storage (menu-images).',
        ],
        tips: 'Gunakan foto beresolusi minimal 800x600 px dengan pencahayaan hangat agar menu terlihat lezat dan menggugah selera.',
      },
      {
        title: '3. Mengelola Kategori Menu',
        desc: 'Admin dapat menambahkan kategori kustom atau menghapus kategori yang sudah tidak digunakan.',
        details: [
          'Ketik nama kategori baru di form "+ Kategori Baru" lalu klik Simpan.',
          'Kategori baru akan langsung tampil sebagai filter tab di halaman depan website.',
        ],
      },
    ],
  },
  {
    id: 'admin-vouchers',
    title: 'Membuat Voucher Promo & Reward Loyalitas',
    icon: Sparkles,
    targetRole: 'admin',
    summary: 'Strategi promosi: membuat voucher diskon persentase, potongan rupiah, dan free produk.',
    steps: [
      {
        title: '1. Membuat Voucher Baru (/admin/vouchers)',
        desc: 'Klik "+ Buat Voucher Baru" dan lengkapi ketentuannya:',
        details: [
          'Kode Voucher: Gunakan huruf kapital singkat & mudah diingat (contoh: NGOPIHEMAT, SENINCERIA).',
          'Tipe Diskon: Pilih Persentase (%) untuk potongan persen, Nominal Tetap (Rp) untuk potongan langsung, atau Produk Gratis untuk hadiah menu tertentu.',
          'Nilai Diskon: Masukkan besaran persen (misal 15) atau nominal rupiah (misal 10000).',
          'Minimal Belanja: Batas minimal pembelian agar voucher dapat digunakan.',
          'Kuota Maksimal & Masa Berlaku: Tentukan berapa kali voucher bisa diklaim dan tanggal kadaluarsa.',
        ],
        actionLink: { href: '/admin/vouchers', label: 'Buka Manajemen Voucher' },
      },
      {
        title: '2. Mengaktifkan & Menonaktifkan Voucher',
        desc: 'Admin dapat sewaktu-waktu menonaktifkan voucher promo yang sedang berjalan hanya dengan satu klik toggle.',
        details: [
          'Buka tabel voucher di dashboard admin.',
          'Gunakan switch toggle "Status Aktif" untuk menonaktifkan voucher tanpa harus menghapusnya.',
          'Voucher yang nonaktif otomatis tidak bisa diklaim atau dimasukkan oleh pelanggan saat checkout.',
        ],
      },
    ],
  },
  {
    id: 'admin-users-analytics',
    title: 'Manajemen Hak Akses & Laporan Omset',
    icon: Shield,
    targetRole: 'admin',
    summary: 'Mengubah peran staf menjadi kasir/admin dan memantau performa penjualan kafe.',
    steps: [
      {
        title: '1. Mengatur Hak Akses Pengguna (/admin/users)',
        desc: 'Ubah role staf atau karyawan dengan aman:',
        details: [
          'Cari akun staf berdasarkan nama atau email yang terdaftar.',
          'Ubah peran pengguna menjadi "Kasir" (dapat akses POS & Pesanan) atau "Admin" (akses penuh).',
          'Perubahan hak akses berlaku seketika pada sesi login staf berikutnya.',
        ],
        actionLink: { href: '/admin/users', label: 'Kelola Hak Akses' },
      },
      {
        title: '2. Memantau Dashboard & Omset (/admin)',
        desc: 'Pantau grafik pendapatan harian, pesanan selesai, dan menu paling laris secara komprehensif.',
        details: [
          'Total Pendapatan (Omset kotor & estimasi margin keuntungan).',
          'Jumlah transaksi sukses vs dibatalkan.',
          'Katalog menu terlaris untuk evaluasi pengadaan bahan baku kafe.',
        ],
        actionLink: { href: '/admin', label: 'Buka Dashboard Analytics' },
      },
    ],
  },
]

interface FaqItem {
  q: string
  a: string
  tag: string
}

const FAQS: FaqItem[] = [
  {
    tag: 'Pelanggan',
    q: 'Apakah saya wajib membuat akun / login untuk memesan?',
    a: 'Tidak wajib. Anda dapat memesan langsung sebagai Tamu (Guest) tanpa login dengan hanya mengisi nama dan nomor WhatsApp. Namun, jika Anda login sebagai Member, Anda akan otomatis mengumpulkan Poin Rasa dan menyimpan riwayat transaksi Anda.',
  },
  {
    tag: 'Pelanggan',
    q: 'Bagaimana cara melacak pesanan jika saya memesan sebagai Tamu?',
    a: 'Setelah checkout selesai, Anda akan langsung diarahkan ke halaman tiket pesanan (/orders/[id]). Cukup simpan atau bookmark tautan halaman tersebut. Jika halaman tidak sengaja tertutup, tanyakan kepada kasir dengan menyebutkan Nama Pemesan dan Nomor WhatsApp Anda.',
  },
  {
    tag: 'Pelanggan',
    q: 'Bisa bayar pakai apa saja di Lorong Rasa?',
    a: 'Kami menerima pembayaran QRIS Instant (BCA, Mandiri, GoPay, OVO, ShopeePay, DANA, LinkAja, dll) dan Pembayaran Tunai (Cash) langsung di meja kasir.',
  },
  {
    tag: 'Kasir',
    q: 'Pelanggan pesan online dan memilih bayar tunai di kasir, apa yang harus kasir lakukan?',
    a: 'Buka menu Pesanan (/admin/orders), cari pesanan pembeli berdasarkan nomor meja atau nama. Saat pelanggan menyerahkan uang tunai, ubah status pembayaran menjadi "Lunas" (Paid) dan klik "Mulai Diracik".',
  },
  {
    tag: 'Kasir',
    q: 'Bagaimana cara mencetak struk belanja di Kasir POS?',
    a: 'Setelah proses transaksi diselesaikan di POS, akan muncul jendela pratinjau struk. Klik tombol "Cetak Struk" untuk mengirim perintah cetak ke printer kasir thermal yang terhubung.',
  },
  {
    tag: 'Admin',
    q: 'Bagaimana jika upload foto menu gagal?',
    a: 'Pastikan file foto berformat JPG, PNG, atau WebP dengan ukuran di bawah 10 MB. Sistem sudah dilengkapi cropper otomatis untuk memperkecil ukuran gambar sebelum diunggah ke storage cloud Supabase.',
  },
  {
    tag: 'Admin',
    q: 'Bagaimana cara memberikan akses Kasir kepada karyawan baru?',
    a: 'Minta karyawan Anda untuk mendaftar akun terlebih dahulu di halaman /register. Setelah terdaftar, login sebagai Admin, buka menu /admin/users, cari akun karyawan tersebut, dan ubah perannya dari "customer" menjadi "cashier".',
  },
]

function PanduanContent() {
  const searchParams = useSearchParams()
  const initialRole = (searchParams.get('role') as RoleTab) || 'customer'

  const [activeTab, setActiveTab] = useState<RoleTab>(
    ['customer', 'cashier', 'admin', 'faq'].includes(initialRole) ? initialRole : 'customer'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'customer-order': true,
    'cashier-pos': true,
    'admin-menu-mgmt': true,
  })

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter modules based on tab & search query
  const filteredModules = useMemo(() => {
    if (activeTab === 'faq') return []
    const q = searchQuery.toLowerCase().trim()
    return GUIDE_MODULES.filter(m => {
      const matchRole = m.targetRole === activeTab
      if (!matchRole) return false
      if (!q) return true
      const inTitle = m.title.toLowerCase().includes(q)
      const inSummary = m.summary.toLowerCase().includes(q)
      const inSteps = m.steps.some(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.desc.toLowerCase().includes(q) ||
          (s.details ? s.details.some(d => d.toLowerCase().includes(q)) : false)
      )
      return inTitle || inSummary || inSteps
    })
  }, [activeTab, searchQuery])

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return FAQS
    return FAQS.filter(
      f =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tag.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <>
      <Navbar />
      <main style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingTop: '100px', paddingBottom: '5rem' }}>
        <div className="container-custom" style={{ maxWidth: '1020px' }}>
          
          {/* Header Banner */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '50px',
              background: 'var(--color-primary-glow)',
              border: '1px solid rgba(201, 100, 39, 0.25)',
              color: 'var(--color-primary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              fontFamily: 'var(--font-inter)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}>
              <BookOpen size={16} />
              Pusat Bantuan &amp; Panduan Penggunaan
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 2.85rem)',
              fontFamily: 'var(--font-playfair)',
              color: 'var(--color-text)',
              marginBottom: '0.75rem',
              lineHeight: 1.25,
            }}>
              Buku Petunjuk Aplikasi Lorong Rasa
            </h1>

            <p style={{
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
              fontSize: 'clamp(0.95rem, 2vw, 1.05rem)',
              maxWidth: '680px',
              margin: '0 auto 2rem',
              lineHeight: 1.6,
            }}>
              Panduan interaktif dan langkah demi langkah untuk pelanggan, staf kasir barista, dan pemilik kafe dalam menggunakan seluruh fitur website.
            </p>

            {/* Search Input Box */}
            <div style={{
              position: 'relative',
              maxWidth: '560px',
              margin: '0 auto',
            }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari topik panduan... (contoh: pesan tanpa login, qris, pos, voucher)"
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem 0.9rem 46px',
                  borderRadius: '50px',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-inter)',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-glow)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '2.5rem',
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('customer')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                borderRadius: '50px',
                border: `2px solid ${activeTab === 'customer' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeTab === 'customer' ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: activeTab === 'customer' ? 'white' : 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'customer' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              }}
            >
              <Users size={17} />
              1. Pelanggan &amp; Tamu
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cashier')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                borderRadius: '50px',
                border: `2px solid ${activeTab === 'cashier' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeTab === 'cashier' ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: activeTab === 'cashier' ? 'white' : 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'cashier' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              }}
            >
              <Store size={17} />
              2. Staf Kasir &amp; Barista
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                borderRadius: '50px',
                border: `2px solid ${activeTab === 'admin' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeTab === 'admin' ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: activeTab === 'admin' ? 'white' : 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'admin' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              }}
            >
              <Shield size={17} />
              3. Admin &amp; Owner
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                borderRadius: '50px',
                border: `2px solid ${activeTab === 'faq' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: activeTab === 'faq' ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: activeTab === 'faq' ? 'white' : 'var(--color-text)',
                fontFamily: 'var(--font-inter)',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'faq' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              }}
            >
              <HelpCircle size={17} />
              Tanya Jawab (FAQ)
            </button>
          </div>

          {/* Quick Notice Pill for Guest Feature */}
          {activeTab === 'customer' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '1rem 1.25rem',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '2rem',
            }}>
              <Sparkles size={20} color="var(--color-gold)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text)', fontFamily: 'var(--font-inter)' }}>
                <strong>Pembaruan Terbaru:</strong> Anda sekarang bisa melakukan checkout pesanan langsung sebagai <strong>Tamu (Tanpa Login)</strong>. Praktis dan cepat untuk yang sedang berada di kafe!
              </div>
            </div>
          )}

          {/* Modules List */}
          {activeTab !== 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredModules.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem 2rem',
                  background: 'var(--color-bg-card)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px dashed var(--color-border)',
                }}>
                  <HelpCircle size={40} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-playfair)', marginBottom: '0.5rem' }}>Topik Tidak Ditemukan</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontFamily: 'var(--font-inter)' }}>
                    Tidak ada panduan yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;. Silakan ganti kata kunci atau pilih tab peran lainnya.
                  </p>
                </div>
              ) : (
                filteredModules.map((module) => {
                  const Icon = module.icon
                  const isOpen = expandedModules[module.id] ?? false

                  return (
                    <div
                      key={module.id}
                      style={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {/* Module Header / Accordion Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleModule(module.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '1.5rem 1.75rem',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: 'var(--color-primary-glow)',
                            border: '1px solid rgba(201, 100, 39, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-primary)',
                            flexShrink: 0,
                          }}>
                            <Icon size={22} />
                          </div>
                          <div>
                            <h2 style={{
                              fontSize: 'clamp(1.05rem, 2.5vw, 1.25rem)',
                              fontFamily: 'var(--font-playfair)',
                              fontWeight: 700,
                              color: 'var(--color-text)',
                              marginBottom: '4px',
                            }}>
                              {module.title}
                            </h2>
                            <p style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text-muted)',
                              fontFamily: 'var(--font-inter)',
                              margin: 0,
                            }}>
                              {module.summary}
                            </p>
                          </div>
                        </div>

                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--color-bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-muted)',
                          flexShrink: 0,
                        }}>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>

                      {/* Module Content */}
                      {isOpen && (
                        <div style={{
                          padding: '0 1.75rem 1.75rem',
                          borderTop: '1px dashed var(--color-border)',
                          paddingTop: '1.5rem',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {module.steps.map((step, idx) => (
                              <div
                                key={idx}
                                style={{
                                  background: 'var(--color-bg-secondary)',
                                  borderRadius: 'var(--radius-lg)',
                                  padding: '1.25rem 1.5rem',
                                  border: '1px solid var(--color-border)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                  <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-inter)',
                                    color: 'var(--color-text)',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}>
                                    <CheckCircle2 size={16} style={{ color: 'var(--color-primary)' }} />
                                    {step.title}
                                  </h3>
                                  {step.actionLink && (
                                    <Link
                                      href={step.actionLink.href}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: 'var(--color-primary)',
                                        textDecoration: 'none',
                                      }}
                                    >
                                      {step.actionLink.label}
                                      <ArrowRight size={13} />
                                    </Link>
                                  )}
                                </div>

                                <p style={{
                                  fontSize: '0.88rem',
                                  color: 'var(--color-text-secondary)',
                                  fontFamily: 'var(--font-inter)',
                                  marginBottom: '0.75rem',
                                  lineHeight: 1.5,
                                }}>
                                  {step.desc}
                                </p>

                                 {step.details && step.details.length > 0 && (
                                   <ul style={{
                                     margin: 0,
                                     paddingLeft: '1.25rem',
                                     display: 'flex',
                                     flexDirection: 'column',
                                     gap: '0.4rem',
                                     fontSize: '0.84rem',
                                     color: 'var(--color-text-muted)',
                                     fontFamily: 'var(--font-inter)',
                                     lineHeight: 1.5,
                                   }}>
                                     {step.details.map((detail, dIdx) => (
                                       <li key={dIdx}>{detail}</li>
                                     ))}
                                   </ul>
                                 )}

                                {step.tips && (
                                  <div style={{
                                    marginTop: '0.85rem',
                                    padding: '8px 12px',
                                    background: 'rgba(201, 100, 39, 0.08)',
                                    borderLeft: '3px solid var(--color-primary)',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text)',
                                    fontFamily: 'var(--font-inter)',
                                  }}>
                                    💡 <strong>Tips:</strong> {step.tips}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* FAQ Tab Content */}
          {activeTab === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', marginBottom: '6px' }}>
                  Pertanyaan yang Sering Diajukan
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                  Jawaban ringkas dan solusi cepat untuk masalah umum yang sering ditemui.
                </p>
              </div>

              {filteredFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem 1.5rem',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background:
                        faq.tag === 'Pelanggan'
                          ? 'rgba(74, 158, 106, 0.15)'
                          : faq.tag === 'Kasir'
                          ? 'rgba(201, 100, 39, 0.15)'
                          : 'rgba(212, 175, 55, 0.15)',
                      color:
                        faq.tag === 'Pelanggan'
                          ? '#4a9e6a'
                          : faq.tag === 'Kasir'
                          ? 'var(--color-primary)'
                          : 'var(--color-gold)',
                      fontFamily: 'var(--font-inter)',
                    }}>
                      {faq.tag}
                    </span>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-inter)', margin: 0 }}>
                      {faq.q}
                    </h3>
                  </div>
                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                    lineHeight: 1.6,
                    margin: 0,
                    paddingLeft: '4px',
                  }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer Contact Help Banner */}
          <div style={{
            marginTop: '3.5rem',
            background: 'linear-gradient(135deg, var(--color-bg-card), var(--color-bg-secondary))',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-playfair)', color: 'var(--color-text)', margin: 0 }}>
              Masih Memiliki Pertanyaan atau Butuh Bantuan Langsung?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', maxWidth: '580px', margin: 0 }}>
              Tim Barista dan Customer Service Lorong Rasa siap membantu pesanan atau kendala teknis Anda.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href="https://wa.me/6285196671398?text=Halo%20Admin%20Lorong%20Rasa,%20saya%20butuh%20bantuan%20terkait%20penggunaan%20website"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
              >
                💬 Chat WhatsApp Owner (Ratna)
              </a>
              <Link
                href="/menu"
                className="btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
              >
                <Coffee size={16} />
                Mulai Pesan Sekarang
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}

export default function PanduanPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>Memuat Panduan Penggunaan...</p>
      </div>
    }>
      <PanduanContent />
    </Suspense>
  )
}
