import FundingAgenciesTable from '@/components/FundingAgenciesTable'
import { BookOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Funding Agencies | CARF Portal',
}

export default function PortalFundingAgenciesPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/announcements" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Announcements
      </Link>
      
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-[#0A3D8F] rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Funding Agencies</h1>
        </div>
        <p className="text-slate-500 text-lg">
          Reference list of National and International funding agencies.
        </p>
      </div>

      <FundingAgenciesTable isAdmin={false} />
    </div>
  )
}
