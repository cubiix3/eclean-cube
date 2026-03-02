import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const PARTICLE_COUNT = 25
    const CONNECTION_DISTANCE = 150
    const PARALLAX_STRENGTH = 0.02
    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS

    let lastFrameTime = 0

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function createParticles() {
      if (!canvas) return
      particlesRef.current = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4, // -0.2 to 0.2
          vy: (Math.random() - 0.5) * 0.4,
          radius: 1 + Math.random() * 2,
          opacity: 0.03 + Math.random() * 0.05, // 0.03 to 0.08
        })
      }
    }

    function animate(timestamp: number) {
      if (!canvas || !ctx) return

      animFrameRef.current = requestAnimationFrame(animate)

      // Skip rendering when tab is hidden
      if (document.hidden) return

      // Throttle to target FPS
      const elapsed = timestamp - lastFrameTime
      if (elapsed < FRAME_INTERVAL) return
      lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      const mouse = mouseRef.current
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const parallaxX = (mouse.x - centerX) * PARALLAX_STRENGTH
      const parallaxY = (mouse.y - centerY) * PARALLAX_STRENGTH

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Move
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < -10) p.x = canvas.width + 10
        if (p.x > canvas.width + 10) p.x = -10
        if (p.y < -10) p.y = canvas.height + 10
        if (p.y > canvas.height + 10) p.y = -10

        // Draw with parallax offset
        const drawX = p.x - parallaxX * (p.radius / 3)
        const drawY = p.y - parallaxY * (p.radius / 3)

        ctx.beginPath()
        ctx.arc(drawX, drawY, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.fill()

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < CONNECTION_DISTANCE) {
            const lineOpacity = 0.02 * (1 - dist / CONNECTION_DISTANCE)
            const drawX2 = p2.x - parallaxX * (p2.radius / 3)
            const drawY2 = p2.y - parallaxY * (p2.radius / 3)

            ctx.beginPath()
            ctx.moveTo(drawX, drawY)
            ctx.lineTo(drawX2, drawY2)
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        // Reset lastFrameTime so we don't get a huge delta on resume
        lastFrameTime = performance.now()
      }
    }

    resize()
    createParticles()
    animFrameRef.current = requestAnimationFrame(animate)

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
