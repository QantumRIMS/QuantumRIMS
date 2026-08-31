'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useFaculty } from '@/context/FacultyContext'
import { GraduationCap, Award, Users, Briefcase, IndianRupee, FileText, FlaskConical, FolderOpen } from 'lucide-react'

export default function PortalHome() {
  const faculty = useFaculty()
  const [reportStats, setReportStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const res = await fetch('/api/admin/reports/stats', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setReportStats(data)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const formatCurrency = (val: number) => {
    if (!val) return '₹0'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1).replace(/\.0$/, '')} Cr+`
    if (val >= 100000) return `₹${(val / 100000).toFixed(1).replace(/\.0$/, '')} L+`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const man = reportStats?.manualStats || {}
  const liv = reportStats?.liveStats || {}

  return (
    <div className="min-h-full bg-blue-50 pb-16 font-sans">
      <div className="w-full mx-auto px-4 sm:px-8 pt-8">
        
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] rounded-3xl p-10 md:p-14 mb-8 text-white relative overflow-hidden shadow-xl animate-fade-in">
          <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-[var(--brand-yellow)] rounded-full opacity-20 blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[var(--brand-yellow)] font-bold tracking-wide mb-2 flex items-center gap-2">
              Welcome, {faculty.name.replace('Dr. ', '').split(' ')[0]} 👋
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">What would you like to explore today?</h1>
            <p className="text-blue-100 max-w-2xl text-lg font-medium">
              Everything from Research Publications to Incentives and Seed Funding in one place — 
              track your progress and claim your rewards.
            </p>
          </div>
        </div>

        {/* Institutional Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-slide-up" style={{animationDelay:'0.3s'}}>
          {[
            { title: 'Phds holders', stat: `${liv.faculty_phd_percent ?? 45}%`, label: 'PERCENTAGE', Icon: GraduationCap },
            { title: 'Scopus Publications', stat: `${liv.scopus_publications_count || 0}+`, label: 'TOTAL', Icon: FileText },
            { title: 'Patents Published', stat: `${liv.patents_published_count || 0}+`, label: 'TOTAL', Icon: Award },
            { title: 'Incentives', stat: formatCurrency(liv.incentives_total), label: 'TOTAL SANCTIONED', Icon: IndianRupee },
            { title: 'AU Research Supervisors', stat: `${liv.au_research_supervisors_count || 0}+`, label: 'TOTAL', Icon: Users },
            { title: 'AU Research Scholars', stat: `${liv.au_research_scholars_count || 0}+`, label: 'TOTAL', Icon: Users },
            { title: 'Seed Fund Grants', stat: formatCurrency(liv.seed_fund_grants_total), label: 'SANCTIONED', Icon: FlaskConical },
            { title: 'Project Grants', stat: formatCurrency(liv.project_grants_total), label: 'TOTAL GRANTED', Icon: FolderOpen },
            { title: 'Consultancy Projects', stat: formatCurrency(liv.consultancy_project_total || 0), label: 'EXTERNAL', Icon: Briefcase },
          ].map((card, i) => {
            const Icon = card.Icon
            return (
              <div key={i} className="relative group overflow-hidden bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] rounded-3xl p-8 text-white flex flex-col h-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(29,78,216,0.4)] hover:border-white/30">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-gradient-to-br from-[#FDB813]/20 to-transparent blur-3xl group-hover:scale-150 transition-transform duration-700 ease-in-out pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#FDB813]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 group-hover:bg-white/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    <Icon className="w-7 h-7 text-[#FDB813] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-4xl lg:text-5xl font-black tracking-tighter drop-shadow-md text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-100">
                      {isLoading ? (
                        <div className="h-10 w-20 bg-white/20 rounded animate-pulse inline-block" />
                      ) : (
                        card.stat
                      )}
                    </div>
                    <div className="text-[10px] lg:text-xs uppercase tracking-[0.2em] text-blue-200/90 font-bold mt-2 bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5 inline-block shadow-inner">
                      {card.label}
                    </div>
                  </div>
                </div>
                
                <div className="flex-grow flex flex-col justify-end relative z-10">
                  <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-white/95 group-hover:text-white transition-colors">
                    {card.title}
                  </h3>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
