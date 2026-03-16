'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

const MapViewer = dynamic(() => import('@/components/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-white text-2xl">Loading Viewer...</div>
    </div>
  ),
})

export default function ViewerPage() {
  return (
    <div className="relative h-screen">
      <div className="absolute bottom-4 right-4 z-50">
        <Link
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          🎨 E
        </Link>
      </div>
      <MapViewer />
    </div>
  )
}
