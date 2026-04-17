"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type Point = { x: number; y: number }

type Viewport = {
  x: number
  y: number
  scale: number
}

type UseGraphPanZoomOptions = {
  width: number
  height: number
  minScale?: number
  maxScale?: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number, width: number, height: number): Point {
  const rect = svg.getBoundingClientRect()
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * width
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * height
  return { x, y }
}

export function useGraphPanZoom({ width, height, minScale = 0.55, maxScale = 2.6 }: UseGraphPanZoomOptions) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const groupRef = useRef<SVGGElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const lastPointRef = useRef<Point | null>(null)
  const movedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [zoomPercent, setZoomPercent] = useState(100)

  const applyTransform = useCallback(() => {
    const group = groupRef.current
    if (!group) {
      return
    }

    const { x, y, scale } = viewportRef.current
    group.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`)
    setZoomPercent(Math.round(scale * 100))
  }, [])

  const scheduleApply = useCallback(() => {
    if (frameRef.current !== null) {
      return
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      applyTransform()
    })
  }, [applyTransform])

  const setViewport = useCallback(
    (next: Viewport) => {
      viewportRef.current = {
        x: next.x,
        y: next.y,
        scale: clamp(next.scale, minScale, maxScale),
      }
      scheduleApply()
    },
    [maxScale, minScale, scheduleApply]
  )

  const zoomAtPoint = useCallback(
    (point: Point, nextScale: number) => {
      const current = viewportRef.current
      const clamped = clamp(nextScale, minScale, maxScale)
      const worldX = (point.x - current.x) / current.scale
      const worldY = (point.y - current.y) / current.scale
      setViewport({
        x: point.x - worldX * clamped,
        y: point.y - worldY * clamped,
        scale: clamped,
      })
    },
    [maxScale, minScale, setViewport]
  )

  const zoomIn = useCallback(() => {
    const next = viewportRef.current.scale * 1.12
    zoomAtPoint({ x: width / 2, y: height / 2 }, next)
  }, [height, width, zoomAtPoint])

  const zoomOut = useCallback(() => {
    const next = viewportRef.current.scale / 1.12
    zoomAtPoint({ x: width / 2, y: height / 2 }, next)
  }, [height, width, zoomAtPoint])

  const reset = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 })
  }, [setViewport])

  useEffect(() => {
    applyTransform()
  }, [applyTransform])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const handlers = useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => {
        const svg = svgRef.current
        if (!svg) {
          return
        }

        pointerIdRef.current = event.pointerId
        const point = toSvgPoint(svg, event.clientX, event.clientY, width, height)
        lastPointRef.current = point
        movedRef.current = false
        setIsPanning(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => {
        const svg = svgRef.current
        if (!svg || pointerIdRef.current !== event.pointerId || !lastPointRef.current) {
          return
        }

        const currentPoint = toSvgPoint(svg, event.clientX, event.clientY, width, height)
        const lastPoint = lastPointRef.current
        const dx = currentPoint.x - lastPoint.x
        const dy = currentPoint.y - lastPoint.y

        if (!movedRef.current && Math.abs(dx) + Math.abs(dy) > 0.8) {
          movedRef.current = true
        }

        const viewport = viewportRef.current
        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
          scale: viewport.scale,
        })

        lastPointRef.current = currentPoint
      },
      onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => {
        if (pointerIdRef.current !== event.pointerId) {
          return
        }

        pointerIdRef.current = null
        lastPointRef.current = null
        setIsPanning(false)
        suppressClickRef.current = movedRef.current
        movedRef.current = false
        event.currentTarget.releasePointerCapture(event.pointerId)
      },
      onPointerLeave: () => {
        if (pointerIdRef.current === null) {
          setIsPanning(false)
        }
      },
      onWheel: (event: React.WheelEvent<SVGSVGElement>) => {
        event.preventDefault()

        const svg = svgRef.current
        if (!svg) {
          return
        }

        const zoomPoint = toSvgPoint(svg, event.clientX, event.clientY, width, height)
        const delta = Math.exp(-event.deltaY * 0.0014)
        const nextScale = viewportRef.current.scale * delta
        zoomAtPoint(zoomPoint, nextScale)
      },
      onDoubleClick: () => {
        reset()
      },
    }),
    [height, reset, setViewport, width, zoomAtPoint]
  )

  return {
    svgRef,
    groupRef,
    handlers,
    suppressClickRef,
    zoomPercent,
    isPanning,
    zoomIn,
    zoomOut,
    reset,
  }
}
