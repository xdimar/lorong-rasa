'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Move,
  Check,
  X,
  Crop,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  RefreshCw,
  Sliders,
  Hand,
} from 'lucide-react'

export interface ImageAdjustModalProps {
  isOpen: boolean
  imageSrc: string | null
  fileName?: string
  onClose: () => void
  onConfirm: (processedDataUrl: string) => Promise<void> | void
}

export type AspectRatio = 'free' | '4:3' | '1:1' | '16:9' | '3:4'
type FitMode = 'cover' | 'contain'

type DragAction =
  | { type: 'crop-move'; startX: number; startY: number; startCrop: { x: number; y: number; width: number; height: number } }
  | {
      type: 'crop-resize'
      handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
      startX: number
      startY: number
      startCrop: { x: number; y: number; width: number; height: number }
    }
  | { type: 'pan-image'; startX: number; startY: number; startPan: { x: number; y: number } }

export function ImageAdjustModal({
  isOpen,
  imageSrc,
  fileName = 'menu-foto.jpg',
  onClose,
  onConfirm,
}: ImageAdjustModalProps) {
  // Viewport dimensions
  const STAGE_WIDTH = 480
  const STAGE_HEIGHT = 360

  // Transformation states
  const [zoom, setZoom] = useState(1.0)
  const [rotation, setRotation] = useState(0) // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free')
  const [fitMode, setFitMode] = useState<FitMode>('cover')
  const [interactionMode, setInteractionMode] = useState<'crop' | 'pan'>('crop')
  const [saving, setSaving] = useState(false)

  // Interactive Crop Box state (in viewport pixel coordinates)
  const [crop, setCrop] = useState({
    x: 40,
    y: 30,
    width: 400,
    height: 300,
  })

  // Dragging active state
  const [activeDrag, setActiveDrag] = useState<DragAction | null>(null)

  // Canvas and Image references
  const viewportRef = useRef<HTMLDivElement>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 })

  // Function to initialize default crop box for given ratio
  const calculateDefaultCrop = useCallback((ratio: AspectRatio) => {
    const pad = 24
    const maxW = STAGE_WIDTH - pad * 2
    const maxH = STAGE_HEIGHT - pad * 2

    let targetW = maxW
    let targetH = maxH

    if (ratio === '1:1') {
      const size = Math.min(maxW, maxH)
      targetW = size
      targetH = size
    } else if (ratio === '4:3') {
      const r = 4 / 3
      if (maxW / maxH > r) {
        targetH = maxH
        targetW = Math.round(targetH * r)
      } else {
        targetW = maxW
        targetH = Math.round(targetW / r)
      }
    } else if (ratio === '16:9') {
      const r = 16 / 9
      if (maxW / maxH > r) {
        targetH = maxH
        targetW = Math.round(targetH * r)
      } else {
        targetW = maxW
        targetH = Math.round(targetW / r)
      }
    } else if (ratio === '3:4') {
      const r = 3 / 4
      targetH = maxH
      targetW = Math.round(targetH * r)
    } else {
      // Free: default to generous 4:3 box that can be resized in any direction
      targetW = Math.round(maxW * 0.92)
      targetH = Math.round(targetW * 0.75)
    }

    return {
      x: Math.round((STAGE_WIDTH - targetW) / 2),
      y: Math.round((STAGE_HEIGHT - targetH) / 2),
      width: targetW,
      height: targetH,
    }
  }, [STAGE_WIDTH, STAGE_HEIGHT])

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!isOpen || !imageSrc) return

    setImgLoaded(false)
    setZoom(1.0)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setFitMode('cover')
    setAspectRatio('free')
    setInteractionMode('crop')
    setCrop(calculateDefaultCrop('free'))

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
  }, [isOpen, imageSrc, calculateDefaultCrop])

  // Handle aspect ratio change
  const handleSelectRatio = (ratio: AspectRatio) => {
    setAspectRatio(ratio)
    setCrop(calculateDefaultCrop(ratio))
  }

  // Draw image on canvas whenever transform parameters change
  const renderImageCanvas = useCallback(() => {
    const canvas = imageCanvasRef.current
    const img = loadedImageRef.current
    if (!canvas || !img || !imgLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // 1. Dark background
    ctx.fillStyle = '#171412'
    ctx.fillRect(0, 0, width, height)

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
  }, [imgLoaded, zoom, rotation, pan, fitMode])

  useEffect(() => {
    renderImageCanvas()
  }, [renderImageCanvas])

  // Mouse & Touch Dragging via Global Window Listeners
  useEffect(() => {
    if (!activeDrag) return

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - activeDrag.startX
      const dy = e.clientY - activeDrag.startY

      if (activeDrag.type === 'pan-image') {
        setPan({
          x: Math.round(activeDrag.startPan.x + dx),
          y: Math.round(activeDrag.startPan.y + dy),
        })
        return
      }

      if (activeDrag.type === 'crop-move') {
        const sc = activeDrag.startCrop
        const newX = Math.max(0, Math.min(STAGE_WIDTH - sc.width, Math.round(sc.x + dx)))
        const newY = Math.max(0, Math.min(STAGE_HEIGHT - sc.height, Math.round(sc.y + dy)))
        setCrop(prev => ({
          ...prev,
          x: newX,
          y: newY,
        }))
        return
      }

      if (activeDrag.type === 'crop-resize') {
        const { handle, startCrop: sc } = activeDrag
        const MIN_SIZE = 50

        let newX = sc.x
        let newY = sc.y
        let newW = sc.width
        let newH = sc.height

        // Calculate target ratio if not free
        let fixedRatio: number | null = null
        if (aspectRatio === '1:1') fixedRatio = 1
        else if (aspectRatio === '4:3') fixedRatio = 4 / 3
        else if (aspectRatio === '16:9') fixedRatio = 16 / 9
        else if (aspectRatio === '3:4') fixedRatio = 3 / 4

        // Apply delta based on handle
        if (handle.includes('r')) {
          newW = Math.max(MIN_SIZE, Math.min(STAGE_WIDTH - sc.x, sc.width + dx))
        }
        if (handle.includes('b')) {
          newH = Math.max(MIN_SIZE, Math.min(STAGE_HEIGHT - sc.y, sc.height + dy))
        }
        if (handle.includes('l')) {
          const maxLeftShift = sc.width - MIN_SIZE
          const clampedDx = Math.max(-sc.x, Math.min(maxLeftShift, dx))
          newX = sc.x + clampedDx
          newW = sc.width - clampedDx
        }
        if (handle.includes('t')) {
          const maxTopShift = sc.height - MIN_SIZE
          const clampedDy = Math.max(-sc.y, Math.min(maxTopShift, dy))
          newY = sc.y + clampedDy
          newH = sc.height - clampedDy
        }

        // Apply aspect ratio lock if active
        if (fixedRatio) {
          if (handle === 'r' || handle === 'l' || handle === 'br' || handle === 'bl') {
            newH = Math.round(newW / fixedRatio)
            if (newY + newH > STAGE_HEIGHT) {
              newH = STAGE_HEIGHT - newY
              newW = Math.round(newH * fixedRatio)
            }
          } else if (handle === 't' || handle === 'b' || handle === 'tr' || handle === 'tl') {
            newW = Math.round(newH * fixedRatio)
            if (newX + newW > STAGE_WIDTH) {
              newW = STAGE_WIDTH - newX
              newH = Math.round(newW / fixedRatio)
            }
          }
        }

        setCrop({
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        })
      }
    }

    const onPointerUp = () => {
      setActiveDrag(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [activeDrag, STAGE_WIDTH, STAGE_HEIGHT, aspectRatio])

  // Non-passive wheel event listener on viewport for smooth zoom
  useEffect(() => {
    if (!isOpen) return
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY * -0.0015
      setZoom(prev => Math.min(Math.max(0.4, Number((prev + delta).toFixed(2))), 3.5))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [isOpen])

  // Precise directional nudge buttons (Geser Foto Bebas)
  const handleNudge = (dx: number, dy: number) => {
    setPan(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }))
  }

  // Rotate 90 degrees
  const handleRotate = (deg: number = 90) => {
    setRotation(prev => (prev + deg + 360) % 360)
  }

  // Reset adjustments
  const handleReset = () => {
    setZoom(1.0)
    setRotation(0)
    setPan({ x: 0, y: 0 })
    setFitMode('cover')
    setAspectRatio('free')
    setCrop(calculateDefaultCrop('free'))
  }

  // Center photo
  const handleCenterPhoto = () => {
    setPan({ x: 0, y: 0 })
  }

  // Center crop box
  const handleCenterCropBox = () => {
    setCrop(prev => ({
      ...prev,
      x: Math.round((STAGE_WIDTH - prev.width) / 2),
      y: Math.round((STAGE_HEIGHT - prev.height) / 2),
    }))
  }

  // Export high resolution canvas
  const handleSave = async () => {
    const img = loadedImageRef.current
    if (!img) return

    setSaving(true)
    try {
      // Export resolution: standard crisp width of 800px or proportional
      const exportWidth = 800
      const exportHeight = Math.max(200, Math.round(exportWidth * (crop.height / crop.width)))
      const scaleFactor = exportWidth / crop.width

      const offscreenCanvas = document.createElement('canvas')
      offscreenCanvas.width = exportWidth
      offscreenCanvas.height = exportHeight
      const ctx = offscreenCanvas.getContext('2d')
      if (!ctx) throw new Error('Gagal menginisialisasi canvas ekspor.')

      // Fill background
      ctx.fillStyle = '#171412'
      ctx.fillRect(0, 0, exportWidth, exportHeight)

      // Transform mapping from viewport stage to export canvas:
      // (vx, vy) -> ((vx - crop.x) * scaleFactor, (vy - crop.y) * scaleFactor)
      const exportCenterX = (STAGE_WIDTH / 2 + pan.x - crop.x) * scaleFactor
      const exportCenterY = (STAGE_HEIGHT / 2 + pan.y - crop.y) * scaleFactor

      const isRotated90or270 = rotation === 90 || rotation === 270
      const effectiveImgW = isRotated90or270 ? img.naturalHeight : img.naturalWidth
      const effectiveImgH = isRotated90or270 ? img.naturalWidth : img.naturalHeight

      let baseScale = 1
      if (fitMode === 'contain') {
        baseScale = Math.min(STAGE_WIDTH / effectiveImgW, STAGE_HEIGHT / effectiveImgH)
      } else {
        baseScale = Math.max(STAGE_WIDTH / effectiveImgW, STAGE_HEIGHT / effectiveImgH)
      }

      const totalScale = baseScale * zoom
      const exportDrawW = img.naturalWidth * totalScale * scaleFactor
      const exportDrawH = img.naturalHeight * totalScale * scaleFactor

      ctx.save()
      ctx.translate(exportCenterX, exportCenterY)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(img, -exportDrawW / 2, -exportDrawH / 2, exportDrawW, exportDrawH)
      ctx.restore()

      // Export high-quality JPEG
      const dataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.9)
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
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
          maxWidth: '580px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          overflowY: 'auto',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.15rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--color-primary-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <Crop size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-playfair)', margin: 0, color: 'var(--color-text)' }}>
                Editor Potong & Posisikan Foto
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-inter)' }}>
                Tarik kotak potong bebas, geser foto ke posisi terbaik, atau zoom sesuai keinginan
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
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setInteractionMode('crop')}
              style={{
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: interactionMode === 'crop' ? 'var(--color-primary)' : 'transparent',
                color: interactionMode === 'crop' ? 'white' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Crop size={15} /> 1. Atur Kotak Potong (Crop Bebas)
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode('pan')}
              style={{
                padding: '8px 12px',
                borderRadius: '9px',
                border: 'none',
                background: interactionMode === 'pan' ? 'var(--color-primary)' : 'transparent',
                color: interactionMode === 'pan' ? 'white' : 'var(--color-text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Hand size={15} /> 2. Geser & Posisikan Foto (Pan)
            </button>
          </div>

          {/* Interactive Stage Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              ref={viewportRef}
              style={{
                width: `${STAGE_WIDTH}px`,
                maxWidth: '100%',
                height: `${STAGE_HEIGHT}px`,
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-border)',
                overflow: 'hidden',
                position: 'relative',
                userSelect: 'none',
                background: '#171412',
                boxShadow: 'inset 0 0 25px rgba(0,0,0,0.6)',
                touchAction: 'none',
              }}
              onPointerDown={e => {
                // If clicked outside the crop box or in Pan mode, start panning image
                if (interactionMode === 'pan') {
                  setActiveDrag({
                    type: 'pan-image',
                    startX: e.clientX,
                    startY: e.clientY,
                    startPan: { ...pan },
                  })
                }
              }}
            >
              {/* Canvas 1: Transformed Image */}
              <canvas
                ref={imageCanvasRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />

              {/* Dimmed Overlay outside the crop box */}
              {/* Top mask */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${crop.y}px`,
                  background: 'rgba(0, 0, 0, 0.65)',
                  pointerEvents: 'auto',
                  cursor: 'grab',
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  setActiveDrag({
                    type: 'pan-image',
                    startX: e.clientX,
                    startY: e.clientY,
                    startPan: { ...pan },
                  })
                }}
              />
              {/* Bottom mask */}
              <div
                style={{
                  position: 'absolute',
                  top: `${crop.y + crop.height}px`,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.65)',
                  pointerEvents: 'auto',
                  cursor: 'grab',
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  setActiveDrag({
                    type: 'pan-image',
                    startX: e.clientX,
                    startY: e.clientY,
                    startPan: { ...pan },
                  })
                }}
              />
              {/* Left mask */}
              <div
                style={{
                  position: 'absolute',
                  top: `${crop.y}px`,
                  left: 0,
                  width: `${crop.x}px`,
                  height: `${crop.height}px`,
                  background: 'rgba(0, 0, 0, 0.65)',
                  pointerEvents: 'auto',
                  cursor: 'grab',
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  setActiveDrag({
                    type: 'pan-image',
                    startX: e.clientX,
                    startY: e.clientY,
                    startPan: { ...pan },
                  })
                }}
              />
              {/* Right mask */}
              <div
                style={{
                  position: 'absolute',
                  top: `${crop.y}px`,
                  left: `${crop.x + crop.width}px`,
                  right: 0,
                  height: `${crop.height}px`,
                  background: 'rgba(0, 0, 0, 0.65)',
                  pointerEvents: 'auto',
                  cursor: 'grab',
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  setActiveDrag({
                    type: 'pan-image',
                    startX: e.clientX,
                    startY: e.clientY,
                    startPan: { ...pan },
                  })
                }}
              />

              {/* The Interactive Crop Box */}
              <div
                style={{
                  position: 'absolute',
                  left: `${crop.x}px`,
                  top: `${crop.y}px`,
                  width: `${crop.width}px`,
                  height: `${crop.height}px`,
                  border: '2px solid var(--color-primary)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 15px var(--color-primary-glow)',
                  boxSizing: 'border-box',
                  cursor: interactionMode === 'pan' ? 'grab' : 'move',
                  pointerEvents: 'auto',
                }}
                onPointerDown={e => {
                  e.stopPropagation()
                  if (interactionMode === 'pan') {
                    setActiveDrag({
                      type: 'pan-image',
                      startX: e.clientX,
                      startY: e.clientY,
                      startPan: { ...pan },
                    })
                  } else {
                    setActiveDrag({
                      type: 'crop-move',
                      startX: e.clientX,
                      startY: e.clientY,
                      startCrop: { ...crop },
                    })
                  }
                }}
              >
                {/* Rule of Thirds Grid (Subtle lines) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                </div>

                {/* Dimension Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    color: 'var(--color-primary)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    pointerEvents: 'none',
                    letterSpacing: '0.04em',
                    fontFamily: 'monospace',
                  }}
                >
                  {crop.width} × {crop.height} px ({aspectRatio === 'free' ? 'Bebas' : aspectRatio})
                </div>

                {/* 4 Corner Resize Handles */}
                {/* Top-Left */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    left: '-7px',
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    border: '2.5px solid var(--color-primary)',
                    borderRadius: '3px',
                    cursor: 'nwse-resize',
                    zIndex: 2,
                  }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    setActiveDrag({
                      type: 'crop-resize',
                      handle: 'tl',
                      startX: e.clientX,
                      startY: e.clientY,
                      startCrop: { ...crop },
                    })
                  }}
                />
                {/* Top-Right */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    right: '-7px',
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    border: '2.5px solid var(--color-primary)',
                    borderRadius: '3px',
                    cursor: 'nesw-resize',
                    zIndex: 2,
                  }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    setActiveDrag({
                      type: 'crop-resize',
                      handle: 'tr',
                      startX: e.clientX,
                      startY: e.clientY,
                      startCrop: { ...crop },
                    })
                  }}
                />
                {/* Bottom-Left */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-7px',
                    left: '-7px',
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    border: '2.5px solid var(--color-primary)',
                    borderRadius: '3px',
                    cursor: 'nesw-resize',
                    zIndex: 2,
                  }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    setActiveDrag({
                      type: 'crop-resize',
                      handle: 'bl',
                      startX: e.clientX,
                      startY: e.clientY,
                      startCrop: { ...crop },
                    })
                  }}
                />
                {/* Bottom-Right */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-7px',
                    right: '-7px',
                    width: '14px',
                    height: '14px',
                    background: 'white',
                    border: '2.5px solid var(--color-primary)',
                    borderRadius: '3px',
                    cursor: 'nwse-resize',
                    zIndex: 2,
                  }}
                  onPointerDown={e => {
                    e.stopPropagation()
                    setActiveDrag({
                      type: 'crop-resize',
                      handle: 'br',
                      startX: e.clientX,
                      startY: e.clientY,
                      startCrop: { ...crop },
                    })
                  }}
                />

                {/* 4 Edge Handles (Available when in Free mode) */}
                {aspectRatio === 'free' && (
                  <>
                    {/* Top Edge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '26px',
                        height: '10px',
                        background: 'white',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '3px',
                        cursor: 'ns-resize',
                        zIndex: 2,
                      }}
                      onPointerDown={e => {
                        e.stopPropagation()
                        setActiveDrag({
                          type: 'crop-resize',
                          handle: 't',
                          startX: e.clientX,
                          startY: e.clientY,
                          startCrop: { ...crop },
                        })
                      }}
                    />
                    {/* Bottom Edge */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '26px',
                        height: '10px',
                        background: 'white',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '3px',
                        cursor: 'ns-resize',
                        zIndex: 2,
                      }}
                      onPointerDown={e => {
                        e.stopPropagation()
                        setActiveDrag({
                          type: 'crop-resize',
                          handle: 'b',
                          startX: e.clientX,
                          startY: e.clientY,
                          startCrop: { ...crop },
                        })
                      }}
                    />
                    {/* Left Edge */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-5px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '10px',
                        height: '26px',
                        background: 'white',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '3px',
                        cursor: 'ew-resize',
                        zIndex: 2,
                      }}
                      onPointerDown={e => {
                        e.stopPropagation()
                        setActiveDrag({
                          type: 'crop-resize',
                          handle: 'l',
                          startX: e.clientX,
                          startY: e.clientY,
                          startCrop: { ...crop },
                        })
                      }}
                    />
                    {/* Right Edge */}
                    <div
                      style={{
                        position: 'absolute',
                        right: '-5px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '10px',
                        height: '26px',
                        background: 'white',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '3px',
                        cursor: 'ew-resize',
                        zIndex: 2,
                      }}
                      onPointerDown={e => {
                        e.stopPropagation()
                        setActiveDrag({
                          type: 'crop-resize',
                          handle: 'r',
                          startX: e.clientX,
                          startY: e.clientY,
                          startCrop: { ...crop },
                        })
                      }}
                    />
                  </>
                )}
              </div>

              {/* Floating Helper Tip */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.78)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 12px',
                  borderRadius: '50px',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-inter)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: 0.9,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                {interactionMode === 'crop' ? (
                  <>
                    <Crop size={12} color="var(--color-primary)" />
                    <span>Tarik sudut kotak untuk potong bebas • Geser tengah untuk memindahkan</span>
                  </>
                ) : (
                  <>
                    <Move size={12} color="var(--color-primary)" />
                    <span>Klik & seret foto untuk menggeser posisi • Scroll mouse untuk zoom</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: `${STAGE_WIDTH}px`,
                maxWidth: '100%',
                marginTop: '6px',
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-inter)',
              }}
            >
              <span>Posisi Foto: <strong>X: {pan.x}px, Y: {pan.y}px</strong></span>
              <span>Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
              <span>Rotasi: <strong>{rotation}°</strong></span>
            </div>
          </div>

          {/* Ratio Selection Chips */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pilihan Bentuk Potongan (Aspect Ratio):
              </label>
              {aspectRatio === 'free' && (
                <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  ✨ Bebas ditarik ke ukuran berapapun
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'free', label: '✂️ Bebas (Custom / Freeform)' },
                { key: '4:3', label: '4:3 (Standar Menu)' },
                { key: '1:1', label: '1:1 (Persegi)' },
                { key: '16:9', label: '16:9 (Lanskap Banner)' },
                { key: '3:4', label: '3:4 (Potret)' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectRatio(opt.key as AspectRatio)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '50px',
                    border: `1px solid ${aspectRatio === opt.key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: aspectRatio === opt.key ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                    color: aspectRatio === opt.key ? 'white' : 'var(--color-text)',
                    fontSize: '0.75rem',
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

          {/* D-Pad Free Pan Controls & Zoom Slider Container */}
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Row 1: Zoom Controls */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Perbesar / Perkecil (Zoom):
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Perkecil"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min="0.4"
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
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(3.5, Number((prev + 0.1).toFixed(2))))}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Perbesar"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  100%
                </button>
              </div>
            </div>

            {/* Row 2: Geser Posisi Foto (D-Pad directional nudges) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginRight: '4px' }}>
                  Geser Foto:
                </span>
                <button
                  type="button"
                  onClick={() => handleNudge(-25, 0)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Geser Kiri (25px)"
                >
                  <ArrowLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, -25)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Geser Atas (25px)"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(0, 25)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Geser Bawah (25px)"
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(25, 0)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Geser Kanan (25px)"
                >
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleCenterPhoto}
                  style={{
                    padding: '4px 8px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Pusatkan Foto di Tengah"
                >
                  <Crosshair size={12} /> Pusat
                </button>
              </div>

              {/* Rotasi & Mode Fit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  style={{
                    padding: '4px 8px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    color: 'var(--color-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCw size={12} /> Putar 90°
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '4px 8px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={11} /> Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
            borderBottomLeftRadius: 'var(--radius-xl)',
            borderBottomRightRadius: 'var(--radius-xl)',
          }}
        >
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
              padding: '0.65rem 1.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
              border: 'none',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px var(--color-primary-glow)',
            }}
          >
            <Check size={16} />
            {saving ? 'Menyimpan Penyesuaian...' : 'Terapkan & Simpan Foto Menu'}
          </button>
        </div>
      </div>
    </div>
  )
}
