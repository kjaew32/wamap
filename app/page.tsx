'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const MapEditor = dynamic(() => import('@/components/MapEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-white text-2xl">Loading Editor...</div>
    </div>
  ),
})

export default function Home() {
  return (
    <div className="h-screen">
      <MapEditor />
    </div>
  )
}
