// app/api/blocks/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const blocksDir = path.join(process.cwd(), 'public', 'blocks')
    
    // blocks 디렉토리가 없으면 빈 배열 반환
    if (!fs.existsSync(blocksDir)) {
      return NextResponse.json([])
    }

    // 모든 파일 읽기
    const files = fs.readdirSync(blocksDir)
    
    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)
    })

    // BlockData 객체 생성
    const blocks = imageFiles.map((file, index) => {
      const fileName = path.parse(file).name
      // 파일명 변환: grass_tile → Grass Tile
      const blockName = fileName
        .replace(/_|-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return {
        id: `block-${index}`,
        name: blockName,
        color: '#8B4513',
        image: `/blocks/${file}`
      }
    })

    // console.log(`📦 Loaded ${blocks.length} blocks from /blocks directory`)
    return NextResponse.json(blocks)
  } catch (error) {
    console.error('❌ Error loading blocks:', error)
    return NextResponse.json([], { status: 500 })
  }
}