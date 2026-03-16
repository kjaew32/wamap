'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { BlockData, UnitData, TileData, MapData } from './types'

// ─────────────────────────────────────────────
// 아이소메트릭 상수 (MapViewer와 동일)
// ─────────────────────────────────────────────
const BASE_TILE_W = 64
const BASE_TILE_H = 32
const BASE_BLOCK_H = 20

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

function screenToTile(
  sx: number,
  sy: number,
  tileW: number,
  tileH: number,
  offsetX: number,
  offsetY: number
): { tx: number; ty: number } {
  const rx = sx - offsetX
  const ry = sy - offsetY
  const tx = (rx / (tileW / 2) + ry / (tileH / 2)) / 2
  const ty = (ry / (tileH / 2) - rx / (tileW / 2)) / 2
  return { tx: Math.floor(tx), ty: Math.floor(ty) }
}

// ─────────────────────────────────────────────
// 이미지 캐시
// ─────────────────────────────────────────────
const imageCache: Record<string, HTMLImageElement> = {}

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache[src]) return Promise.resolve(imageCache[src])
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { imageCache[src] = img; resolve(img) }
    img.onerror = reject
    img.src = src
  })
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
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────
// 단일 타일 그리기
// [FIX 1] 마지막 인자: unitImages Map → unitImg 단일 이미지로 단순화
// [FIX 2] 컬러 블록 else 블록에 측면 추가
// [FIX 3] sy = syRaw + blockH/2 로 전체 위치 조정
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
  images: Record<string, HTMLImageElement>,
  hovered: boolean = false,
  unitImg?: HTMLImageElement  // [FIX 1]
) {
  const { x: sx, y: sy } = tileToScreen(tx, ty, tileW, tileH, offsetX, offsetY)
  const hw = tileW / 2
  const hh = tileH / 2

  const color = tile.color || block.color
  const base = hexToRgb(color)

  const hlR = hovered ? 60 : 40
  const hlG = hovered ? 60 : 40
  const hlB = hovered ? 60 : 40

  if (block.image && images[block.image]) {
    // ── 이미지 블록: 윗면 ──
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx,       sy - blockH)
    ctx.lineTo(sx + hw,  sy - blockH + hh)
    ctx.lineTo(sx,       sy - blockH + tileH)
    ctx.lineTo(sx - hw,  sy - blockH + hh)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(images[block.image], sx - hw, sy - blockH, tileW, tileH)
    if (hovered) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill() }
    ctx.restore()

    // ── 이미지 블록: 왼쪽 측면 ──
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx - hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + tileH)
    ctx.lineTo(sx - hw, sy + hh)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(images[block.image], sx - hw, sy - blockH, tileW, tileH + blockH)
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fill()
    ctx.restore()

    // ── 이미지 블록: 오른쪽 측면 ──
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(sx + hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + tileH)
    ctx.lineTo(sx + hw, sy + hh)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(images[block.image], sx - hw, sy - blockH, tileW, tileH + blockH)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fill()
    ctx.restore()

  } else {
    // ── 컬러 블록: 윗면 ──
    ctx.fillStyle = rgbToHex(base.r + hlR, base.g + hlG, base.b + hlB)
    ctx.beginPath()
    ctx.moveTo(sx,       sy - blockH)
    ctx.lineTo(sx + hw,  sy - blockH + hh)
    ctx.lineTo(sx,       sy - blockH + tileH)
    ctx.lineTo(sx - hw,  sy - blockH + hh)
    ctx.closePath()
    ctx.fill()

    // ── 컬러 블록: 왼쪽 측면 [FIX 2] ──
    ctx.fillStyle = rgbToHex(
      Math.floor(base.r * (hovered ? 0.7 : 0.6)),
      Math.floor(base.g * (hovered ? 0.7 : 0.6)),
      Math.floor(base.b * (hovered ? 0.7 : 0.6))
    )
    ctx.beginPath()
    ctx.moveTo(sx - hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + tileH)
    ctx.lineTo(sx - hw, sy + hh)
    ctx.closePath()
    ctx.fill()

    // ── 컬러 블록: 오른쪽 측면 [FIX 2] ──
    ctx.fillStyle = rgbToHex(
      Math.floor(base.r * (hovered ? 0.9 : 0.8)),
      Math.floor(base.g * (hovered ? 0.9 : 0.8)),
      Math.floor(base.b * (hovered ? 0.9 : 0.8))
    )
    ctx.beginPath()
    ctx.moveTo(sx + hw, sy - blockH + hh)
    ctx.lineTo(sx,      sy - blockH + tileH)
    ctx.lineTo(sx,      sy + tileH)
    ctx.lineTo(sx + hw, sy + hh)
    ctx.closePath()
    ctx.fill()
  }

  // ── 윤곽선 ──
  ctx.strokeStyle = hovered ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0,0,0,0.25)'
  ctx.lineWidth = hovered ? 1 : 0.5

  ctx.beginPath()
  ctx.moveTo(sx,       sy - blockH)
  ctx.lineTo(sx + hw,  sy - blockH + hh)
  ctx.lineTo(sx,       sy - blockH + tileH)
  ctx.lineTo(sx - hw,  sy - blockH + hh)
  ctx.closePath()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(sx, sy - blockH + tileH)
  ctx.lineTo(sx, sy + hh)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sx - hw, sy - blockH + tileH)
  ctx.lineTo(sx - hw, sy + hh)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sx + hw, sy - blockH + tileH)
  ctx.lineTo(sx + hw, sy + hh)
  ctx.stroke()

  // ── 유닛 이미지 [FIX 1] ──
  if (tile.unitId && unitImg) {
    const uW = tileW * 0.8
    const uH = tileH * 2
    ctx.drawImage(unitImg, sx - uW / 2, sy - blockH - uH + hh + tileH, uW, uH)
  } else if (tile.unitId) {
    // 이미지 없을 때 플레이스홀더
    ctx.save()
    ctx.fillStyle = 'rgba(0,255,128,0.7)'
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(sx, sy - blockH - 4, 5 * (tileW / BASE_TILE_W), 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}

// 빈 그리드 셀 아웃라인 그리기
function drawEmptyTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  tileW: number,
  tileH: number,
  blockH: number,
  offsetX: number,
  offsetY: number,
  isHovered: boolean,
  previewBlock?: { block: BlockData; color: string; images: Record<string, HTMLImageElement> }
) {
  const { x: sx, y: sy } = tileToScreen(tx, ty, tileW, tileH, offsetX, offsetY)
  const hw = tileW / 2
  const hh = tileH / 2

  if (isHovered && previewBlock) {
    const { block, color, images } = previewBlock
    const fakeTile: TileData = { blockIndex: 0, rotation: 0, color }
    ctx.save()
    ctx.globalAlpha = 0.55
    drawTile(ctx, tx, ty, fakeTile, block, tileW, tileH, blockH, offsetX, offsetY, images, false)
    ctx.restore()
    return
  }

  ctx.strokeStyle = isHovered ? 'rgba(255,255,100,0.5)' : 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(sx,       sy)
  ctx.lineTo(sx + hw,  sy + hh)
  ctx.lineTo(sx,       sy + tileH)
  ctx.lineTo(sx - hw,  sy + hh)
  ctx.closePath()
  ctx.stroke()
}

// ─────────────────────────────────────────────
// 메인 에디터
// ─────────────────────────────────────────────
export default function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [gridWidth, setGridWidth] = useState(20)
  const [gridHeight, setGridHeight] = useState(20)
  const [map, setMap] = useState<(TileData | null)[][]>(
    Array.from({ length: 20 }, () => Array(20).fill(null))
  )

  const [blocks, setBlocks] = useState<BlockData[]>([
    { id: 'default', name: 'Block', color: '#8B4513' },
  ])
  const [units, setUnits] = useState<UnitData[]>([])
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [currentBlockColor, setCurrentBlockColor] = useState('#8B4513')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [unitRotation, setUnitRotation] = useState(0)

  const [editMode, setEditMode] = useState<'place' | 'erase' | 'unit' | 'unitErase'>('place')
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastProcessedTile = useRef<{ x: number; y: number } | null>(null)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })

  const [images, setImages] = useState<Record<string, HTMLImageElement>>({})
  // [FIX 1] setter 추가 — 이전엔 setter 없이 빈 객체로 고정되어 유닛 이미지가 절대 로드 안 됐음
  const [unitImages, setUnitImages] = useState<Record<string, HTMLImageElement>>({})

  // ── API 로드 ──
  useEffect(() => {
    fetch('/api/blocks').then(r => r.ok ? r.json() : []).then((loaded: BlockData[]) => {
      if (loaded.length > 0) setBlocks([{ id: 'default', name: 'Block', color: '#8B4513' }, ...loaded])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/units').then(r => r.ok ? r.json() : []).then((loaded: UnitData[]) => {
      setUnits(loaded)
      if (loaded.length > 0) setSelectedUnitId(loaded[0].id)
    }).catch(() => {})
  }, [])

  // ── 블록 이미지 프리로드 ──
  useEffect(() => {
    const urls = blocks.filter(b => b.image).map(b => b.image!)
    if (urls.length === 0) return
    Promise.all(urls.map(url => loadImage(url))).then(() => {
      const loaded: Record<string, HTMLImageElement> = {}
      urls.forEach(url => { if (imageCache[url]) loaded[url] = imageCache[url] })
      setImages(loaded)
    })
  }, [blocks])

  // ── 유닛 이미지 프리로드 [FIX 1] ──
  useEffect(() => {
    const allUrls: string[] = []
    units.forEach(unit => {
      if (unit.images) {
        Object.values(unit.images).forEach(url => allUrls.push(url))
      }
    })
    if (allUrls.length === 0) return
    Promise.all(allUrls.map(url => loadImage(url))).then(() => {
      const loaded: Record<string, HTMLImageElement> = {}
      allUrls.forEach(url => { if (imageCache[url]) loaded[url] = imageCache[url] })
      setUnitImages(loaded)
    })
  }, [units])

  // ── 오프셋 계산 ──
  const getOffset = useCallback((canvas: HTMLCanvasElement) => {
    const W = canvas.width
    const H = canvas.height
    const tileW = BASE_TILE_W * zoom
    const tileH = BASE_TILE_H * zoom
    const blockH = BASE_BLOCK_H * zoom
    const mapCenterX = (gridWidth - gridHeight) * (tileW / 2) / 2 + W / 2
    const mapCenterY = (gridWidth + gridHeight) * (tileH / 2) / 2 * 0.15 + H / 2 - blockH
    const offsetX = mapCenterX + pan.x
    const offsetY = mapCenterY + pan.y - (gridWidth + gridHeight) * tileH / 4
    return { offsetX, offsetY, tileW, tileH, blockH }
  }, [zoom, pan, gridWidth, gridHeight])

  // ── 렌더링 ──
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, W, H)

    const { offsetX, offsetY, tileW, tileH, blockH } = getOffset(canvas)

    const isPlaceMode = editMode === 'place'
    const isUnitPlaceMode = editMode === 'unit'

    // 빈 셀 그리드
    for (let ty = 0; ty < gridHeight; ty++) {
      for (let tx = 0; tx < gridWidth; tx++) {
        if (!map[ty]?.[tx]) {
          const isHov = hoveredTile?.x === tx && hoveredTile?.y === ty
          const preview = isHov && isPlaceMode ? {
            block: blocks[selectedBlockIndex] || blocks[0],
            color: currentBlockColor,
            images,
          } : undefined
          drawEmptyTile(ctx, tx, ty, tileW, tileH, blockH, offsetX, offsetY, isHov, preview)
        }
      }
    }

    // 배치된 타일 (painter's algorithm)
    const tiles: { tx: number; ty: number; tile: TileData; block: BlockData }[] = []
    map.forEach((row, ty) => {
      row.forEach((tile, tx) => {
        if (tile && blocks[tile.blockIndex]) {
          tiles.push({ tx, ty, tile, block: blocks[tile.blockIndex] })
        }
      })
    })
    tiles.sort((a, b) => (a.tx + a.ty) - (b.tx + b.ty))

    tiles.forEach(({ tx, ty, tile, block }) => {
      const isHov = hoveredTile?.x === tx && hoveredTile?.y === ty

      // [FIX 1] units 배열에서 rotation에 맞는 url을 꺼내 이미지 resolve
      let unitImg: HTMLImageElement | undefined
      if (tile.unitId) {
        const unit = units.find(u => u.id === tile.unitId)
        const url = unit?.images?.[tile.unitRotation ?? 0] ?? unit?.images?.[0]
        if (url && unitImages[url]) unitImg = unitImages[url]
      }

      drawTile(ctx, tx, ty, tile, block, tileW, tileH, blockH, offsetX, offsetY, images, isHov, unitImg)
    })

    // 유닛 모드 호버 미리보기
    if (hoveredTile && isUnitPlaceMode) {
      const { x: tx, y: ty } = hoveredTile
      if (map[ty]?.[tx]) {
        const { x: sx, y: sy } = tileToScreen(tx, ty, tileW, tileH, offsetX, offsetY)
        ctx.save()
        ctx.fillStyle = 'rgba(0,255,128,0.4)'
        ctx.strokeStyle = 'rgba(0,255,128,0.9)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(sx, sy - blockH - 4, 6 * zoom, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
    }
  }, [map, blocks, units, images, unitImages, zoom, pan, hoveredTile, gridWidth, gridHeight, editMode, selectedBlockIndex, currentBlockColor, getOffset])

  useEffect(() => { render() }, [render])

  // ── 리사이즈 ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      render()
    })
    obs.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => obs.disconnect()
  }, [render])

  // ── 타일 처리 ──
  const processTile = useCallback((tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= gridWidth || ty >= gridHeight) return
    if (lastProcessedTile.current?.x === tx && lastProcessedTile.current?.y === ty) return
    lastProcessedTile.current = { x: tx, y: ty }

    setMap(prev => {
      const next = prev.map(row => [...row])
      if (editMode === 'place') {
        next[ty][tx] = {
          blockIndex: selectedBlockIndex,
          rotation: currentRotation,
          color: currentBlockColor,
          unitId: null,
          unitRotation: 0,
        }
      } else if (editMode === 'erase') {
        next[ty][tx] = null
      } else if (editMode === 'unit') {
        if (next[ty][tx] && selectedUnitId) {
          next[ty][tx] = { ...next[ty][tx]!, unitId: selectedUnitId, unitRotation: unitRotation }
        }
      } else if (editMode === 'unitErase') {
        if (next[ty][tx]) {
          next[ty][tx] = { ...next[ty][tx]!, unitId: null, unitRotation: 0 }
        }
      }
      return next
    })
  }, [editMode, selectedBlockIndex, currentRotation, currentBlockColor, selectedUnitId, unitRotation, gridWidth, gridHeight])

  // ── 마우스 이벤트 ──
  const getTileFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const sx = (e.clientX - rect.left) * (canvas.width / rect.width)
    const sy = (e.clientY - rect.top) * (canvas.height / rect.height)
    const { offsetX, offsetY, tileW, tileH } = getOffset(canvas)
    return screenToTile(sx, sy, tileW, tileH, offsetX, offsetY)
  }, [getOffset])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { ...pan }
      return
    }
    if (e.button === 0) {
      setIsDrawing(true)
      lastProcessedTile.current = null
      const t = getTileFromEvent(e)
      if (t) processTile(t.tx, t.ty)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: panOrigin.current.x + e.clientX - panStart.current.x,
        y: panOrigin.current.y + e.clientY - panStart.current.y,
      })
      return
    }
    const t = getTileFromEvent(e)
    if (t) {
      if (t.tx >= 0 && t.ty >= 0 && t.tx < gridWidth && t.ty < gridHeight) {
        setHoveredTile({ x: t.tx, y: t.ty })
      } else {
        setHoveredTile(null)
      }
      if (isDrawing) processTile(t.tx, t.ty)
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setIsDrawing(false)
    lastProcessedTile.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.min(4, Math.max(0.2, z - e.deltaY * 0.001)))
  }

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault()

  const touchStartRef = useRef({ x: 0, y: 0 })
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    panOrigin.current = { ...pan }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    setPan({
      x: panOrigin.current.x + e.touches[0].clientX - touchStartRef.current.x,
      y: panOrigin.current.y + e.touches[0].clientY - touchStartRef.current.y,
    })
  }

  // ── 맵 저장/불러오기 ──
  const handleSaveMap = () => {
    const data: MapData = { version: '1.1', gridWidth, gridHeight, blocks, units, map }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `map_${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data: MapData = JSON.parse(ev.target?.result as string)
        setGridWidth(data.gridWidth)
        setGridHeight(data.gridHeight)
        setBlocks(data.blocks)
        if (data.units) setUnits(data.units)
        setMap(data.map)
        setPan({ x: 0, y: 0 })
        setZoom(1)
      } catch (err) { alert('Failed to load map: ' + (err as Error).message) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearMap = () => {
    if (confirm('Clear entire map?')) {
      setMap(Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null)))
    }
  }

  const handleResizeGrid = () => {
    if (confirm('Resize will clear the map. Continue?')) {
      setMap(Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null)))
    }
  }

  const updateDefaultBlockColor = (color: string) => {
    setBlocks(prev => { const n = [...prev]; n[0] = { ...n[0], color }; return n })
    setCurrentBlockColor(color)
  }

  const isUnitMode = editMode === 'unit' || editMode === 'unitErase'
  const tileCount = map.flat().filter(Boolean).length

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden select-none">

      {/* ── 상단 툴바 ── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur border-b border-slate-700/50 z-10 shadow-lg">
        <h2 className="text-base font-bold text-yellow-400">🗺️ Map Editor</h2>

        <div className="flex items-center gap-1">
          <button onClick={handleSaveMap} className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors" title="Save Map">💾</button>
          <label className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors" title="Load Map">
            📂<input type="file" accept=".json" onChange={handleLoadMap} className="hidden" />
          </label>
        </div>

        <div className="w-px h-5 bg-slate-600" />

        <div className="flex items-center gap-1">
          <span className="text-xs text-blue-300">Grid:</span>
          <input type="number" value={gridWidth}
            onChange={e => setGridWidth(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
            className="w-12 px-1 py-0.5 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none text-xs"
          />
          <span className="text-slate-400 text-xs">×</span>
          <input type="number" value={gridHeight}
            onChange={e => setGridHeight(Math.max(5, Math.min(50, parseInt(e.target.value) || 10)))}
            className="w-12 px-1 py-0.5 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none text-xs"
          />
          <button onClick={handleResizeGrid} className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors">Resize</button>
        </div>

        <div className="w-px h-5 bg-slate-600" />

        <div className="flex items-center gap-1">
          {([
            ['place', '✏️', 'Place Block', 'bg-purple-600'],
            ['erase', '🗑️', 'Erase Block', 'bg-red-600'],
          ] as const).map(([mode, icon, title, activeColor]) => (
            <button key={mode} onClick={() => setEditMode(mode)}
              className={`p-1.5 rounded transition-colors ${editMode === mode ? activeColor + ' text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              title={title}>{icon}</button>
          ))}
          <div className="w-px h-5 bg-slate-600 mx-0.5" />
          {([
            ['unit', '🪆', 'Place Unit', 'bg-emerald-600'],
            ['unitErase', '✂️', 'Remove Unit', 'bg-orange-600'],
          ] as const).map(([mode, icon, title, activeColor]) => (
            <button key={mode} onClick={() => setEditMode(mode)}
              className={`p-1.5 rounded transition-colors ${editMode === mode ? activeColor + ' text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              title={title}>{icon}</button>
          ))}
          <div className="w-px h-5 bg-slate-600 mx-0.5" />
          <button onClick={handleClearMap} className="p-1.5 bg-red-700 hover:bg-red-800 text-white rounded transition-colors" title="Clear Map">🧹</button>
        </div>

        <div className="w-px h-5 bg-slate-600" />

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">+</button>
          <span className="text-xs text-slate-400 font-mono w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs">−</button>
          <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1) }} className="px-2 h-6 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs">Reset</button>
          {hoveredTile && (
            <span className="text-xs font-mono text-slate-400 hidden md:inline">
              ({hoveredTile.x},{hoveredTile.y}) · {tileCount} tiles
            </span>
          )}
        </div>

        <Link href="/viewer" className="ml-auto px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded text-xs font-semibold hover:opacity-90 transition-opacity">
          🗺️ Viewer
        </Link>

      </div>

      {/* ── 본문 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 왼쪽 사이드바 ── */}
        <div className="hidden md:flex flex-col w-72 bg-gradient-to-b from-slate-900 to-slate-800 overflow-y-auto border-r border-slate-700/50 shadow-2xl">
          <div className="p-4 space-y-5">

            <div className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center ${
              isUnitMode
                ? 'bg-emerald-700/50 text-emerald-300 border border-emerald-600'
                : 'bg-purple-700/50 text-purple-300 border border-purple-600'
            }`}>
              {editMode === 'place' && '✏️ Block Place Mode'}
              {editMode === 'erase' && '🗑️ Block Erase Mode'}
              {editMode === 'unit' && '🪆 Unit Place Mode'}
              {editMode === 'unitErase' && '✂️ Unit Remove Mode'}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">
                {isUnitMode ? 'Unit Rotation' : 'Block Rotation'}
              </h3>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map(angle => {
                  const active = isUnitMode ? unitRotation === angle : currentRotation === angle
                  return (
                    <button key={angle}
                      onClick={() => isUnitMode ? setUnitRotation(angle) : setCurrentRotation(angle)}
                      className={`py-1.5 rounded text-xs font-medium transition-colors ${active ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >{angle}°</button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-blue-300 mb-2 uppercase tracking-wide">
                Blocks ({blocks.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {blocks.map((block, idx) => (
                  <button key={block.id}
                    onClick={() => { setSelectedBlockIndex(idx); setEditMode('place'); setShowColorPicker(idx === 0) }}
                    className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center overflow-hidden ${
                      selectedBlockIndex === idx && !isUnitMode
                        ? 'border-yellow-400 scale-105 ring-2 ring-yellow-400'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: block.image ? 'transparent' : block.color }}
                    title={block.name}
                  >
                    {block.image
                      ? <img src={block.image} alt={block.name} className="w-full h-full object-cover" />
                      : <span className="text-white text-xs font-semibold drop-shadow text-center px-1">{block.name}</span>
                    }
                  </button>
                ))}
              </div>

              {selectedBlockIndex === 0 && !isUnitMode && (
                <div className="mt-3 p-3 bg-slate-700/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Block Color</h4>
                    <button onClick={() => setShowColorPicker(!showColorPicker)} className="text-xs text-slate-300 hover:text-white">{showColorPicker ? '▼' : '▶'}</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg border-2 border-slate-500" style={{ backgroundColor: currentBlockColor }} />
                    <p className="text-sm font-mono text-blue-300">{currentBlockColor}</p>
                  </div>
                  {showColorPicker && (
                    <>
                      <input type="color" value={currentBlockColor}
                        onChange={e => updateDefaultBlockColor(e.target.value)}
                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-500"
                      />
                      <input type="text" value={currentBlockColor}
                        onChange={e => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updateDefaultBlockColor(e.target.value) }}
                        placeholder="#000000"
                        className="w-full px-2 py-1.5 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-400 outline-none text-xs font-mono"
                      />
                      <div className="grid grid-cols-6 gap-1.5">
                        {['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF',
                          '#8B4513','#FFD700','#808080','#FFFFFF','#000000','#FF6347'].map(c => (
                          <button key={c} onClick={() => updateDefaultBlockColor(c)}
                            className={`w-full aspect-square rounded border-2 transition-all ${currentBlockColor === c ? 'border-white scale-110' : 'border-slate-500'}`}
                            style={{ backgroundColor: c }} title={c}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-emerald-300 mb-2 uppercase tracking-wide">
                Units ({units.length})
              </h3>
              {units.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No units found. Add PNG files to <code className="text-slate-400">/public/units/</code>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {units.map(unit => (
                    <button key={unit.id}
                      onClick={() => { setSelectedUnitId(unit.id); setEditMode('unit') }}
                      className={`w-full rounded-lg border-2 transition-all px-2 py-2.5 flex flex-col items-center gap-1 ${
                        selectedUnitId === unit.id && isUnitMode
                          ? 'border-emerald-400 scale-105 ring-2 ring-emerald-400 bg-emerald-900/30'
                          : 'border-slate-600 hover:border-emerald-500 bg-slate-700/50'
                      }`}
                      title={unit.name}
                    >
                      {unit.images?.[0]
                        ? <img src={unit.images[0]} alt={unit.name} className="w-10 h-10 object-contain" />
                        : <span className="text-xl">🪆</span>
                      }
                      <span className="text-xs text-slate-200 font-medium text-center leading-tight">{unit.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {units.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  클릭하면 Unit Place Mode로 자동 전환됩니다.
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-800/60 rounded-lg space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Controls</p>
              <p className="text-xs text-slate-500">좌클릭/드래그: 타일 편집</p>
              <p className="text-xs text-slate-500">우클릭/Alt+드래그: 패닝</p>
              <p className="text-xs text-slate-500">스크롤: 줌</p>
            </div>
          </div>
        </div>

        {/* ── 캔버스 영역 ── */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{
              cursor: isPanning ? 'grabbing' : editMode === 'erase' || editMode === 'unitErase' ? 'crosshair' : 'cell',
              imageRendering: 'pixelated',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredTile(null) }}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => {}}
          />

          {isUnitMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald-800/80 text-emerald-200 text-xs px-3 py-1.5 rounded-full backdrop-blur pointer-events-none">
              {editMode === 'unit'
                ? `🪆 Unit Place — ${units.find(u => u.id === selectedUnitId)?.name ?? '?'} · ${unitRotation}°`
                : '✂️ Unit Remove — 타일 클릭으로 유닛 제거'}
            </div>
          )}

          <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-2 shadow-xl">
            <p className="text-xs text-slate-500 mb-1">Minimap · {gridWidth}×{gridHeight}</p>
            <svg
              viewBox={`0 0 ${gridWidth} ${gridHeight}`}
              width={100} height={100}
              className="block rounded"
              style={{ background: '#0a0a0e' }}
            >
              {map.map((row, y) =>
                row.map((tile, x) => {
                  if (!tile || !blocks[tile.blockIndex]) return null
                  const block = blocks[tile.blockIndex]
                  return (
                    <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1}
                      fill={tile.color || block.color} />
                  )
                })
              )}
            </svg>
          </div>

          <div className="absolute bottom-4 left-4 text-xs text-slate-600 space-y-0.5 pointer-events-none">
            <p>우클릭드래그: 이동 · 스크롤: 줌</p>
          </div>
        </div>
      </div>
    </div>
  )
}