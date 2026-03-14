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
    <div className="relative h-screen">
      <div className="absolute bottom-4 right-4 z-50">
        <Link
          href="/viewer"
          className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm md:text-base"
        >
          🗺️ Open Viewer
        </Link>
      </div>
      <MapEditor />
    </div>
  )
}
