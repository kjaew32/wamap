'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useState, useMemo } from 'react'
import * as THREE from 'three'
import { BlockData, TileData, MapData } from './types'

// 아이소메트릭 블록 컴포넌트
function IsometricBlock({ 
  position, 
  color 
}: { 
  position: [number, number, number]
  color: string
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[1, 0.5, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 이미지 블록 컴포넌트
function ImageBlock({
  position,
  imageUrl,
  rotation = 0
}: {
  position: [number, number, number]
  imageUrl: string
  rotation?: number
}) {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return loader.load(imageUrl)
  }, [imageUrl])
  
  return (
    <mesh
      position={position}
      rotation={[0, (rotation * Math.PI) / 180, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 0.5, 1]} />
      <meshStandardMaterial 
        map={texture}
        transparent={false}
      />
    </mesh>
  )
}

// 그리드 평면
function GridPlane({ size }: { size: number }) {
  return (
    <>
      <gridHelper args={[size, size, '#333333', '#1a1a1a']} rotation={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
    </>
  )
}

// 3D 씬
function Scene({ 
  map, 
  blocks, 
  gridSize 
}: { 
  map: (TileData | null)[][]
  blocks: BlockData[]
  gridSize: number
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[20, 20, 20]} />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={false}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 15, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -5]} intensity={0.3} />
      
      <GridPlane size={gridSize} />
      
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
                  key={`${x}-${y}`}
                  position={[posX, 0.25, posZ]}
                  imageUrl={block.image}
                  rotation={tile.rotation}
                />
              )
            }
            
            // 기본 큐브 블록
            return (
              <IsometricBlock
                key={`${x}-${y}`}
                position={[posX, 0.25, posZ]}
                color={tile.color || block.color}
              />
            )
          }
          return null
        })
      )}
    </>
  )
}

export default function MapViewer() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [zoom, setZoom] = useState(1)
  const [autoRotate, setAutoRotate] = useState(false)

  const handleLoadMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data: MapData = JSON.parse(event.target?.result as string)
          setMapData(data)
        } catch (err) {
          alert('Failed to load map: ' + (err as Error).message)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(zoom * 0.8, 0.3))
  }

  return (
    <div className="h-screen relative">
      {/* Control Panel */}
      <div className="absolute top-6 left-6 z-50 bg-slate-900/90 backdrop-blur-lg p-6 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">🗺️ Map Viewer</h2>
        
        {!mapData ? (
          <div className="text-slate-300 mb-4">
            <p className="text-sm mb-3">Load a map file to start exploring</p>
            <label className="block px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all cursor-pointer text-center">
              📂 Load Map
              <input
                type="file"
                accept=".json"
                onChange={handleLoadMap}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-800/50 p-3 rounded-lg text-sm">
              <p className="text-slate-300">
                <span className="text-blue-400 font-semibold">Map Size:</span> {mapData.gridWidth}x{mapData.gridHeight}
              </p>
              <p className="text-slate-300">
                <span className="text-blue-400 font-semibold">Blocks:</span> {mapData.blocks.length}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                🔍 Zoom In
              </button>
              <button
                onClick={handleZoomOut}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                🔍 Zoom Out
              </button>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRotate
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                {autoRotate ? '⏸️ Stop Rotation' : '▶️ Auto Rotate'}
              </button>
              
              <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all cursor-pointer text-center">
                📂 Load New Map
                <input
                  type="file"
                  accept=".json"
                  onChange={handleLoadMap}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 bg-slate-800/50 p-3 rounded-lg text-xs text-slate-400">
          <p className="font-semibold mb-2 text-slate-300">Controls:</p>
          <p>• Drag: Rotate view</p>
          <p>• Scroll: Zoom in/out</p>
          <p>• Right-click drag: Pan</p>
        </div>
      </div>

      {/* Minimap */}
      {mapData && (
        <div className="absolute bottom-6 right-6 z-50 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl shadow-2xl border border-slate-700">
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Minimap</h3>
          <div className="w-48 h-48 bg-slate-800 rounded-lg overflow-hidden">
            <svg viewBox={`0 0 ${mapData.gridWidth} ${mapData.gridHeight}`} className="w-full h-full">
              {mapData.map.map((row, y) =>
                row.map((tile, x) => {
                  if (tile && mapData.blocks[tile.blockIndex]) {
                    const block = mapData.blocks[tile.blockIndex]
                    return (
                      <rect
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        width={1}
                        height={1}
                        fill={tile.color || block.color}
                      />
                    )
                  }
                  return null
                })
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="h-full bg-gradient-to-br from-slate-950 to-slate-900">
        {mapData ? (
          <Canvas shadows>
            <Scene
              map={mapData.map}
              blocks={mapData.blocks}
              gridSize={Math.max(mapData.gridWidth, mapData.gridHeight)}
            />
            <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1} />
          </Canvas>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-3xl font-bold text-white mb-2">No Map Loaded</h2>
              <p className="text-slate-400">Load a map file to start exploring</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
