'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useState, useRef, useMemo } from 'react'
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
  onPointerOver,
  onPointerOut
}: {
  x: number
  y: number
  gridSize: number
  onClick: () => void
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
  hoveredTile,
  setHoveredTile
}: { 
  map: (TileData | null)[][]
  blocks: BlockData[]
  gridSize: number
  onTileClick: (x: number, y: number) => void
  hoveredTile: { x: number, y: number } | null
  setHoveredTile: (tile: { x: number, y: number } | null) => void
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 15, 15]} />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
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
                  key={`block-${x}-${y}`}
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
                key={`block-${x}-${y}`}
                position={[posX, 0.25, posZ]}
                color={block.color}
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
  
  const [blocks, setBlocks] = useState<BlockData[]>([
    { id: 'default', name: 'Brown Block', color: '#8B4513' },
    { id: 'stone', name: 'Stone Block', color: '#708090' },
    { id: 'grass', name: 'Grass Block', color: '#228B22' },
    { id: 'sand', name: 'Sand Block', color: '#F4A460' },
  ])
  
  const [map, setMap] = useState<(TileData | null)[][]>(
    Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null))
  )

  const handleTileClick = (x: number, y: number) => {
    const newMap = [...map]
    
    if (editMode === 'place') {
      newMap[y][x] = {
        blockIndex: selectedBlockIndex,
        rotation: currentRotation
      }
    } else {
      newMap[y][x] = null
    }
    
    setMap(newMap)
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
          setMap(mapData.map)
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

  const handleAddCustomBlock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const newBlock: BlockData = {
          id: `custom_${Date.now()}_${Math.random()}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // 확장자 제거
          color: '#FFFFFF',
          image: event.target?.result as string
        }
        setBlocks([...blocks, newBlock])
      }
      reader.readAsDataURL(file)
    })
    
    e.target.value = '' // 입력 초기화
  }

  const handleDeleteBlock = (index: number) => {
    if (confirm('Delete this block?')) {
      setBlocks(blocks.filter((_, i) => i !== index))
      if (selectedBlockIndex === index) {
        setSelectedBlockIndex(0)
      } else if (selectedBlockIndex > index) {
        setSelectedBlockIndex(selectedBlockIndex - 1)
      }
    }
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 p-6 overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">🗺️ Map Editor</h2>
        
        {/* Info */}
        <div className="bg-slate-700/50 p-4 rounded-lg mb-6 text-sm text-slate-200">
          <p>Click on grid: Place block</p>
          <p>Scroll: Zoom</p>
          <p>Right-click drag: Rotate view</p>
        </div>

        {/* Grid Size */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Grid Size</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={gridWidth}
              onChange={(e) => setGridWidth(parseInt(e.target.value) || 10)}
              min={5}
              max={50}
              className="w-20 px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none"
            />
            <input
              type="number"
              value={gridHeight}
              onChange={(e) => setGridHeight(parseInt(e.target.value) || 10)}
              min={5}
              max={50}
              className="w-20 px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-400 outline-none"
            />
            <button
              onClick={handleResizeGrid}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Resize
            </button>
          </div>
        </div>

        {/* Tools */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">Tools</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditMode('place')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                editMode === 'place'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Place Mode
            </button>
            <button
              onClick={() => setEditMode('erase')}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                editMode === 'erase'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Erase Mode
            </button>
            <button
              onClick={handleClearMap}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-medium transition-colors"
            >
              Clear Map
            </button>
          </div>
        </div>

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
          <div className="grid grid-cols-2 gap-3">
            {blocks.map((block, index) => (
              <div key={block.id} className="relative">
                <button
                  onClick={() => setSelectedBlockIndex(index)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center overflow-hidden ${
                    selectedBlockIndex === index
                      ? 'border-yellow-400 shadow-lg shadow-yellow-400/50 scale-105'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  style={{ backgroundColor: block.image ? 'transparent' : block.color }}
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
                
                {/* 삭제 버튼 (커스텀 블록만) */}
                {block.id.startsWith('custom_') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBlock(index)
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs flex items-center justify-center shadow-lg"
                    title="Delete block"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* File Operations */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blue-300 mb-2 uppercase tracking-wide">File</h3>
          <div className="flex flex-col gap-2">
            <label className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded font-medium transition-all cursor-pointer text-center">
              🎨 Add Custom Block
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddCustomBlock}
                className="hidden"
              />
            </label>
            
            <button
              onClick={handleSaveMap}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded font-medium transition-all"
            >
              💾 Save Map
            </button>
            <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded font-medium transition-all cursor-pointer text-center">
              📂 Load Map
              <input
                type="file"
                accept=".json"
                onChange={handleLoadMap}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status */}
        {hoveredTile && (
          <div className="bg-slate-700/50 p-3 rounded text-xs font-mono text-slate-300">
            Tile: ({hoveredTile.x}, {hoveredTile.y})
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900">
        <Canvas shadows>
          <Scene
            map={map}
            blocks={blocks}
            gridSize={Math.max(gridWidth, gridHeight)}
            onTileClick={handleTileClick}
            hoveredTile={hoveredTile}
            setHoveredTile={setHoveredTile}
          />
        </Canvas>
      </div>
    </div>
  )
}
