'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useState, useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { BlockData, TileData, MapData } from './types'

// 아이소메트릭 블록 컴포넌트
function IsometricBlock({ 
  position, 
  color, 
  onClick,
  onPointerOver,
  onPointerOut
}: { 
  position: [number, number, number]
  color: string
  onClick?: () => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <mesh
      position={position}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onPointerOver?.()
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered(false)
        onPointerOut?.()
      }}
    >
      <boxGeometry args={[1, 0.5, 1]} />
      <meshStandardMaterial 
        color={hovered ? new THREE.Color(color).multiplyScalar(1.3) : color}
      />
    </mesh>
  )
}

// 이미지 블록 컴포넌트
function ImageBlock({
  position,
  imageUrl,
  rotation = 0,
  onClick,
  onPointerOver,
  onPointerOut
}: {
  position: [number, number, number]
  imageUrl: string
  rotation?: number
  onClick?: () => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load(imageUrl)
  }, [imageUrl])
  
  return (
    <mesh
      position={position}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onPointerOver?.()
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered(false)
        onPointerOut?.()
      }}
    >
      {/* 3D 큐브 형태 */}
      <boxGeometry args={[1, 0.5, 1]} />
      <meshStandardMaterial 
        map={texture}
        transparent={false}
        opacity={hovered ? 0.8 : 1}
      />
    </mesh>
  )
}

// 그리드 평면
function GridPlane({ size }: { size: number }) {
  return (
    <gridHelper args={[size, size, '#444444', '#222222']} rotation={[0, 0, 0]} />
  )
}

// 클릭 가능한 그리드 타일
function GridTile({ 
  x, 
  y, 
  gridSize,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerOver,
  onPointerOut
}: {
  x: number
  y: number
  gridSize: number
  onClick: () => void
  onPointerDown: (x: number, y: number) => void
  onPointerMove: (x: number, y: number) => void
  onPointerUp: () => void
  onPointerOver: () => void
  onPointerOut: () => void
}) {
  const posX = x - gridSize / 2 + 0.5
  const posZ = y - gridSize / 2 + 0.5
  
  return (
    <mesh
      position={[posX, 0, posZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onPointerDown(x, y)
      }}
      onPointerMove={(e) => {
        e.stopPropagation()
        onPointerMove(x, y)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        onPointerUp()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        onPointerOut()
      }}
    >
      <planeGeometry args={[0.95, 0.95]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// 3D 씬
function Scene({ 
  map, 
  blocks, 
  gridSize, 
  onTileClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  hoveredTile,
  setHoveredTile,
  cameraLocked
}: { 
  map: (TileData | null)[][]
  blocks: BlockData[]
  gridSize: number
  onTileClick: (x: number, y: number) => void
  onPointerDown: (x: number, y: number) => void
  onPointerMove: (x: number, y: number) => void
  onPointerUp: () => void
  hoveredTile: { x: number, y: number } | null
  setHoveredTile: (tile: { x: number, y: number } | null) => void
  cameraLocked: boolean
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} />
      <OrbitControls 
        enablePan={!cameraLocked}
        enableZoom={!cameraLocked}
        enableRotate={!cameraLocked}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
      />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, 10, -5]} intensity={0.5} />
      
      <GridPlane size={gridSize} />
      
      {/* 클릭 가능한 그리드 타일 */}
      {map.map((row, y) =>
        row.map((tile, x) => (
          <GridTile
            key={`tile-${x}-${y}`}
            x={x}
            y={y}
            gridSize={gridSize}
            onClick={() => onTileClick(x, y)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerOver={() => setHoveredTile({ x, y })}
            onPointerOut={() => setHoveredTile(null)}
          />
        ))
      )}
      
      {/* 맵 블록 렌더링 */}
      {map.map((row, y) =>
        row.map((tile, x) => {
          if (tile && blocks[tile.blockIndex]) {
            const block = blocks[tile.blockIndex]
            const posX = x - gridSize / 2 + 0.5
            const posZ = y - gridSize / 2 + 0.5
            
            // 이미지 블록인 경우
            if (block.image) {
              return (
                <ImageBlock
                  key={`block-${x}-${y}-${block.image}`}
                  position={[posX, 0.25, posZ]}
                  imageUrl={block.image}
                  rotation={tile.rotation}
                  onClick={() => onTileClick(x, y)}
                  onPointerOver={() => setHoveredTile({ x, y })}
                  onPointerOut={() => setHoveredTile(null)}
                />
              )
            }
            
            // 기본 큐브 블록
            return (
              <IsometricBlock
                key={`block-${x}-${y}-${tile.color}`}
                position={[posX, 0.25, posZ]}
                color={tile.color || '#8B4513'}
                onClick={() => onTileClick(x, y)}
                onPointerOver={() => setHoveredTile({ x, y })}
                onPointerOut={() => setHoveredTile(null)}
              />
            )
          }
          return null
        })
      )}
      
      {/* 호버된 타일 표시 */}
      {hoveredTile && !map[hoveredTile.y]?.[hoveredTile.x] && (
        <mesh
          position={[
            hoveredTile.x - gridSize / 2 + 0.5,
            0.01,
            hoveredTile.y - gridSize / 2 + 0.5
          ]}
        >
          <boxGeometry args={[0.9, 0.02, 0.9]} />
          <meshStandardMaterial color="#4488ff" transparent opacity={0.5} />
        </mesh>
      )}
    </>
  )
}

export default function MapEditor() {
  const [gridWidth, setGridWidth] = useState(20)
  const [gridHeight, setGridHeight] = useState(20)
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0)
  const [currentRotation, setCurrentRotation] = useState(0)
  const [editMode, setEditMode] = useState<'place' | 'erase'>('place')
  const [hoveredTile, setHoveredTile] = useState<{ x: number, y: number } | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [lastProcessedTile, setLastProcessedTile] = useState<{ x: number, y: number } | null>(null)
  const [cameraLocked, setCameraLocked] = useState(true)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [currentBlockColor, setCurrentBlockColor] = useState('#8B4513')
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  
  const [blocks, setBlocks] = useState<BlockData[]>([
    { id: 'default', name: 'Block', color: '#8B4513' },
  ])

  // 색상 팔레트
  const colorPalette = [
    '#8B4513', // Brown
    '#708090', // Stone
    '#228B22', // Grass
    '#F4A460', // Sand
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
  ]
  
  const [map, setMap] = useState<(TileData | null)[][]>(
    Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null))
  )

  const processTile = (x: number, y: number) => {
    // 이미 처리한 타일이면 스킵
    if (lastProcessedTile && lastProcessedTile.x === x && lastProcessedTile.y === y) {
      return
    }

    const newMap = [...map]
    
    if (editMode === 'place') {
      newMap[y][x] = {
        blockIndex: selectedBlockIndex,
        rotation: currentRotation,
        color: currentBlockColor
      }
    } else {
      newMap[y][x] = null
    }
    
    setMap(newMap)
    setLastProcessedTile({ x, y })
  }

  const handleTileClick = (x: number, y: number) => {
    processTile(x, y)
  }

  const handlePointerDown = (x: number, y: number) => {
    setIsMouseDown(true)
    setLastProcessedTile(null)
    processTile(x, y)
  }

  const handlePointerMove = (x: number, y: number) => {
    if (isMouseDown) {
      processTile(x, y)
    }
  }

  const handlePointerUp = () => {
    setIsMouseDown(false)
    setLastProcessedTile(null)
  }

  const handleSaveMap = () => {
    const mapData: MapData = {
      version: '1.0',
      gridWidth,
      gridHeight,
      blocks,
      map
    }
    
    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `map_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const mapData: MapData = JSON.parse(event.target?.result as string)
          setGridWidth(mapData.gridWidth)
          setGridHeight(mapData.gridHeight)
          setBlocks(mapData.blocks)
          
          // 기존 맵 데이터에 color 필드가 없으면 추가
          const updatedMap = mapData.map.map(row => 
            row.map(tile => 
              tile ? { ...tile, color: tile.color || '#8B4513' } : null
            )
          )
          setMap(updatedMap)
        } catch (err) {
          alert('Failed to load map: ' + (err as Error).message)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleClearMap = () => {
    if (confirm('Clear entire map?')) {
      setMap(Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null)))
    }
  }

  const handleResizeGrid = () => {
    setMap(Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null)))
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-2 md:p-4 flex flex-wrap items-center gap-2 md:gap-6 shadow-lg z-10">
        <h2 className="text-lg md:text-xl font-bold text-yellow-400">🗺️ Map Editor</h2>
        
        {/* File Operations */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={handleSaveMap}
            className="p-1 md:p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            title="Save Map"
          >
            💾
          </button>
          <label className="p-1 md:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors" title="Load Map">
            📂
            <input
              type="file"
              accept=".json"
              onChange={handleLoadMap}
              className="hidden"
            />
          </label>
        </div>

        {/* Grid Size */}
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-xs md:text-sm text-blue-300">Grid:</span>
          <input
            type="number"
            value={gridWidth}
            onChange={(e) => setGridWidth(parseInt(e.target.value) || 10)}
            min={5}
            max={50}
            className="w-12 md:w-16 px-1 md:px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none text-xs md:text-sm"
            title="Grid Width"
          />
          <span className="text-slate-400 text-xs md:text-sm">×</span>
          <input
            type="number"
            value={gridHeight}
            onChange={(e) => setGridHeight(parseInt(e.target.value) || 10)}
            min={5}
            max={50}
            className="w-12 md:w-16 px-1 md:px-2 py-1 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none text-xs md:text-sm"
            title="Grid Height"
          />
          <button
            onClick={handleResizeGrid}
            className="px-2 md:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs md:text-sm font-medium transition-colors"
            title="Resize Grid"
          >
            Resize
          </button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setEditMode('place')}
            className={`p-1 md:p-2 rounded transition-colors ${
              editMode === 'place'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Place Mode"
          >
            ✏️
          </button>
          <button
            onClick={() => setEditMode('erase')}
            className={`p-1 md:p-2 rounded transition-colors ${
              editMode === 'erase'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Erase Mode"
          >
            🗑️
          </button>
          <button
            onClick={handleClearMap}
            className="p-1 md:p-2 bg-red-700 hover:bg-red-800 text-white rounded transition-colors"
            title="Clear Map"
          >
            🧹
          </button>
          <button
            onClick={() => setCameraLocked(!cameraLocked)}
            className={`p-1 md:p-2 rounded transition-colors ${
              cameraLocked
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={cameraLocked ? "Unlock Camera" : "Lock Camera"}
          >
            {cameraLocked ? '🔒' : '🔓'}
          </button>
        </div>

        

        {/* Status */}
        {hoveredTile && (
          <div className="text-xs font-mono text-slate-300 ml-2 md:ml-4">
            Tile: ({hoveredTile.x}, {hoveredTile.y})
          </div>
        )}
      </div>

      <div className="flex flex-1">
        {/* Left Sidebar - Hidden on mobile, show on md+ */}
        <div className="hidden md:block w-80 bg-gradient-to-b from-slate-900 to-slate-800 p-6 overflow-y-auto shadow-2xl">
          {/* Rotation */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Rotation</h3>
            <div className="grid grid-cols-4 gap-2">
              {[0, 90, 180, 270].map((angle) => (
                <button
                  key={angle}
                  onClick={() => setCurrentRotation(angle)}
                  className={`px-2 py-2 rounded font-medium text-sm transition-colors ${
                    currentRotation === angle
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {angle}°
                </button>
              ))}
            </div>
          </div>

          {/* Blocks */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Blocks</h3>
            <div className="grid grid-cols-3 gap-3">
              {blocks.map((block, index) => (
                <div key={block.id} className="relative">
                  <button
                    onClick={() => setShowColorPalette(!showColorPalette)}
                    className="w-full aspect-square rounded-lg border-2 border-slate-600 hover:border-slate-500 transition-all flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: block.image ? 'transparent' : currentBlockColor }}
                    title={block.name}
                  >
                    {block.image ? (
                      <img 
                        src={block.image} 
                        alt={block.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-semibold drop-shadow-lg">
                        {block.name.split(' ')[0]}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Color Palette */}
            {showColorPalette && (
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <h4 className="text-xs font-semibold text-blue-300 mb-3 uppercase tracking-wide">Choose Color</h4>
                <div className="grid grid-cols-4 gap-2">
                  {colorPalette.map((color, index) => (
                    <button
                      key={color}
                      onClick={() => {
                        setCurrentBlockColor(color)
                        setSelectedColorIndex(index)
                        setShowColorPalette(false)
                      }}
                      className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                        selectedColorIndex === index
                          ? 'border-white scale-110'
                          : 'border-slate-500 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Select ${color}`}
                    >
                      <span className="text-white text-xs font-mono drop-shadow-lg">
                        {color}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 relative">
          <Canvas 
            shadows
            onPointerUp={handlePointerUp}
          >
            <Scene
              map={map}
              blocks={blocks}
              gridSize={Math.max(gridWidth, gridHeight)}
              onTileClick={handleTileClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              hoveredTile={hoveredTile}
              setHoveredTile={setHoveredTile}
              cameraLocked={cameraLocked}
            />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
