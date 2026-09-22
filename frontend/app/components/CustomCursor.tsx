'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface CursorStyle {
  icon: string
  size: number
  glow: string
  ring: string
}

const CURSOR_CONFIG: Record<string, CursorStyle> = {
  home: {
    icon: '♻️',
    size: 28,
    glow: 'rgba(16, 185, 129, 0.6)',
    ring: 'rgba(16, 185, 129, 0.35)',
  },
  hostel: {
    icon: '❤️',
    size: 28,
    glow: 'rgba(8, 127, 140, 0.6)',
    ring: 'rgba(8, 127, 140, 0.35)',
  },
  orphanage: {
    icon: '❤️',
    size: 26,
    glow: 'rgba(245, 184, 46, 0.6)',
    ring: 'rgba(245, 184, 46, 0.35)',
  },
  'animal-farm': {
    icon: '🍃',
    size: 28,
    glow: 'rgba(163, 230, 53, 0.6)',
    ring: 'rgba(163, 230, 53, 0.35)',
  },
  biogas: {
    icon: '🌱',
    size: 26,
    glow: 'rgba(163, 177, 138, 0.6)',
    ring: 'rgba(163, 177, 138, 0.35)',
  },
}

function getCursorConfig(pathname: string | null): CursorStyle {
  if (!pathname || pathname === '/') {
    return CURSOR_CONFIG.home
  }
  if (pathname.startsWith('/hostel')) {
    return CURSOR_CONFIG.hostel
  }
  if (pathname.startsWith('/orphanage')) {
    return CURSOR_CONFIG.orphanage
  }
  if (pathname.startsWith('/animal-farm')) {
    return CURSOR_CONFIG['animal-farm']
  }
  if (pathname.startsWith('/biogas')) {
    return CURSOR_CONFIG.biogas
  }
  return CURSOR_CONFIG.home
}

export default function CustomCursor() {
  const pathname = usePathname()
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [ring, setRing] = useState({ x: -200, y: -200 })
  const [clicked, setClicked] = useState(false)
  const [mounted, setMounted] = useState(false)

  const cfg = getCursorConfig(pathname)

  useEffect(() => {
    setMounted(true)
    let raf: number
    let targetRing = { x: -200, y: -200 }

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
      targetRing = { x: e.clientX, y: e.clientY }
    }
    const onDown = () => setClicked(true)
    const onUp = () => setClicked(false)

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const tick = () => {
      setRing((prev) => ({
        x: lerp(prev.x, targetRing.x, 0.12),
        y: lerp(prev.y, targetRing.y, 0.12),
      }))
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  if (!mounted) return null

  return (
    <>
      {/* Trailing ring */}
      <div
        className="fixed pointer-events-none z-[9998] rounded-full border transition-all duration-150"
        style={{
          left: ring.x,
          top: ring.y,
          width: 48,
          height: 48,
          transform: 'translate(-50%, -50%)',
          borderColor: cfg.ring,
          borderWidth: '1.5px',
          opacity: clicked ? 0.2 : 0.6,
        }}
      />
      {/* Main cursor icon */}
      <div
        className="fixed pointer-events-none z-[9999] select-none"
        style={{
          left: pos.x,
          top: pos.y,
          fontSize: cfg.size,
          transform: `translate(-50%, -50%) scale(${clicked ? 0.75 : 1})`,
          filter: `drop-shadow(0 0 8px ${cfg.glow})`,
          transition: 'transform 0.1s ease, filter 0.3s ease',
        }}
      >
        {cfg.icon}
      </div>
    </>
  )
}
