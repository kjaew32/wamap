'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ─────────────────────────────────────────────
// 맵에디터 블록 기준 상수 (MapEditor / MapViewer 동일)
// ─────────────────────────────────────────────
const BASE_TILE_W  = 64
const BASE_TILE_H  = 32
const BASE_BLOCK_H = 20
const BASE_BLOCK_PX = 64  // x1 = 64×64px (블록 1칸 정사각형)

const MULTIPLIERS = [
  { label: 'x1', mult: 1, desc: '1칸 · 64 px' },
  { label: 'x2', mult: 2, desc: '2×2칸 · 128 px' },
  { label: 'x4', mult: 4, desc: '4×4칸 · 256 px' },
  { label: 'x8', mult: 8, desc: '8×8칸 · 512 px' },
]

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
interface ConvertedPng {
  unitId: string
  fileName: string
  rotation: number
  size: number
  mult: number
  dataUrl: string
}

interface GlbEntry {
  id: string
  name: string
  file: File
  objectUrl: string
}

// ─────────────────────────────────────────────
// 아이소메트릭 고정 시점 상수
// ─────────────────────────────────────────────
const ISO_AZIMUTH   = Math.PI / 4
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2))  // 35.26°

// ─────────────────────────────────────────────
// GLB → PNG DataURL (모델만, 배경 투명)
// ─────────────────────────────────────────────
async function renderGlbToPng(
  objectUrl: string,
  rotationDeg: number,
  sizePx: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = sizePx

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(sizePx, sizePx)
    renderer.setPixelRatio(1)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.9))
    const d1 = new THREE.DirectionalLight(0xffffff, 1.3)
    d1.position.set(5, 8, 5); scene.add(d1)
    const d2 = new THREE.DirectionalLight(0x8899ff, 0.4)
    d2.position.set(-5, 3, -5); scene.add(d2)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200)
    const dist = 20
    camera.position.set(
      dist * Math.cos(ISO_ELEVATION) * Math.sin(ISO_AZIMUTH),
      dist * Math.sin(ISO_ELEVATION),
      dist * Math.cos(ISO_ELEVATION) * Math.cos(ISO_AZIMUTH)
    )
    camera.lookAt(0, 0, 0)

    const loader = new GLTFLoader()
    loader.load(objectUrl, (gltf) => {
      const model = gltf.scene

      const box = new THREE.Box3().setFromObject(model)
      const sz  = new THREE.Vector3(); box.getSize(sz)
      const scale = 1.5 / Math.max(sz.x, sz.y, sz.z)
      model.scale.setScalar(scale)

      const box2 = new THREE.Box3().setFromObject(model)
      const ctr  = new THREE.Vector3(); box2.getCenter(ctr)
      model.position.sub(ctr)

      model.rotation.y = (rotationDeg * Math.PI) / 180
      scene.add(model)

      const box3 = new THREE.Box3().setFromObject(model)
      const sz3  = new THREE.Vector3(); box3.getSize(sz3)
      const half = Math.max(sz3.x, sz3.y, sz3.z) * 0.65
      camera.left = camera.bottom = -half
      camera.right = camera.top = half
      camera.updateProjectionMatrix()

      renderer.render(scene, camera)
      const dataUrl = canvas.toDataURL('image/png')
      renderer.dispose()
      resolve(dataUrl)
    }, undefined, (err) => { renderer.dispose(); reject(err) })
  })
}

// ─────────────────────────────────────────────
// Canvas 2D 아이소메트릭 블록 그리기 (프리뷰 전용)
// ─────────────────────────────────────────────
function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  scale: number,
  color = '#6b8c42'
) {
  const tW = BASE_TILE_W  * scale
  const tH = BASE_TILE_H  * scale
  const bH = BASE_BLOCK_H * scale
  const hw = tW / 2
  const hh = tH / 2

  function hr(hex: string) {
    const c = hex.replace('#','')
    return { r: parseInt(c.slice(0,2),16)||0, g: parseInt(c.slice(2,4),16)||0, b: parseInt(c.slice(4,6),16)||0 }
  }
  function rgb(r:number,g:number,b:number) {
    return `rgb(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))})`
  }
  const base = hr(color)

  // 윗면
  ctx.fillStyle = rgb(base.r+40, base.g+40, base.b+40)
  ctx.beginPath()
  ctx.moveTo(cx,     topY)
  ctx.lineTo(cx+hw,  topY+hh)
  ctx.lineTo(cx,     topY+tH)
  ctx.lineTo(cx-hw,  topY+hh)
  ctx.closePath(); ctx.fill()

  // 왼쪽 측면
  ctx.fillStyle = rgb(base.r*.6|0, base.g*.6|0, base.b*.6|0)
  ctx.beginPath()
  ctx.moveTo(cx-hw,  topY+hh)
  ctx.lineTo(cx,     topY+tH)
  ctx.lineTo(cx,     topY+tH+bH)
  ctx.lineTo(cx-hw,  topY+hh+bH)
  ctx.closePath(); ctx.fill()

  // 오른쪽 측면
  ctx.fillStyle = rgb(base.r*.8|0, base.g*.8|0, base.b*.8|0)
  ctx.beginPath()
  ctx.moveTo(cx+hw,  topY+hh)
  ctx.lineTo(cx,     topY+tH)
  ctx.lineTo(cx,     topY+tH+bH)
  ctx.lineTo(cx+hw,  topY+hh+bH)
  ctx.closePath(); ctx.fill()

  // 외곽선
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, topY); ctx.lineTo(cx+hw, topY+hh); ctx.lineTo(cx, topY+tH); ctx.lineTo(cx-hw, topY+hh); ctx.closePath()
  ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, topY+tH);    ctx.lineTo(cx,    topY+tH+bH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx-hw, topY+hh); ctx.lineTo(cx-hw, topY+hh+bH); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx+hw, topY+hh); ctx.lineTo(cx+hw, topY+hh+bH); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx-hw, topY+hh+bH); ctx.lineTo(cx, topY+tH+bH); ctx.lineTo(cx+hw, topY+hh+bH)
  ctx.stroke()
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
const PREVIEW_SIZE = 460

export default function GlbToPngConverter() {
  const [glbEntries, setGlbEntries] = useState<GlbEntry[]>([])
  const [multiplier, setMultiplier] = useState(2)
  const [rotations,  setRotations]  = useState<number[]>([0, 90, 180, 270])
  const [converting, setConverting] = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [progTotal,  setProgTotal]  = useState(0)
  const [results,    setResults]    = useState<ConvertedPng[]>([])

  const [previewEntry, setPreviewEntry] = useState<GlbEntry | null>(null)
  const [previewRot,   setPreviewRot]   = useState(0)
  const [showBlock,    setShowBlock]    = useState(true)
  const [blockColor,   setBlockColor]   = useState('#5a7c35')

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // ── 파일 추가 ──
  const addFiles = useCallback((files: File[]) => {
    const entries: GlbEntry[] = files.map((f, i) => ({
      id: `glb-${Date.now()}-${i}`,
      name: f.name.replace(/\.glb$/i, ''),
      file: f,
      objectUrl: URL.createObjectURL(f),
    }))
    setGlbEntries(prev => [...prev, ...entries])
    setPreviewEntry(prev => prev ?? entries[0] ?? null)
  }, [])

  const removeEntry = (id: string) => {
    setGlbEntries(prev => {
      const e = prev.find(x => x.id === id)
      if (e) URL.revokeObjectURL(e.objectUrl)
      const next = prev.filter(x => x.id !== id)
      return next
    })
    setPreviewEntry(prev => prev?.id === id ? null : prev)
  }

  // ── 미리보기 렌더 ──
  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

    // 체커보드 배경
    const ts = 20
    for (let y = 0; y < PREVIEW_SIZE; y += ts)
      for (let x = 0; x < PREVIEW_SIZE; x += ts) {
        ctx.fillStyle = ((x + y) / ts) % 2 === 0 ? '#1a2535' : '#0f1720'
        ctx.fillRect(x, y, ts, ts)
      }

    if (!previewEntry) return

    let cancelled = false

    renderGlbToPng(previewEntry.objectUrl, previewRot, PREVIEW_SIZE)
      .then(dataUrl => {
        if (cancelled) return
        ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)

        // 체커보드 다시
        for (let y = 0; y < PREVIEW_SIZE; y += ts)
          for (let x = 0; x < PREVIEW_SIZE; x += ts) {
            ctx.fillStyle = ((x + y) / ts) % 2 === 0 ? '#1a2535' : '#0f1720'
            ctx.fillRect(x, y, ts, ts)
          }

        // 블록 그리기 (showBlock=true일 때)
        if (showBlock) {
          // 블록을 캔버스 중앙 하단 기준으로 배치
          const blockScale = 3.2
          const tH = BASE_TILE_H  * blockScale
          const bH = BASE_BLOCK_H * blockScale
          const totalH = tH + bH
          // 블록 중앙을 캔버스 중앙보다 약간 아래에
          const cx   = PREVIEW_SIZE / 2
          const topY = PREVIEW_SIZE / 2 - totalH / 2 + 20
          drawIsoBlock(ctx, cx, topY, blockScale, blockColor)
        }

        // 모델 이미지 위에 합성
        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          ctx.drawImage(img, 0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
        }
        img.src = dataUrl
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [previewEntry, previewRot, showBlock, blockColor])

  // ── 변환 실행 ──
  const handleConvert = async () => {
    if (!glbEntries.length || !rotations.length) return
    setConverting(true)
    setProgress(0)
    const sizePx = multiplier * BASE_BLOCK_PX
    const total  = glbEntries.length * rotations.length
    setProgTotal(total)
    setResults([])

    const out: ConvertedPng[] = []
    for (const entry of glbEntries) {
      for (const rot of rotations) {
        try {
          // 블록 없이 모델만 렌더 (변환 PNG에는 블록 포함 안 함)
          const dataUrl = await renderGlbToPng(entry.objectUrl, rot, sizePx)
          out.push({
            unitId: entry.id,
            fileName: `${entry.name}_${multiplier}x_rot${rot}.png`,
            rotation: rot, size: sizePx, mult: multiplier, dataUrl,
          })
        } catch (e) { console.error(e) }
        setProgress(p => p + 1)
      }
    }
    setResults(out)
    setConverting(false)
  }

  const downloadOne = (r: ConvertedPng) => {
    const a = document.createElement('a'); a.href = r.dataUrl; a.download = r.fileName; a.click()
  }
  const downloadAll = () => results.forEach((r, i) => setTimeout(() => downloadOne(r), i * 120))

  const toggleRot = (r: number) =>
    setRotations(prev => prev.includes(r) ? prev.filter(x=>x!==r) : [...prev,r].sort((a,b)=>a-b))

  const sizePx = multiplier * BASE_BLOCK_PX

  return (
    <div className="min-h-screen bg-[#070b12] text-white" style={{ fontFamily: 'ui-monospace, monospace' }}>

      {/* ── 헤더 ── */}
      <div className="border-b border-slate-700/50 bg-slate-900/70 px-5 py-2.5 flex items-center gap-3">
        <span className="text-xl">🧊</span>
        <div>
          <h1 className="text-xs font-bold text-cyan-400 tracking-widest uppercase">GLB → PNG Converter</h1>
          <p className="text-xs text-slate-500">Isometric · Three.js offscreen renderer</p>
        </div>
        <div className="ml-auto text-xs text-slate-500 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"/>
          45° / 35.26° 아이소메트릭 고정 시점
        </div>
      </div>

      <div className="flex h-[calc(100vh-45px)]">

        {/* ── 왼쪽 패널 ── */}
        <div className="w-60 border-r border-slate-700/40 bg-slate-900/40 flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-5">

            {/* 파일 드롭 */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">1. GLB 파일</p>
              <div
                onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files).filter(f=>/\.glb$/i.test(f.name))) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => document.getElementById('glb-file-input')?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-xl p-4 text-center cursor-pointer transition-colors group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📦</div>
                <p className="text-xs text-slate-400">드래그 또는 클릭</p>
                <input id="glb-file-input" type="file" accept=".glb" multiple className="hidden"
                  onChange={e => addFiles(Array.from(e.target.files||[]).filter(f=>/\.glb$/i.test(f.name)))}
                />
              </div>
              {glbEntries.length > 0 && (
                <div className="mt-2 space-y-1">
                  {glbEntries.map(e => (
                    <div key={e.id} onClick={() => { setPreviewEntry(e); setPreviewRot(0) }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                        previewEntry?.id === e.id
                          ? 'bg-cyan-900/50 border border-cyan-700/60 text-cyan-300'
                          : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300'
                      }`}
                    >
                      <span>🧊</span>
                      <span className="flex-1 truncate">{e.name}</span>
                      <button onClick={ev => { ev.stopPropagation(); removeEntry(e.id) }}
                        className="text-slate-600 hover:text-red-400 transition-colors ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 출력 크기 */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">2. 출력 크기</p>
              <div className="grid grid-cols-2 gap-2">
                {MULTIPLIERS.map(m => (
                  <button key={m.mult} onClick={() => setMultiplier(m.mult)}
                    className={`py-2.5 rounded-xl text-center transition-all border ${
                      multiplier === m.mult
                        ? 'bg-cyan-700/30 border-cyan-500 text-cyan-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-base font-bold">{m.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-tight">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* 블록 칸 시각화 */}
              <div className="mt-2.5 flex items-center gap-3 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-700/30">
                <div className="flex gap-0.5">
                  {Array.from({length: Math.min(multiplier, 4)}).map((_,i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      {Array.from({length: Math.min(multiplier, 4)}).map((_,j) => (
                        <div key={j} className="w-2.5 h-2.5 bg-cyan-600/70 rounded-sm border border-cyan-500/40"/>
                      ))}
                    </div>
                  ))}
                  {multiplier > 4 && <span className="text-xs text-slate-500 self-center ml-1">…</span>}
                </div>
                <div className="text-xs">
                  <div className="text-cyan-300 font-bold">{sizePx} × {sizePx}</div>
                  <div className="text-slate-500">{multiplier}×{multiplier} 칸</div>
                </div>
              </div>
            </div>

            {/* 회전각 */}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">3. 회전각</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[0, 90, 180, 270].map(r => (
                  <button key={r} onClick={() => toggleRot(r)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                      rotations.includes(r) ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                    }`}
                  >{r}° {rotations.includes(r) ? '✓' : ''}</button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                {rotations.length}각 × {glbEntries.length}파일 = <span className="text-slate-400">{rotations.length * glbEntries.length}장</span>
              </p>
            </div>

            {/* 변환 버튼 */}
            <button onClick={handleConvert}
              disabled={converting || !glbEntries.length || !rotations.length}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed
                bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white shadow-lg"
            >
              {converting ? `변환 중 ${progress}/${progTotal}` : '🚀 PNG 변환 시작'}
            </button>

            {converting && (
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                  style={{ width: `${progTotal > 0 ? (progress/progTotal)*100 : 0}%` }}/>
              </div>
            )}
          </div>
        </div>

        {/* ── 중앙: 미리보기 ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#05080e] p-6 gap-4 overflow-hidden">
          <p className="text-xs uppercase tracking-widest text-slate-600">Preview</p>

          {/* 캔버스 */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/80"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
            <canvas ref={previewCanvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="block"/>
            {!previewEntry && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl opacity-10">🧊</span>
                <p className="text-xs text-slate-700">GLB 파일을 추가하세요</p>
              </div>
            )}
          </div>

          {/* 회전 버튼 */}
          {previewEntry && (
            <div className="flex gap-2">
              {[0, 90, 180, 270].map(r => (
                <button key={r} onClick={() => setPreviewRot(r)}
                  className={`w-14 py-1.5 rounded-lg text-xs transition-colors ${
                    previewRot === r ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >{r}°</button>
              ))}
            </div>
          )}

          {previewEntry && (
            <p className="text-xs text-slate-600">{previewEntry.name} · {previewRot}° · 미리보기 {PREVIEW_SIZE}px</p>
          )}

          {/* 블록 언더레이 토글 */}
          <div className="flex items-center gap-3 bg-slate-900/70 border border-slate-700/40 px-4 py-2.5 rounded-xl">
            <button onClick={() => setShowBlock(v => !v)}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className={`w-9 h-5 rounded-full relative transition-colors ${showBlock ? 'bg-cyan-600' : 'bg-slate-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showBlock ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </div>
              <span className="text-xs text-slate-300">블록 미리보기</span>
            </button>

            {showBlock && (
              <>
                <div className="w-px h-4 bg-slate-700"/>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">블록 색상</span>
                  <input type="color" value={blockColor} onChange={e => setBlockColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent p-0.5"
                  />
                  <span className="text-xs font-mono text-slate-400">{blockColor}</span>
                </div>
              </>
            )}

            <div className="w-px h-4 bg-slate-700"/>
            <span className="text-xs text-slate-600">변환 PNG엔 미포함</span>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ── */}
        <div className="w-80 border-l border-slate-700/40 bg-slate-900/40 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-slate-400">결과 ({results.length}장)</span>
            {results.length > 0 && (
              <button onClick={downloadAll}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors">
                ⬇ 전체 다운로드
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
                <span className="text-4xl opacity-20">🖼️</span>
                <p className="text-xs">변환 후 결과가 표시됩니다</p>
              </div>
            ) : (
              <>
                {glbEntries.map(entry => {
                  const er = results.filter(r => r.unitId === entry.id)
                  if (!er.length) return null
                  return (
                    <div key={entry.id} className="bg-slate-800/40 rounded-xl border border-slate-700/30 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-800/70 flex items-center gap-2">
                        <span className="text-xs text-cyan-400 font-semibold truncate flex-1">{entry.name}</span>
                        <span className="text-xs text-slate-500 shrink-0">{er[0].size}px · {er.length}장</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 p-2">
                        {er.map(r => (
                          <div key={r.fileName} className="group relative cursor-pointer" onClick={() => downloadOne(r)} title={`클릭하여 다운로드: ${r.fileName}`}>
                            <div className="rounded-lg overflow-hidden border border-slate-700/40 hover:border-cyan-500/60 transition-colors aspect-square"
                              style={{ backgroundImage: 'repeating-conic-gradient(#1e293b 0% 25%,#0f172a 0% 50%)', backgroundSize: '10px 10px' }}>
                              <img src={r.dataUrl} alt={r.fileName} className="w-full h-full object-contain"/>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-0.5">{r.rotation}°</p>
                            <div className="absolute inset-0 bottom-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="bg-black/70 rounded px-1.5 py-0.5 text-xs text-white">⬇</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <div className="p-3 bg-cyan-950/40 border border-cyan-800/30 rounded-xl text-xs text-cyan-400/60 space-y-1.5">
                  <p className="font-semibold text-cyan-400/80">💡 맵 에디터 연동</p>
                  <p className="text-slate-500">PNG를 <code className="text-cyan-400/70">/public/blocks/</code> 에 저장하면 에디터에서 자동 로드됩니다</p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
