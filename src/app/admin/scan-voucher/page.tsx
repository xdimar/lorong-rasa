'use client'

import { useEffect, useState, useRef } from 'react'
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  User,
  Tag,
  Clock,
  Check,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface VoucherData {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  expires_at: string
  min_order: number
}

interface ProfileData {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface ClaimedVoucher {
  id: string
  user_id: string
  voucher_id: string
  voucher_code: string
  status: 'claimed' | 'used'
  claimed_at: string
  used_at: string | null
  used_via: string | null
  redeemed_by_cashier_id: string | null
  vouchers?: VoucherData
  profiles?: ProfileData
}

export default function ScanVoucherPage() {
  const [cameraActive, setCameraActive] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [currentClaim, setCurrentClaim] = useState<ClaimedVoucher | null>(null)
  const [recentRedemptions, setRecentRedemptions] = useState<ClaimedVoucher[]>([])
  const [cashierUser, setCashierUser] = useState<any>(null)

  const scannerRef = useRef<any>(null)
  const supabase = createClient()

  // Load cashier auth & recent redemptions
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCashierUser(user)
      fetchRecentRedemptions()
    }
    init()

    return () => {
      stopCamera()
    }
  }, [])

  const fetchRecentRedemptions = async () => {
    try {
      const { data } = await supabase
        .from('user_vouchers')
        .select('*, vouchers(*)')
        .eq('status', 'used')
        .eq('used_via', 'offline_cashier')
        .order('used_at', { ascending: false })
        .limit(8)

      if (data) {
        setRecentRedemptions(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Camera Scanner toggle
  const startCamera = async () => {
    setErrorMsg('')
    setSuccessMsg('')
    setCameraActive(true)

    // Allow DOM to render visible container before initializing html5-qrcode
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const element = document.getElementById('qr-reader-view')
        if (!element) return

        // Clean up any existing instance first
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop()
            }
            scannerRef.current.clear()
          } catch {
            // ignore
          }
          scannerRef.current = null
        }

        const scanner = new Html5Qrcode('qr-reader-view')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScannedData(decodedText)
          },
          () => {
            // ignore frame parse failure
          }
        )
      } catch (err: any) {
        console.error('Camera start error:', err)
        setErrorMsg('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.')
        setCameraActive(false)
      }
    }, 150)
  }

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch {
        // ignore
      }
      scannerRef.current = null
    }

    // Stop all media tracks if any remain active
    try {
      const videoElem = document.querySelector('#qr-reader-view video') as HTMLVideoElement | null
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoElem.srcObject = null
      }
    } catch {
      // ignore
    }

    setCameraActive(false)
  }

  // Parse and handle scanned text or manual input
  const handleScannedData = async (rawText: string) => {
    // If camera was running, pause or stop
    stopCamera()

    const text = rawText.trim()
    if (!text) return

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    setCurrentClaim(null)

    try {
      let claimId: string | null = null
      let code: string | null = null
      let userId: string | null = null

      if (text.startsWith('VOUCHER_CLAIM:')) {
        // Format: VOUCHER_CLAIM:id|code|userId
        const parts = text.replace('VOUCHER_CLAIM:', '').split('|')
        claimId = parts[0]
        code = parts[1]
        userId = parts[2]
      } else if (text.startsWith('VOUCHER:')) {
        // Older format fallback: VOUCHER:CODE|...
        const parts = text.replace('VOUCHER:', '').split('|')
        code = parts[0]
      } else {
        // Assume text is either claim ID or Voucher Code
        if (text.length === 36 && text.includes('-')) {
          claimId = text
        } else {
          code = text.toUpperCase()
        }
      }

      // Fetch user_vouchers
      let query = supabase.from('user_vouchers').select('*, vouchers(*)')

      if (claimId) {
        query = query.eq('id', claimId)
      } else if (code) {
        query = query.ilike('voucher_code', code)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        // If not found in user_vouchers, check if voucher code exists in general vouchers
        if (code) {
          const { data: vGeneral } = await supabase
            .from('vouchers')
            .select('*')
            .ilike('code', code)
            .single()

          if (vGeneral) {
            setErrorMsg(
              `Kode "${code}" terdaftar di sistem, namun belum diklaim oleh pelanggan ke akun mereka. Pelanggan wajib mengklaim di profil terlebih dahulu.`
            )
            setLoading(false)
            return
          }
        }

        setErrorMsg('Voucher atau ID Klaim tidak ditemukan di sistem Lorong Rasa.')
        setLoading(false)
        return
      }

      // Pick first matching record
      const claim = data[0]

      // Fetch customer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', claim.user_id)
        .single()

      claim.profiles = profile || null
      setCurrentClaim(claim)
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Terjadi kesalahan saat memverifikasi voucher.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    handleScannedData(manualInput)
  }

  // Redeem Action
  const handleRedeemOffline = async () => {
    if (!currentClaim) return

    setRedeemLoading(true)
    setErrorMsg('')
    try {
      const now = new Date().toISOString()

      // 1. Update user_vouchers record
      const { error: uvErr } = await supabase
        .from('user_vouchers')
        .update({
          status: 'used',
          used_via: 'offline_cashier',
          used_at: now,
          redeemed_by_cashier_id: cashierUser?.id || null,
        })
        .eq('id', currentClaim.id)

      if (uvErr) throw uvErr

      // 2. Increment voucher usage in vouchers table
      if (currentClaim.voucher_id) {
        const { data: vData } = await supabase
          .from('vouchers')
          .select('current_uses')
          .eq('id', currentClaim.voucher_id)
          .single()

        if (vData) {
          await supabase
            .from('vouchers')
            .update({ current_uses: (vData.current_uses || 0) + 1 })
            .eq('id', currentClaim.voucher_id)
        }
      }

      // Update local state
      const updatedClaim: ClaimedVoucher = {
        ...currentClaim,
        status: 'used',
        used_via: 'offline_cashier',
        used_at: now,
      }
      setCurrentClaim(updatedClaim)
      setSuccessMsg(`Voucher ${currentClaim.voucher_code} BERHASIL DITUKARKAN untuk pelanggan!`)
      fetchRecentRedemptions()
    } catch (err: any) {
      console.error('Redeem error:', err)
      setErrorMsg('Gagal menukarkan voucher. Periksa koneksi atau izin kasir.')
    } finally {
      setRedeemLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-inter)' }}>
          <ShieldCheck size={14} /> Panel Kasir: Penukaran Voucher
        </div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem', fontFamily: 'var(--font-playfair)' }}>
          Scan & Validasi Voucher Offline
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', fontFamily: 'var(--font-inter)' }}>
          Pindai QR Code voucher pelanggan atau input kode/ID klaim untuk menukarkan diskon di meja kasir.
        </p>
      </div>

      {/* Main Grid: Scanner Left, Verification Result Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Column: Camera + Manual Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Camera Scanner Box */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-inter)' }}>Kamera Scanner</span>
              </div>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: cameraActive ? '#e85a4a' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-inter)',
                  transition: 'all 0.2s',
                }}
              >
                {cameraActive ? <CameraOff size={14} /> : <Camera size={14} />}
                {cameraActive ? 'Matikan Kamera' : 'Buka Scanner'}
              </button>
            </div>

            {/* Video Viewport Container */}
            <div
              style={{
                width: '100%',
                minHeight: cameraActive ? '280px' : '160px',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '2px dashed var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {!cameraActive && (
                <div style={{ padding: '2rem 1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  <QrCode size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-inter)', margin: 0 }}>
                    Kamera belum aktif. Klik tombol di atas untuk membuka scanner QR.
                  </p>
                </div>
              )}

              {/* Dedicated target for html5-qrcode: NO REACT CHILDREN INSIDE */}
              <div
                id="qr-reader-view"
                style={{
                  display: cameraActive ? 'block' : 'none',
                  width: '100%',
                  minHeight: '260px',
                }}
              />
            </div>
            {cameraActive && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)', marginTop: '0.75rem' }}>
                Arahkan kamera ke QR Code yang ditampilkan pada HP pelanggan.
              </p>
            )}
          </div>

          {/* Manual Input Fallback */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontFamily: 'var(--font-inter)' }}>
              Input Manual (Kode Promo / ID Klaim)
            </label>
            <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Contoh: WELCOME10 atau UUID"
                style={{
                  flex: 1,
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: 'var(--color-text)',
                  fontSize: '0.88rem',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={loading || !manualInput.trim()}
                className="btn-primary"
                style={{ padding: '9px 16px', fontSize: '0.85rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
                Cek
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Verification & Redemption Result */}
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          minHeight: '380px',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} style={{ color: 'var(--color-primary)' }} />
            Hasil Verifikasi Voucher
          </h2>

          {/* Feedback messages */}
          {errorMsg && (
            <div style={{
              background: 'rgba(232, 90, 74, 0.12)',
              border: '1px solid rgba(232, 90, 74, 0.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '1rem',
              color: '#e85a4a',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-inter)',
            }}>
              <XCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(74, 158, 106, 0.15)',
              border: '1px solid rgba(74, 158, 106, 0.4)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '1rem',
              color: '#4a9e6a',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-inter)',
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{successMsg}</div>
            </div>
          )}

          {/* If No Voucher Selected */}
          {!currentClaim && !loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <QrCode size={28} style={{ opacity: 0.3 }} />
              </div>
              <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-inter)', maxWidth: '280px', margin: 0 }}>
                Scan QR Code voucher pelanggan atau input kode manual untuk melihat detail potongan.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
              <RefreshCw size={30} className="animate-spin" style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>Memverifikasi ke database...</span>
            </div>
          )}

          {/* Validated Voucher Card */}
          {currentClaim && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Status Header Pill */}
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {currentClaim.status === 'claimed' ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(74, 158, 106, 0.15)',
                    color: '#4a9e6a',
                    border: '1px solid rgba(74, 158, 106, 0.3)',
                    padding: '5px 12px',
                    borderRadius: '50px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-inter)',
                  }}>
                    <CheckCircle2 size={14} /> VALID - SIAP DITUKARKAN
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(232, 90, 74, 0.15)',
                    color: '#e85a4a',
                    border: '1px solid rgba(232, 90, 74, 0.3)',
                    padding: '5px 12px',
                    borderRadius: '50px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-inter)',
                  }}>
                    <XCircle size={14} /> SUDAH PERNAH DIGUNAKAN
                  </span>
                )}

                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  ID #{currentClaim.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Discount Highlight Card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--color-bg-secondary), var(--color-bg-card))',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                  <div style={{
                    fontFamily: 'var(--font-playfair)',
                    fontWeight: 800,
                    fontSize: '1.6rem',
                    color: 'var(--color-primary)',
                  }}>
                    {currentClaim.vouchers?.discount_type === 'percentage'
                      ? `Diskon ${currentClaim.vouchers.discount_value}%`
                      : `Potongan Rp ${Number(currentClaim.vouchers?.discount_value || 0).toLocaleString('id-ID')}`}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)', letterSpacing: '0.1em' }}>
                    {currentClaim.voucher_code}
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-inter)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                  {currentClaim.vouchers?.description || 'Voucher Eksklusif'}
                </p>

                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                  Min. Belanja: Rp {Number(currentClaim.vouchers?.min_order || 0).toLocaleString('id-ID')}
                </div>
              </div>

              {/* Customer Information */}
              <div style={{
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-inter)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Pemilik Akun:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {currentClaim.profiles?.full_name || 'Member Terdaftar'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Email Akun:</span>
                  <span style={{ color: 'var(--color-text)' }}>
                    {currentClaim.profiles?.email || currentClaim.user_id.slice(0, 12)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Waktu Klaim:</span>
                  <span>{new Date(currentClaim.claimed_at).toLocaleDateString('id-ID')}</span>
                </div>
                {currentClaim.used_at && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e85a4a', fontWeight: 600 }}>
                    <span>Digunakan Pada:</span>
                    <span>{new Date(currentClaim.used_at).toLocaleString('id-ID')} ({currentClaim.used_via})</span>
                  </div>
                )}
              </div>

              {/* Redemption Action Button */}
              <div style={{ marginTop: 'auto' }}>
                {currentClaim.status === 'claimed' ? (
                  <button
                    onClick={handleRedeemOffline}
                    disabled={redeemLoading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #4a9e6a, #367c51)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontFamily: 'var(--font-inter)',
                      boxShadow: '0 4px 15px rgba(74, 158, 106, 0.4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {redeemLoading ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {redeemLoading ? 'Memproses Penukaran...' : 'Konfirmasi Tukar Voucher (Offline)'}
                  </button>
                ) : (
                  <div style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--color-bg-secondary)',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-inter)',
                  }}>
                    Voucher ini sudah pernah ditukarkan dan tidak dapat digunakan lagi.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Recent Redemptions Table */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-playfair)', margin: 0 }}>
            Riwayat Penukaran Kasir Terbaru
          </h3>
          <button
            onClick={fetchRecentRedemptions}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-inter)',
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {recentRedemptions.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-inter)', margin: '1rem 0', textAlign: 'center' }}>
            Belum ada penukaran voucher offline hari ini.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', fontFamily: 'var(--font-inter)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Waktu</th>
                  <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Kode Promo</th>
                  <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Nilai Diskon</th>
                  <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRedemptions.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                      {r.used_at ? new Date(r.used_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                      {r.voucher_code}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {r.vouchers?.discount_type === 'percentage'
                        ? `${r.vouchers.discount_value}% OFF`
                        : `Rp ${Number(r.vouchers?.discount_value || 0).toLocaleString('id-ID')}`}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(74, 158, 106, 0.15)', color: '#4a9e6a', padding: '2px 8px', borderRadius: '50px', fontWeight: 700 }}>
                        BERHASIL DITUKAR (OFFLINE)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
