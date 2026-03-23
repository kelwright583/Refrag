'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw, Check } from 'lucide-react'

export interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClear: () => void
  width?: number
  height?: number
  label?: string
}

const PLACEHOLDER_TEXT = 'Sign here'
const STROKE_COLOR = '#1c1917'
const STROKE_WIDTH = 2

export function SignaturePad({
  onSave,
  onClear,
  width = 480,
  height = 200,
  label,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // Draw placeholder text
  function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#d4cfc7'
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(PLACEHOLDER_TEXT, w / 2, h / 2)
  }

  // Initialise canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle HiDPI screens
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    drawPlaceholder(ctx, width, height)
  }, [width, height])

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear placeholder on first stroke
    if (isEmpty) {
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      setIsEmpty(false)
    }

    isDrawing.current = true
    const pt = getCanvasPoint(e)
    lastPoint.current = pt

    // Draw a dot for tap/click
    ctx.fillStyle = STROKE_COLOR
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, STROKE_WIDTH / 2, 0, Math.PI * 2)
    ctx.fill()
  }, [isEmpty, width, height])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pt = getCanvasPoint(e)
    const prev = lastPoint.current
    if (!prev) {
      lastPoint.current = pt
      return
    }

    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = STROKE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()

    lastPoint.current = pt
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    isDrawing.current = false
    lastPoint.current = null
  }, [])

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawPlaceholder(ctx, width, height)
    setIsEmpty(true)
    onClear()
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <p className="text-xs font-medium text-charcoal/70 uppercase tracking-wide">{label}</p>
      )}

      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        className="border border-[#D4CFC7] rounded-lg bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-lg border border-[#D4CFC7] bg-white px-3 py-1.5 text-sm font-medium text-charcoal/70 hover:text-charcoal hover:bg-[#f9f7f4] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Clear
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex items-center gap-1.5 rounded-lg bg-[#1c1917] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#292524] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="w-3.5 h-3.5" />
          Save Signature
        </button>
      </div>
    </div>
  )
}
