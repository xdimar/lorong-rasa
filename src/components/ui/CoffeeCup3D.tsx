'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface CoffeeCup3DProps {
  drinkId?: string
  drinkName?: string
  accentColor?: string
}

export function CoffeeCup3D({
  drinkId = 'signature-iced-latte',
  drinkName = 'Signature Iced Latte',
  accentColor = '#d4a04a',
}: CoffeeCup3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [isInteracting, setIsInteracting] = useState(false)

  // Internal mutable refs for 3D state
  const stateRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    cupGroup: THREE.Group
    liquidMesh: THREE.Mesh | null
    cupMesh: THREE.Mesh | null
    saucerMesh: THREE.Mesh | null
    iceGroup: THREE.Group | null
    steamParticles: THREE.Points | null
    steamPositions: Float32Array | null
    steamVelocities: Float32Array | null
    isDragging: boolean
    previousPointerPosition: { x: number; y: number }
    rotationVelocity: { x: number; y: number }
    targetRotation: { x: number; y: number }
    currentRotation: { x: number; y: number }
    autoRotate: boolean
    idleTimer: number | null
    animId: number | null
  } | null>(null)

  // Helper to generate procedural latte art / liquid texture
  const createLiquidTexture = (type: string): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    const centerX = 128
    const centerY = 128
    const radius = 124

    if (type === 'kyoto-matcha-fusion') {
      // --- Kyoto Matcha Texture ---
      const grad = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, radius)
      grad.addColorStop(0, '#86c268')
      grad.addColorStop(0.4, '#5d9c42')
      grad.addColorStop(0.75, '#3b6e27')
      grad.addColorStop(1, '#1b3b12')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      // Frothy matcha swirl & crema foam
      ctx.strokeStyle = 'rgba(235, 252, 225, 0.85)'
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.arc(centerX, centerY, 65, 0.2 * Math.PI, 1.8 * Math.PI)
      ctx.stroke()

      // Inner matcha heart
      ctx.fillStyle = 'rgba(245, 255, 235, 0.92)'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY + 20)
      ctx.bezierCurveTo(centerX - 30, centerY - 10, centerX - 40, centerY - 45, centerX, centerY - 25)
      ctx.bezierCurveTo(centerX + 40, centerY - 45, centerX + 30, centerY - 10, centerX, centerY + 20)
      ctx.fill()
    } else if (type === 'artisan-cold-brew') {
      // --- Cold Brew Dark Amber Texture ---
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius)
      grad.addColorStop(0, '#542d13')
      grad.addColorStop(0.5, '#2e1607')
      grad.addColorStop(0.85, '#190a03')
      grad.addColorStop(1, '#090301')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      // Subtle condensation ripple rings
      ctx.strokeStyle = 'rgba(212, 160, 74, 0.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(centerX, centerY, 85, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      // --- Signature Latte Art (Rosetta & Crema) ---
      const grad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius)
      grad.addColorStop(0, '#e5be8a')
      grad.addColorStop(0.35, '#c28542')
      grad.addColorStop(0.7, '#784318')
      grad.addColorStop(1, '#2d1505')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      // Golden crema speckles
      ctx.fillStyle = 'rgba(245, 222, 185, 0.2)'
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = 30 + Math.random() * 75
        const sz = 2 + Math.random() * 4
        ctx.beginPath()
        ctx.arc(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist, sz, 0, Math.PI * 2)
        ctx.fill()
      }

      // Artisan Creamy Heart
      ctx.fillStyle = 'rgba(255, 248, 235, 0.95)'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY + 32)
      ctx.bezierCurveTo(centerX - 42, centerY, centerX - 50, centerY - 48, centerX, centerY - 22)
      ctx.bezierCurveTo(centerX + 50, centerY - 48, centerX + 42, centerY, centerX, centerY + 32)
      ctx.fill()

      // Small secondary inner heart
      ctx.fillStyle = '#e8cfa8'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY + 15)
      ctx.bezierCurveTo(centerX - 20, centerY - 5, centerX - 25, centerY - 30, centerX, centerY - 15)
      ctx.bezierCurveTo(centerX + 25, centerY - 30, centerX + 20, centerY - 5, centerX, centerY + 15)
      ctx.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.generateMipmaps = true
    return texture
  }

  // Generate steam texture
  const createSteamTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      grad.addColorStop(0.3, 'rgba(240, 235, 225, 0.4)')
      grad.addColorStop(0.7, 'rgba(220, 215, 205, 0.1)')
      grad.addColorStop(1, 'rgba(200, 195, 185, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 128, 128)
    }
    return new THREE.CanvasTexture(canvas)
  }

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 420
    const height = container.clientHeight || 420

    // 1. Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    // Slightly elevated angle so user naturally sees both the side silhouette & latte art inside
    camera.position.set(0, 3.2, 5.8)
    camera.lookAt(0, 0.2, 0)

    // 2. Renderer with High Dynamic Range & Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap

    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.8)
    scene.add(ambientLight)

    // Warm Key Light (Top-Left)
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.2)
    keyLight.position.set(4, 7, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 512
    keyLight.shadow.mapSize.height = 512
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 15
    keyLight.shadow.bias = -0.001
    scene.add(keyLight)

    // Cool Soft Fill Light (Right)
    const fillLight = new THREE.DirectionalLight(0xc8e0ff, 0.9)
    fillLight.position.set(-5, 3, -3)
    scene.add(fillLight)

    // Golden Rim / Backlight for dramatic rim highlights
    const rimLight = new THREE.PointLight(0xd4a04a, 3.0, 10)
    rimLight.position.set(0, 4, -4)
    scene.add(rimLight)

    // 4. Create 3D Coffee Cup Group
    const cupGroup = new THREE.Group()
    scene.add(cupGroup)

    // --- A. Ceramic Mug Body ---
    // Smooth tapered cylinder with thick ceramic walls
    const cupGeometry = new THREE.CylinderGeometry(1.22, 0.95, 1.65, 32, 1, false)
    const cupMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x221710, // Dark espresso ceramic
      roughness: 0.28,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    })
    const cupMesh = new THREE.Mesh(cupGeometry, cupMaterial)
    cupMesh.position.y = 0.825
    cupMesh.castShadow = true
    cupMesh.receiveShadow = true
    cupGroup.add(cupMesh)

    // Inner Cup Ceramic (Light cream inside rim)
    const innerGeometry = new THREE.CylinderGeometry(1.15, 0.88, 1.55, 32, 1, true)
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5ead6,
      roughness: 0.35,
      side: THREE.BackSide,
    })
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial)
    innerMesh.position.y = 0.88
    cupGroup.add(innerMesh)

    // Gold / Terracotta Top Rim Trim
    const rimGeometry = new THREE.TorusGeometry(1.18, 0.05, 12, 32)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a04a,
      roughness: 0.2,
      metalness: 0.8,
    })
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial)
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.y = 1.65
    cupGroup.add(rimMesh)

    // --- B. Ceramic Mug Handle ---
    const handleGeometry = new THREE.TorusGeometry(0.55, 0.11, 16, 24, Math.PI * 1.1)
    const handleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x221710,
      roughness: 0.28,
      metalness: 0.04,
      clearcoat: 0.55,
    })
    const handleMesh = new THREE.Mesh(handleGeometry, handleMaterial)
    handleMesh.position.set(1.28, 0.88, 0)
    handleMesh.rotation.y = -Math.PI / 2
    handleMesh.rotation.z = Math.PI * 0.45
    handleMesh.castShadow = true
    cupGroup.add(handleMesh)

    // --- C. Ceramic Saucer (Piring Tatakan) ---
    const saucerGeometry = new THREE.CylinderGeometry(1.95, 1.45, 0.16, 32)
    const saucerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a120c,
      roughness: 0.3,
      metalness: 0.04,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    })
    const saucerMesh = new THREE.Mesh(saucerGeometry, saucerMaterial)
    saucerMesh.position.y = 0.08
    saucerMesh.receiveShadow = true
    saucerMesh.castShadow = true
    cupGroup.add(saucerMesh)

    // Saucer Gold Accent Ring
    const saucerRingGeo = new THREE.TorusGeometry(1.85, 0.025, 12, 32)
    const saucerRing = new THREE.Mesh(saucerRingGeo, rimMaterial)
    saucerRing.rotation.x = Math.PI / 2
    saucerRing.position.y = 0.16
    cupGroup.add(saucerRing)

    // --- D. Liquid Surface Disk with Latte Art ---
    const liquidGeometry = new THREE.CircleGeometry(1.13, 32)
    const initialTexture = createLiquidTexture(drinkId)
    const liquidMaterial = new THREE.MeshStandardMaterial({
      map: initialTexture,
      roughness: 0.3,
      metalness: 0.05,
    })
    const liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial)
    liquidMesh.rotation.x = -Math.PI / 2
    liquidMesh.position.y = 1.55 // Sits right below rim
    cupGroup.add(liquidMesh)

    // --- E. Floating Ice Cubes (for Cold Brew) ---
    const iceGroup = new THREE.Group()
    iceGroup.visible = drinkId === 'artisan-cold-brew'
    const iceGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38)
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1.0,
    })
    for (let i = 0; i < 3; i++) {
      const iceCube = new THREE.Mesh(iceGeo, iceMat)
      const angle = (i * Math.PI * 2) / 3
      iceCube.position.set(Math.cos(angle) * 0.45, 1.58, Math.sin(angle) * 0.45)
      iceCube.rotation.set(0.3 * i, 0.5 * i, 0.2 * i)
      iceGroup.add(iceCube)
    }
    cupGroup.add(iceGroup)

    // --- F. Rising Steam Particles ---
    const particleCount = 28
    const steamGeo = new THREE.BufferGeometry()
    const steamPositions = new Float32Array(particleCount * 3)
    const steamVelocities = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radiusDist = Math.random() * 0.75
      steamPositions[i * 3] = Math.cos(angle) * radiusDist
      steamPositions[i * 3 + 1] = 1.6 + Math.random() * 1.8
      steamPositions[i * 3 + 2] = Math.sin(angle) * radiusDist

      steamVelocities[i * 3] = (Math.random() - 0.5) * 0.004
      steamVelocities[i * 3 + 1] = 0.008 + Math.random() * 0.012
      steamVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004
    }

    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3))
    const steamMat = new THREE.PointsMaterial({
      size: 0.55,
      map: createSteamTexture(),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const steamParticles = new THREE.Points(steamGeo, steamMat)
    cupGroup.add(steamParticles)

    // Ground Contact Shadow Floor
    const shadowGeo = new THREE.PlaneGeometry(5, 5)
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = 128
    shadowCanvas.height = 128
    const shadowCtx = shadowCanvas.getContext('2d')
    if (shadowCtx) {
      const grad = shadowCtx.createRadialGradient(64, 64, 10, 64, 64, 60)
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)')
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      shadowCtx.fillStyle = grad
      shadowCtx.fillRect(0, 0, 128, 128)
    }
    const shadowMat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    })
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat)
    shadowPlane.rotation.x = -Math.PI / 2
    shadowPlane.position.y = -0.01
    scene.add(shadowPlane)

    // Save references to stateRef
    stateRef.current = {
      scene,
      camera,
      renderer,
      cupGroup,
      liquidMesh,
      cupMesh,
      saucerMesh,
      iceGroup,
      steamParticles,
      steamPositions,
      steamVelocities,
      isDragging: false,
      previousPointerPosition: { x: 0, y: 0 },
      rotationVelocity: { x: 0, y: 0 },
      targetRotation: { x: 0.22, y: -0.65 },
      currentRotation: { x: 0.22, y: -0.65 },
      autoRotate: true,
      idleTimer: null,
      animId: null,
    }

    // --- Interactive Drag & 360-Degree Controls ---
    const handlePointerDown = (e: PointerEvent) => {
      if (!stateRef.current) return
      stateRef.current.isDragging = true
      stateRef.current.autoRotate = false
      stateRef.current.previousPointerPosition = { x: e.clientX, y: e.clientY }
      stateRef.current.rotationVelocity = { x: 0, y: 0 }
      setIsInteracting(true)

      try {
        domElement.setPointerCapture(e.pointerId)
      } catch {
        // Fallback if browser does not support pointer capture
      }

      if (stateRef.current.idleTimer) {
        window.clearTimeout(stateRef.current.idleTimer)
        stateRef.current.idleTimer = null
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      const state = stateRef.current
      if (!state || !state.isDragging) return

      const deltaX = e.clientX - state.previousPointerPosition.x
      const deltaY = e.clientY - state.previousPointerPosition.y

      state.previousPointerPosition = { x: e.clientX, y: e.clientY }

      // Horizontal rotation has no limit (360 degrees full circle)
      const rotYDelta = deltaX * 0.008
      // Vertical tilt is clamped so cup doesn't flip upside down
      const rotXDelta = deltaY * 0.006

      state.targetRotation.y += rotYDelta
      state.targetRotation.x = Math.max(-0.25, Math.min(0.65, state.targetRotation.x + rotXDelta))

      state.rotationVelocity = { x: rotXDelta, y: rotYDelta }
    }

    const handlePointerUp = (e: PointerEvent) => {
      const state = stateRef.current
      if (!state) return
      state.isDragging = false
      setIsInteracting(false)

      try {
        if (domElement.hasPointerCapture(e.pointerId)) {
          domElement.releasePointerCapture(e.pointerId)
        }
      } catch {
        // Fallback
      }

      // Restart gentle auto-rotation after 2 seconds of inactivity
      state.idleTimer = window.setTimeout(() => {
        if (stateRef.current) {
          stateRef.current.autoRotate = true
        }
      }, 2000)
    }

    const domElement = renderer.domElement
    domElement.style.touchAction = 'none'
    domElement.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    // Pre-compile shaders so first render frame doesn't stall
    renderer.compile(scene, camera)

    // --- 5. Animation Render Loop ---
    const timer = new THREE.Timer()

    const animate = (timestamp?: number) => {
      const state = stateRef.current
      if (!state) return

      if (document.hidden) {
        state.animId = requestAnimationFrame(animate)
        return
      }

      timer.update(timestamp)
      const elapsed = timer.getElapsed()

      // A. Rotation & Inertia
      if (state.autoRotate && !state.isDragging) {
        state.targetRotation.y += 0.0065 // Gentle automatic showcase spin
      } else if (!state.isDragging) {
        // Inertia damping
        state.targetRotation.y += state.rotationVelocity.y
        state.targetRotation.x += state.rotationVelocity.x
        state.targetRotation.x = Math.max(-0.25, Math.min(0.65, state.targetRotation.x))

        state.rotationVelocity.x *= 0.92
        state.rotationVelocity.y *= 0.92
      }

      // Smooth interpolation (spring-like damping)
      state.currentRotation.x += (state.targetRotation.x - state.currentRotation.x) * 0.12
      state.currentRotation.y += (state.targetRotation.y - state.currentRotation.y) * 0.12

      state.cupGroup.rotation.x = state.currentRotation.x
      state.cupGroup.rotation.y = state.currentRotation.y

      // Gentle floating bob
      state.cupGroup.position.y = Math.sin(elapsed * 1.5) * 0.035

      // B. Animate Steam Particles
      if (state.steamParticles && state.steamPositions && state.steamVelocities) {
        const positions = state.steamPositions
        const velocities = state.steamVelocities
        const count = positions.length / 3

        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] += velocities[i * 3 + 1]
          positions[i * 3] += Math.sin(elapsed * 2 + i) * 0.001
          positions[i * 3 + 2] += Math.cos(elapsed * 2 + i) * 0.001

          // Reset particle to cup surface when it floats up too high
          if (positions[i * 3 + 1] > 3.4) {
            const angle = Math.random() * Math.PI * 2
            const rDist = Math.random() * 0.75
            positions[i * 3] = Math.cos(angle) * rDist
            positions[i * 3 + 1] = 1.58
            positions[i * 3 + 2] = Math.sin(angle) * rDist
          }
        }
        state.steamParticles.geometry.attributes.position.needsUpdate = true
      }

      // C. Render
      state.renderer.render(state.scene, state.camera)
      state.animId = requestAnimationFrame(animate)
    }

    stateRef.current.animId = requestAnimationFrame(animate)

    // Resize Observer
    const handleResize = () => {
      if (!container || !stateRef.current) return
      const newWidth = container.clientWidth || 420
      const newHeight = container.clientHeight || 420
      stateRef.current.camera.aspect = newWidth / newHeight
      stateRef.current.camera.updateProjectionMatrix()
      stateRef.current.renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      domElement.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)

      if (stateRef.current?.animId) {
        cancelAnimationFrame(stateRef.current.animId)
      }
      if (stateRef.current?.idleTimer) {
        window.clearTimeout(stateRef.current.idleTimer)
      }
      timer.dispose()
      renderer.dispose()
      if (container.contains(domElement)) {
        container.removeChild(domElement)
      }
    }
  }, [])

  // Morph cup material & liquid texture when drink changes
  useEffect(() => {
    const state = stateRef.current
    if (!state) return

    // Update liquid texture
    if (state.liquidMesh) {
      const newTexture = createLiquidTexture(drinkId)
      ;(state.liquidMesh.material as THREE.MeshStandardMaterial).map = newTexture
      ;(state.liquidMesh.material as THREE.MeshStandardMaterial).needsUpdate = true
    }

    // Toggle ice cubes for cold brew
    if (state.iceGroup) {
      state.iceGroup.visible = drinkId === 'artisan-cold-brew'
    }

    // Update ceramic color theme
    if (state.cupMesh && state.saucerMesh) {
      const cupMat = state.cupMesh.material as THREE.MeshPhysicalMaterial
      const saucerMat = state.saucerMesh.material as THREE.MeshPhysicalMaterial

      if (drinkId === 'kyoto-matcha-fusion') {
        cupMat.color.setHex(0x181c16) // Deep Japanese matte basalt
        saucerMat.color.setHex(0x121610)
      } else if (drinkId === 'artisan-cold-brew') {
        cupMat.color.setHex(0x281910) // Rich dark roast brown
        saucerMat.color.setHex(0x1a0f0a)
      } else {
        cupMat.color.setHex(0x221710) // Signature espresso ceramic
        saucerMat.color.setHex(0x1a120c)
      }
      cupMat.needsUpdate = true
      saucerMat.needsUpdate = true
    }
  }, [drinkId])

  // Reset to default front-facing showcase view
  const handleResetAngle = () => {
    if (stateRef.current) {
      stateRef.current.targetRotation = { x: 0.22, y: -0.65 }
      stateRef.current.rotationVelocity = { x: 0, y: 0 }
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Pure 3D Canvas Viewport - Double Click to Reset Angle */}
      <div
        ref={mountRef}
        onDoubleClick={handleResetAngle}
        title="Klik dan seret untuk putar 360° • Double-klik untuk reset"
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          position: 'relative',
          cursor: isInteracting ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
    </div>
  )
}
