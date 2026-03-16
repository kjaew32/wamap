// app/converter/page.tsx
import dynamic from 'next/dynamic'
const GlbToPngConverter = dynamic(() => import('@/components/GlbToPngConverter'), { ssr: false })
export default function ConverterPage() {
  return <GlbToPngConverter />
}