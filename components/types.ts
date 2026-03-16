export interface BlockData {
  id: string
  name: string
  color: string
  image?: string
}

export interface UnitData {
  id: string
  name: string
  model: string // path to .glb file e.g. /units/soldier.glb
  images?: Record<number, string>  // rotation → png url
}

export interface TileData {
  blockIndex: number
  rotation: number
  color?: string
  // unit placed on top of this tile (optional)
  unitId?: string | null
  unitRotation?: number
}

export interface MapData {
  version: string
  gridWidth: number
  gridHeight: number
  blocks: BlockData[]
  units: UnitData[]
  map: (TileData | null)[][]
}

export interface BlockLoadResponse {
  id: string
  name: string
  color: string
  image?: string
}

export interface UnitLoadResponse {
  id: string
  name: string
  model: string
}