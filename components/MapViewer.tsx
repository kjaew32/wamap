'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { BlockData, TileData, MapData } from './types'

// ─────────────────────────────────────────────
// 아이소메트릭 상수
// ─────────────────────────────────────────────
const BASE_TILE_W = 64   // 다이아몬드 가로 (픽셀)
const BASE_TILE_H = 32   // 다이아몬드 세로 (픽셀)
const BASE_BLOCK_H = 20  // 블록 측면 높이 (픽셀)

// 타일(그리드) → 화면 픽셀 변환
function tileToScreen(
  tx: number,
  ty: number,
  tileW: number,
  tileH: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  return {
    x: offsetX + (tx - ty) * (tileW / 2),
    y: offsetY + (tx + ty) * (tileH / 2),
  }
}

// ─────────────────────────────────────────────
// 이미지 캐시
// ─────────────────────────────────────────────
const imageCache: Record<string, HTMLImageElement> = {}

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache[src]) return Promise.resolve(imageCache[src])
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache[src] = img
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

// ─────────────────────────────────────────────
// 단일 타일 그리기
// ─────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tile: TileData,
  block: BlockData,
  tileW: number,
  tileH: number,
  blockH: number,
  offsetX: number,
  offsetY: number,
  images: Record<string, HTMLImageElement>
) {
  const { x: sx, y: sy } = tileToScreen(tx, ty, tileW, tileH, offsetX, offsetY)
  const hw = tileW / 2  // half width
  const hh = tileH / 2  // half height

  const color = tile.color || block.color

  // ── 윗면 (다이아몬드) ──
  if (block.image && images[block.image]) {
    // 이미지 블록: 다이아몬드 클리핑 후 이미지 출력
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx,        sy - blockH)
    ctx.lineTo(sx + hw,   sy - blockH + hh)
    ctx.lineTo(sx,        sy - blockH + tileH)
    ctx.lineTo(sx - hw,   sy - blockH + hh)
    ctx.closePath()
    ctx.clip()

    // 이미지를 다이아몬드 bounding box에 맞게
    ctx.drawImage(
      images[block.image],
      sx - hw,
      sy - blockH,
      tileW,
      tileH
    )
    ctx.restore()
  } else {
    // 컬러 블록: 윗면
    const top = hexToRgb(color)
    ctx.fillStyle = rgbToHex(
      Math.min(255, top.r + 40),
      Math.min(255, top.g + 40),
      Math.min(255, top.b + 40)
    )
    ctx.beginPath()
    ctx.moveTo(sx,        sy - blockH)
    ctx.lineTo(sx + hw,   sy - blockH + hh)
    ctx.lineTo(sx,        sy - blockH + tileH)
    ctx.lineTo(sx - hw,   sy - blockH + hh)
    ctx.closePath()
    ctx.fill()
  }

  // ── 왼쪽 측면 ──
  {
    const base = hexToRgb(color)
    ctx.fillStyle = rgbToHex(
      Math.floor(base.r * 0.6),
      Math.floor(base.g * 0.6),
      Math.floor(base.b * 0.6)
    )
    ctx.beginPath()
    ctx.moveTo(sx - hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + hh)          // 아래 중앙
    ctx.lineTo(sx - hw, sy - hh + blockH) // 아래 왼쪽
    ctx.closePath()
    ctx.fill()
  }

  // ── 오른쪽 측면 ──
  {
    const base = hexToRgb(color)
    ctx.fillStyle = rgbToHex(
      Math.floor(base.r * 0.8),
      Math.floor(base.g * 0.8),
      Math.floor(base.b * 0.8)
    )
    ctx.beginPath()
    ctx.moveTo(sx + hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + hh)
    ctx.lineTo(sx + hw, sy - hh + blockH)
    ctx.closePath()
    ctx.fill()
  }

  // ── 윤곽선 ──
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 0.5

  // 윗면 테두리
  ctx.beginPath()
  ctx.moveTo(sx,        sy - blockH)
  ctx.lineTo(sx + hw,   sy - blockH + hh)
  ctx.lineTo(sx,        sy - blockH + tileH)
  ctx.lineTo(sx - hw,   sy - blockH + hh)
  ctx.closePath()
  ctx.stroke()

  // 측면 세로선
  ctx.beginPath()
  ctx.moveTo(sx,      sy - blockH + tileH)
  ctx.lineTo(sx,      sy + hh)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(sx - hw, sy - blockH + hh)
  ctx.lineTo(sx - hw, sy - hh + blockH)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(sx + hw, sy - blockH + hh)
  ctx.lineTo(sx + hw, sy - hh + blockH)
  ctx.stroke()
}

// ─────────────────────────────────────────────
// 색상 유틸
// ─────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16) || 0,
    g: parseInt(clean.substring(2, 4), 16) || 0,
    b: parseInt(clean.substring(4, 6), 16) || 0,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function MapViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({})
  const animRef = useRef<number>()

  // 이미지 프리로드
  useEffect(() => {
    if (!mapData) return
    const urls = mapData.blocks
      .filter((b) => b.image)
      .map((b) => b.image!) 

    Promise.all(urls.map((url) => loadImage(url))).then(() => {
      const loaded: Record<string, HTMLImageElement> = {}
      urls.forEach((url) => { loaded[url] = imageCache[url] })
      setImages(loaded)
    })
  }, [mapData])

  // 캔버스 렌더
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mapData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // 배경
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, W, H)

    const tileW = BASE_TILE_W * zoom
    const tileH = BASE_TILE_H * zoom
    const blockH = BASE_BLOCK_H * zoom

    // 맵 중앙 정렬 오프셋
    const mapCenterX = (mapData.gridWidth - mapData.gridHeight) * (tileW / 2) / 2 + W / 2
    const mapCenterY = (mapData.gridWidth + mapData.gridHeight) * (tileH / 2) / 2 * 0.15 + H / 2 - blockH

    const offsetX = mapCenterX + pan.x
    const offsetY = mapCenterY + pan.y - (mapData.gridWidth + mapData.gridHeight) * tileH / 4

    // painter's algorithm: y+x 오름차순으로 그려야 앞 타일이 뒤를 가림
    const tiles: { tx: number; ty: number; tile: TileData; block: BlockData }[] = []

    mapData.map.forEach((row, ty) => {
      row.forEach((tile, tx) => {
        if (tile && mapData.blocks[tile.blockIndex]) {
          tiles.push({ tx, ty, tile, block: mapData.blocks[tile.blockIndex] })
        }
      })
    })

    // 정렬
    tiles.sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty))

    tiles.forEach(({ tx, ty, tile, block }) => {
      drawTile(ctx, tx, ty, tile, block, tileW, tileH, blockH, offsetX, offsetY, images)
    })
  }, [mapData, zoom, pan, images])

  useEffect(() => {
    render()
  }, [render])

  // 캔버스 리사이즈
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      render()
    })
    observer.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => observer.disconnect()
  }, [render])

  // 마우스 패닝
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY }
    panOrigin.current = { ...pan }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: panOrigin.current.x + e.clientX - panStart.current.x,
      y: panOrigin.current.y + e.clientY - panStart.current.y,
    })
  }
  const handleMouseUp = () => setIsPanning(false)

  // 터치 패닝
  const touchStart = useRef({ x: 0, y: 0 })
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    panOrigin.current = { ...pan }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    setPan({
      x: panOrigin.current.x + e.touches[0].clientX - touchStart.current.x,
      y: panOrigin.current.y + e.touches[0].clientY - touchStart.current.y,
    })
  }

  // 휠 줌
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.min(4, Math.max(0.2, z - e.deltaY * 0.001)))
  }

  // 맵 로드
  const handleLoadMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data: MapData = JSON.parse(ev.target?.result as string)
        setMapData(data)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      } catch (err) {
        alert('Failed to load map: ' + (err as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const tileCount = mapData
    ? mapData.map.flat().filter(Boolean).length
    : 0

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden select-none">

      {/* ── 상단 바 ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-slate-700/50 z-10">
        <Link
          href="/"
          className="text-slate-400 hover:text-white transition-colors text-sm"
        >
          ← Editor
        </Link>
        <span className="text-slate-600">|</span>
        <h1 className="text-yellow-400 font-bold text-base">🗺️ Map Viewer</h1>

        <div className="flex items-center gap-2 ml-auto">
          {mapData && (
            <span className="text-xs text-slate-400 font-mono">
              {mapData.gridWidth}×{mapData.gridHeight} &nbsp;·&nbsp; {tileCount} tiles
            </span>
          )}

          {/* 줌 버튼 */}
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
            className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
            title="Zoom In"
          >+</button>
          <span className="text-xs text-slate-400 font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
            className="w-7 h-7 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
            title="Zoom Out"
          >−</button>

          <button
            onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1) }}
            className="px-2 h-7 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
            title="Reset View"
          >Reset</button>

          <label className="px-3 h-7 flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium cursor-pointer transition-colors">
            📂 Load
            <input type="file" accept=".json" onChange={handleLoadMap} className="hidden" />
          </label>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: isPanning ? 'grabbing' : 'grab', imageRendering: 'pixelated' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => {}}
        />

        {/* 맵 없을 때 안내 */}
        {!mapData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-5xl mb-4 opacity-30">🗺️</div>
            <p className="text-slate-500 text-sm">Load a map JSON to preview</p>
          </div>
        )}

        {/* 미니맵 */}
        {mapData && (
          <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-2 shadow-xl">
            <p className="text-xs text-slate-500 mb-1">Minimap</p>
            <svg
              viewBox={`0 0 ${mapData.gridWidth} ${mapData.gridHeight}`}
              width={120}
              height={120}
              className="block rounded"
              style={{ background: '#0a0a0e' }}
            >
              {mapData.map.map((row, y) =>
                row.map((tile, x) => {
                  if (!tile || !mapData.blocks[tile.blockIndex]) return null
                  const block = mapData.blocks[tile.blockIndex]
                  return (
                    <rect
                      key={`${x}-${y}`}
                      x={x} y={y} width={1} height={1}
                      fill={tile.color || block.color}
                    />
                  )
                })
              )}
            </svg>
          </div>
        )}

        {/* 조작 힌트 */}
        <div className="absolute bottom-4 left-4 text-xs text-slate-600 space-y-0.5 pointer-events-none">
          <p>드래그: 이동 &nbsp;·&nbsp; 스크롤: 줌</p>
        </div>
      </div>
    </div>
  )
}