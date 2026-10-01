'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Move,
  Check,
  X,
  RotateCcw,
  Crop,
  Sliders,
  Sparkles,
} from 'lucide-react'

export interface ImageAdjustModalProps {
  isOpen: boolean
  imageSrc: string | null
  fileName?: string
  onClose: () => void
  onConfirm: (processedDataUrl: string) => Promise<void> | void
}

type AspectRatio = '4:3' | '1:1' | '16:9' | 'free'
type FitMode = 'cover' | 'contain'

export function ImageAdjustModal({
  isOpen,
  imageSrc,
  fileName = 'menu-foto.jpg',
  onClose,
  onConfirm,
}: ImageAdjustModalProps) {
  // Transformation states
  const [zoom, setZoom] = useState(1.0)
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3')
  const [fitMode, setFitMode] = useState<FitMode>('cover')
  const [saving, setSaving] = useState(false)

  // Dragging states
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0 })

  // Canvas and Image references
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 })

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) return

    setImgLoaded(false)
    setZoom(1.0)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setFitMode('cover')

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      loadedImageRef.current = img
      setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      setImgLoaded(true)
    }
    img.onerror = () => {
      console.error('Gagal memuat gambar untuk penyesuaian.')
    }
    img.src = imageSrc
  }, [isOpen, imageSrc])

  // Determine preview canvas aspect ratio
  const getAspectRatioValue = useCallback((ratio: AspectRatio, naturalW: number, naturalH: number) => {
    if (ratio === '4:3') return 4 / 3
    if (ratio === '1:1') return 1
    if (ratio === '16:9') return 16 / 9
    return naturalW && naturalH ? naturalW / naturalH : 4 / 3
  }, [])

  // Draw on canvas whenever parameters change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = loadedImageRef.current
    if (!canvas || !img || !imgLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 1. Clear with deep elegant card background
    ctx.fillStyle = '#171412'
    ctx.fillRect(0, 0, width, height)

    // Optional: subtle grid pattern for framing guide
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()

    // 2. Draw transformed image
    ctx.save()
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y)
    ctx.rotate((rotation * Math.PI) / 180)

    const isRotated90or270 = rotation === 90 || rotation === 270
    const effectiveImgW = isRotated90or270 ? img.naturalHeight : img.naturalWidth
    const effectiveImgH = isRotated90or270 ? img.naturalWidth : img.naturalHeight

    let baseScale = 1
    if (fitMode === 'contain') {
      baseScale = Math.min(width / effectiveImgW, height / effectiveImgH)
    } else {
      baseScale = Math.max(width / effectiveImgW, height / effectiveImgH)
    }

    const totalScale = baseScale * zoom
    const drawW = img.naturalWidth * totalScale
    const drawH = img.naturalHeight * totalScale

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()

    // 3. Rule of Thirds guides (semi-transparent)
    ctx.save()
    ctx.strokeStyle = 'rgba(232, 160, 74, 0.25)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    // Verticals
    ctx.beginPath()
    ctx.moveTo(width / 3, 0)
    ctx.lineTo(width / 3, height)
    ctx.moveTo((width * 2) / 3, 0)
    ctx.lineTo((width * 2) / 3, height)
    // Horizontals
    ctx.moveTo(0, height / 3)
    ctx.lineTo(width, height / 3)
    ctx.moveTo(0, (height * 2) / 3)
    ctx.lineTo(width, (height * 2) / 3)
    ctx.stroke()
    ctx.restore()
  }, [imgLoaded, zoom, rotation, pan, fitMode])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  // Mouse & Touch Pan Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true)
    dragStartRef.current = { x: clientX, y: clientY }
    panStartRef.current = { ...pan }
  }

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return
    const dx = clientX - dragStartRef.current.x
    const dy = clientY - dragStartRef.current.y
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    })
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.0015
    setZoom(prev => Math.min(Math.max(0.4, prev + delta), 3.5))
  }

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  // Reset adjustments
  const handleReset = () => {
    setZoom(1.0)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setFitMode('cover')
  }

  // Export high resolution canvas
  const handleSave = async () => {
    const img = loadedImageRef.current
    if (!img) return

    setSaving(true)
    try {
      // Determine export dimensions for crisp display
      let exportWidth = 800
      const ratio = getAspectRatioValue(aspectRatio, imgNaturalSize.width, imgNaturalSize.height)
      let exportHeight = Math.round(exportWidth / ratio)

      if (aspectRatio === '1:1') {
        exportWidth = 700
        exportHeight = 700
      } else if (aspectRatio === '16:9') {
        exportWidth = 960
        exportHeight = 540
      } else if (aspectRatio === '4:3') {
        exportWidth = 800
        exportHeight = 600
      }

      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = exportWidth
      offscreenCanvas.height = exportHeight
      const ctx = offscreenCanvas.getContext('2d')
      if (!ctx) throw new Error('Gagal menginisialisasi canvas ekspor.')

      // Fill background
      ctx.fillStyle = '#171412'
      ctx.fillRect(0, 0, exportWidth, exportHeight)

      // Calculate scale relative to preview canvas
      const previewCanvas = canvasRef.current
      const scaleFactor = previewCanvas ? exportWidth / previewCanvas.width : 1

      ctx.save()
      ctx.translate(exportWidth / 2 + pan.x * scaleFactor, exportHeight / 2 + pan.y * scaleFactor)
      ctx.rotate((rotation * Math.PI) / 180)

      const isRotated90or270 = rotation === 90 || rotation === 270
      const effectiveImgW = isRotated90or270 ? img.naturalHeight : img.naturalWidth
      const effectiveImgH = isRotated90or270 ? img.naturalWidth : img.naturalHeight

      let baseScale = 1
      if (fitMode === 'contain') {
        baseScale = Math.min(exportWidth / effectiveImgW, exportHeight / effectiveImgH)
      } else {
        baseScale = Math.max(exportWidth / effectiveImgW, exportHeight / effectiveImgH)
      }

      const totalScale = baseScale * zoom
      const drawW = img.naturalWidth * totalScale
      const drawH = img.naturalHeight * totalScale

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()

      // Export high-quality JPEG (0.88 quality is great balance of clarity & small file size)
      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.88)
      await onConfirm(dataUrl)
      onClose()
    } catch (err) {
      console.error('Error saving adjusted image:', err)
      alert('Terjadi kesalahan saat memproses gambar.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // Calculate preview display dimensions
  const previewMaxWidth = 440
  const currentRatio = getAspectRatioValue(aspectRatio, imgNaturalSize.width, imgNaturalSize.height)
  const previewHeight = Math.round(previewMaxWidth / currentRatio)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={() => !saving && onClose()}
    >
      <div
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--color-primary-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}>
              <Crop size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', margin: 0, color: 'var(--color-text)' }}>
                Sesuaikan Ukuran Foto Menu
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                Geser, perbesar, atau ubah mode agar foto tidak terpotong canggung
              </p>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* Interactive Canvas Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: `${previewMaxWidth}px`,
                maxWidth: '100%',
                height: `${previewHeight}px`,
                borderRadius: 'var(--radius-lg)',
                border: '2px dashed var(--color-primary)',
                overflow: 'hidden',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                background: '#171412',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                touchAction: 'none',
              }}
              onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={e => {
                if (e.touches[0]) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchMove={e => {
                if (e.touches[0]) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
              }}
              onTouchEnd={handlePointerUp}
              onWheel={handleWheel}
              title="Klik dan seret untuk memposisikan foto. Scroll mouse untuk zoom."
            >
              <canvas
                ref={canvasRef}
                width={previewMaxWidth}
                height={previewHeight}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />

              {/* Floating Helper Tip */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                padding: '3px 12px',
                borderRadius: '50px',
                color: 'white',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-inter)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.85,
              }}>
                <Move size={11} />
                <span>Geser untuk memposisikan • Scroll untuk zoom</span>
              </div>
            </div>

            {/* Quick Dimension & Ratio Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: `${previewMaxWidth}px`,
              maxWidth: '100%',
              marginTop: '6px',
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-inter)',
            }}>
              <span>Rasio: <strong>{aspectRatio.toUpperCase()}</strong></span>
              <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
              <span>Resolusi Ekspor: <strong>{aspectRatio === '1:1' ? '700×700' : aspectRatio === '16:9' ? '960×540' : '800×600'} px</strong></span>
            </div>
          </div>

          {/* Fit Mode Toggle: Contain (Utuh) vs Cover (Penuh) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mode Tampilan Gambar:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { setFitMode('contain'); setPan({ x: 0, y: 0 }) }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: fitMode === 'contain' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${fitMode === 'contain' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: fitMode === 'contain' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Minimize2 size={15} />
                <div>
                  <div>Muat Penuh (Contain)</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Foto utuh tanpa terpotong</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFitMode('cover')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: fitMode === 'cover' ? 'var(--color-primary-glow)' : 'var(--color-bg-secondary)',
                  border: `1px solid ${fitMode === 'cover' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  color: fitMode === 'cover' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Maximize2 size={15} />
                <div>
                  <div>Isi Penuh (Cover)</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 400, opacity: 0.8 }}>Mengisi bingkai proporsional</div>
                </div>
              </button>
            </div>
          </div>

          {/* Aspect Ratio Presets */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pilihan Rasio Bingkai (Aspect Ratio):
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: '4:3', label: '4:3 (Standar Menu)' },
                { key: '1:1', label: '1:1 (Persegi)' },
                { key: '16:9', label: '16:9 (Lanskap)' },
                { key: 'free', label: 'Sesuai Asli' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAspectRatio(opt.key as AspectRatio)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '50px',
                    border: `1px solid ${aspectRatio === opt.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: aspectRatio === opt.key ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: aspectRatio === opt.key ? 'white' : 'var(--color-text)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom Slider & Rotation Tools */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {/* Zoom Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ZoomOut size={16} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              />
              <ZoomIn size={16} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '45px', textAlign: 'right', color: 'var(--color-text)' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-light)', paddingTop: '0.65rem' }}>
              <button
                type="button"
                onClick={handleRotate}
                style={{
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  color: 'var(--color-text)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={13} /> Putar 90° ({rotation}°)
              </button>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} /> Reset Pengaturan
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
        }}>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Batal
          </button>

          <button
            type="button"
            disabled={saving || !imgLoaded}
            onClick={handleSave}
            style={{
              padding: '0.6rem 1.35rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              border: 'none',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px var(--color-primary-glow)',
            }}
          >
            <Check size={16} />
            {saving ? 'Menyimpan Penyesuaian...' : 'Terapkan & Simpan Foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
