import FundingAgenciesTable from '@/components/FundingAgenciesTable'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Funding Agencies | CARF Admin',
}

export default function AdminFundingAgenciesPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
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

      <FundingAgenciesTable isAdmin={true} />
    </div>
  )
}
