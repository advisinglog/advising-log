import React, { useEffect, useRef, useCallback } from 'react'

interface InteractiveVideoHeroProps {
  className?: string
  totalFrames?: number
}

export const InteractiveVideoHero: React.FC<InteractiveVideoHeroProps> = ({
  className = '',
  totalFrames = 81,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const parallaxWrapperRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])

  // Physics & interaction state
  const physicsRef = useRef({
    currentTiltX: 0,
    currentTiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    currentProgress: 0.5,
    targetProgress: 0.5,
    lastRenderedIndex: -1,
    lastRenderedProgress: -1,
    glowX: 50,
    glowY: 50,
    lastUserInteractionTime: 0,
    lastTime: 0,
  })

  // Preload and asynchronously decode all 80 frames for zero-hitch iPad rendering
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = []

    for (let i = 0; i < totalFrames; i++) {
      const img = new Image()
      const frameNum = String(i).padStart(3, '0')
      img.src = `/hero-frames/frame_${frameNum}.jpg`
      // Asynchronously decode image into GPU texture to avoid main-thread decode stutter on iOS/iPadOS
      if (img.decode) {
        img.decode().catch(() => {})
      }
      loadedImages.push(img)
    }

    imagesRef.current = loadedImages

    // Draw initial center frame once ready
    const centerIndex = Math.floor(totalFrames / 2)
    const centerImg = loadedImages[centerIndex] || loadedImages[0]
    centerImg.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        canvas.width = centerImg.naturalWidth || 960
        canvas.height = centerImg.naturalHeight || 540
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
        if (ctx) {
          ctx.drawImage(centerImg, 0, 0, canvas.width, canvas.height)
        }
      }
    }
  }, [totalFrames])

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const p = physicsRef.current
    p.lastUserInteractionTime = Date.now()

    const normX = (e.clientX / window.innerWidth) * 2 - 1
    const normY = (e.clientY / window.innerHeight) * 2 - 1

    p.targetTiltY = normX * 8
    p.targetTiltX = -normY * 6

    p.glowX = (e.clientX / window.innerWidth) * 100
    p.glowY = (e.clientY / window.innerHeight) * 100

    p.targetProgress = Math.max(0, Math.min(1, e.clientX / window.innerWidth))
  }, [])

  // Touch move handler optimized for iPad / touchscreens
  const handleTouch = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      const p = physicsRef.current
      p.lastUserInteractionTime = Date.now()

      const normX = (touch.clientX / window.innerWidth) * 2 - 1
      const normY = (touch.clientY / window.innerHeight) * 2 - 1

      p.targetTiltY = normX * 8
      p.targetTiltX = -normY * 6
      p.glowX = (touch.clientX / window.innerWidth) * 100
      p.glowY = (touch.clientY / window.innerHeight) * 100
      p.targetProgress = Math.max(0, Math.min(1, touch.clientX / window.innerWidth))
    }
  }, [])

  // 120 FPS continuous render loop optimized for iPadOS & desktop
  useEffect(() => {
    let animFrame: number

    const renderLoop = (time: number) => {
      const p = physicsRef.current
      const images = imagesRef.current
      const canvas = canvasRef.current
      const parallaxWrapper = parallaxWrapperRef.current
      const glow = glowRef.current

      if (!p.lastTime) p.lastTime = time
      const dt = Math.min(32, Math.max(1, time - p.lastTime))
      p.lastTime = time
      const deltaRatio = dt / 16.667

      const timeSinceInteraction = Date.now() - p.lastUserInteractionTime

      // Ambient auto-sway on iPad / idle (no user touch in 1.5s)
      if (timeSinceInteraction > 1500) {
        // Continuous cinematic playback using smoothed triangle wave
        // to maintain constant frame cadence without slow-mo dead-zones at the turnarounds
        const t = time * 0.0013
        const smoothedWave = (2 / Math.PI) * Math.asin(Math.sin(t) * 0.94)
        const idleTargetProgress = 0.5 + smoothedWave * 0.35

        // Smooth 1-second blend from user's last resting position into the ambient flow
        const idleBlend = Math.min(1, (timeSinceInteraction - 1500) / 1000)
        p.targetProgress = p.targetProgress * (1 - idleBlend) + idleTargetProgress * idleBlend

        p.targetTiltY = Math.sin(t) * 5
        p.targetTiltX = Math.cos(t * 0.7) * 3
        p.glowX = 50 + Math.sin(t) * 25
        p.glowY = 50 + Math.cos(t * 0.8) * 15
      }

      // Spring physics for tilt (FPS-independent)
      const tiltLerp = Math.min(1, 0.08 * deltaRatio)
      p.currentTiltX += (p.targetTiltX - p.currentTiltX) * tiltLerp
      p.currentTiltY += (p.targetTiltY - p.currentTiltY) * tiltLerp

      // Direct DOM update with full subpixel precision (no React re-render)
      if (parallaxWrapper) {
        parallaxWrapper.style.transform = `scale(1.05) translate3d(${p.currentTiltY * 1.5}px, ${p.currentTiltX * 1.5}px, 0px)`
      }

      // Direct Glow update (no React re-render)
      if (glow) {
        glow.style.background = `radial-gradient(circle 500px at ${p.glowX}% ${p.glowY}%, rgba(56, 189, 248, 0.6) 0%, transparent 80%)`
      }

      // Smooth progress interpolation (FPS-independent)
      const baseLerp = timeSinceInteraction > 1800 ? 0.20 : 0.14
      const progressLerp = Math.min(1, baseLerp * deltaRatio)
      p.currentProgress += (p.targetProgress - p.currentProgress) * progressLerp

      const count = images.length
      if (count > 0 && canvas) {
        // Redraw whenever fractional progress changes by a noticeable subpixel amount
        if (Math.abs(p.currentProgress - p.lastRenderedProgress) > 0.0008) {
          const rawFrame = p.currentProgress * (count - 1)
          const frameIndexA = Math.max(0, Math.min(count - 1, Math.floor(rawFrame)))
          const frameIndexB = Math.max(0, Math.min(count - 1, Math.ceil(rawFrame)))
          const fraction = rawFrame - frameIndexA

          const imgA = images[frameIndexA]
          const imgB = images[frameIndexB]

          if (imgA && imgA.complete && imgA.naturalWidth > 0) {
            const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
            if (ctx) {
              ctx.globalAlpha = 1
              ctx.drawImage(imgA, 0, 0, canvas.width, canvas.height)

              // Hermite smoothstep curve: 3x^2 - 2x^3 (smooth derivatives at 0 and 1, prevents brightness dip)
              const smoothFraction = fraction * fraction * (3 - 2 * fraction)
              if (frameIndexA !== frameIndexB && smoothFraction > 0.01 && imgB && imgB.complete && imgB.naturalWidth > 0) {
                ctx.globalAlpha = smoothFraction
                ctx.drawImage(imgB, 0, 0, canvas.width, canvas.height)
              }
              p.lastRenderedProgress = p.currentProgress
            }
          }
        }
      }

      animFrame = requestAnimationFrame(renderLoop)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove', handleTouch, { passive: true })
    animFrame = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouch)
      window.removeEventListener('touchmove', handleTouch)
      cancelAnimationFrame(animFrame)
    }
  }, [handleMouseMove, handleTouch])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* Full-bleed Canvas with Hardware Accelerated 3D Parallax */}
      <div
        ref={parallaxWrapperRef}
        className="absolute inset-0 w-full h-full will-change-transform"
        style={{ transform: 'scale(1.05) translate3d(0px, 0px, 0px)' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover object-center will-change-contents"
        />
      </div>

      {/* Atmospheric Lighting Overlays (Zero CSS Filter overhead for iPad GPU) */}
      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/95 via-sky-950/20 to-sky-950/50 dark:from-[#040a18]/95 dark:via-[#040a18]/25 dark:to-[#040a18]/60 pointer-events-none" />
      <div className="absolute inset-0 bg-sky-600/10 mix-blend-color pointer-events-none" />

      {/* Dynamic Cursor Spotlight */}
      <div
        ref={glowRef}
        className="absolute inset-0 opacity-45 mix-blend-overlay will-change-transform pointer-events-none"
      />
    </div>
  )
}

export default InteractiveVideoHero
