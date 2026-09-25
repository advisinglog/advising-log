import React, { useEffect, useRef, useCallback } from 'react'

interface InteractiveVideoHeroProps {
  className?: string
  totalFrames?: number
}

export const InteractiveVideoHero: React.FC<InteractiveVideoHeroProps> = ({
  className = '',
  totalFrames = 80,
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
    glowX: 50,
    glowY: 50,
    lastUserInteractionTime: 0,
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

      const timeSinceInteraction = Date.now() - p.lastUserInteractionTime

      // Ambient auto-sway on iPad / idle (no user touch in 2.5s)
      if (timeSinceInteraction > 2500) {
        const t = time * 0.0006
        p.targetProgress = 0.5 + Math.sin(t) * 0.35
        p.targetTiltY = Math.sin(t) * 5
        p.targetTiltX = Math.cos(t * 0.7) * 3
        p.glowX = 50 + Math.sin(t) * 25
        p.glowY = 50 + Math.cos(t * 0.8) * 15
      }

      // Spring physics for tilt
      p.currentTiltX += (p.targetTiltX - p.currentTiltX) * 0.08
      p.currentTiltY += (p.targetTiltY - p.currentTiltY) * 0.08

      // Direct DOM update (no React re-render)
      if (parallaxWrapper) {
        parallaxWrapper.style.transform = `scale(1.05) translate3d(${(p.currentTiltY * 1.5).toFixed(1)}px, ${(p.currentTiltX * 1.5).toFixed(1)}px, 0px)`
      }

      // Direct Glow update (no React re-render)
      if (glow) {
        glow.style.background = `radial-gradient(circle 500px at ${p.glowX.toFixed(1)}% ${p.glowY.toFixed(1)}%, rgba(56, 189, 248, 0.6) 0%, transparent 80%)`
      }

      // Smooth progress interpolation
      p.currentProgress += (p.targetProgress - p.currentProgress) * 0.14

      const count = images.length
      if (count > 0 && canvas) {
        const frameIndex = Math.max(
          0,
          Math.min(count - 1, Math.round(p.currentProgress * (count - 1)))
        )

        // Only redraw when frame changes
        if (frameIndex !== p.lastRenderedIndex) {
          const img = images[frameIndex]
          if (img && img.complete && img.naturalWidth > 0) {
            const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              p.lastRenderedIndex = frameIndex
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
