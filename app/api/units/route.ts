// app/api/units/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const unitsDir = path.join(process.cwd(), 'public', 'units')

    if (!fs.existsSync(unitsDir)) {
      return NextResponse.json([])
    }

    const files = fs.readdirSync(unitsDir)

    // PNG 파일만 필터링
    const pngFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ext === '.png'
    })

    // 파일명에서 unitId와 rotation 파싱
    // 예: soldier_2x_rot0.png, soldier_2x_rot90.png → id: soldier, rotations: [0, 90, ...]
    const unitMap = new Map<string, { name: string; images: Record<number, string> }>()

    pngFiles.forEach(file => {
      const fileName = path.parse(file).name

      // 패턴: {name}_{mult}x_rot{rotation}  예: soldier_2x_rot90
      const match = fileName.match(/^(.+?)_\d+x_rot(\d+)$/)

      if (match) {
        const rawId  = match[1]  // "soldier"
        const rot    = parseInt(match[2])  // 90

        if (!unitMap.has(rawId)) {
          const unitName = rawId
            .replace(/_|-/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
          unitMap.set(rawId, { name: unitName, images: {} })
        }

        unitMap.get(rawId)!.images[rot] = `/units/${file}`
      } else {
        // 패턴 없는 단순 PNG → rot0 으로 취급
        if (!unitMap.has(fileName)) {
          const unitName = fileName
            .replace(/_|-/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
          unitMap.set(fileName, { name: unitName, images: {} })
        }
        unitMap.get(fileName)!.images[0] = `/units/${file}`
      }
    })

    const units = Array.from(unitMap.entries()).map(([id, data], index) => ({
      id:     `unit-${index}-${id}`,
      name:   data.name,
      images: data.images,   // { 0: '/units/soldier_2x_rot0.png', 90: '...', ... }
      model:  '',            // 하위 호환용 (더 이상 glb 아님)
    }))

    return NextResponse.json(units)
  } catch (error) {
    console.error('❌ Error loading units:', error)
    return NextResponse.json([], { status: 500 })
  }
}