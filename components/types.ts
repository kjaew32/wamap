export interface BlockData {
  id: string
  name: string
  color: string
  image?: string
}

export interface TileData {
  blockIndex: number
  rotation: number
  color?: string
}

export interface MapData {
  version: string
  gridWidth: number
  gridHeight: number
  blocks: BlockData[]
  map: (TileData | null)[][]
}
