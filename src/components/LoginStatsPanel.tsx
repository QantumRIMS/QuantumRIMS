'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export function LoginStatsPanel() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchStats() {
      try {
        const res = await fetch('/api/public/stats')
        if (res.ok) {
          const data = await res.json()
          if (mounted) setStats(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchStats()
    return () => { mounted = false }
  }, [])

  const formatCurrency = (val: number) => {
    if (!val) return '₹0'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1).replace(/\.0$/, '')} Cr+`
    if (val >= 100000) return `₹${(val / 100000).toFixed(1).replace(/\.0$/, '')} L+`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const man = stats?.manualStats || {}
  const liv = stats?.liveStats || {}

  const getValue = (val: any, formatter: (v: any) => string = (v) => `${v}+`) => {
    if (loading) return '—'
    if (val == null) return '—'
    return formatter(val)
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#0A3D8F] via-[#062966] to-[#031535] flex flex-col p-8 lg:p-12 xl:p-20 justify-center text-white relative overflow-hidden">
      
      {/* Decorative Premium Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

      {/* Decorative Glow Orbs */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-blue-500 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-xl relative z-10 mx-auto w-full">
        
        {/* Heading */}
        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black mb-6 tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-100 drop-shadow-sm">
          Where research <br/> becomes <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDB813] to-[#ffda7c] drop-shadow-md">real impact.</span>
        </h1>
        
        {/* Subheading */}
        <p className="text-blue-200/90 text-lg md:text-xl font-medium max-w-lg mb-12 leading-relaxed tracking-wide">
          The official staff portal of Sri Eshwar Research Excellence — submit publications, track incentives, and manage seed fund projects.
        </p>

        {/* Stats Grid - Glassmorphism */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-stretch">
          
          {/* Card 1: Scopus */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.scopus_publications_count)}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Scopus<br/>Pubs</div>
          </div>

          {/* Card 2: Patents */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.patents_published_count)}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Patents<br/>Published</div>
          </div>

          {/* Card 3: AU Supervisors */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.au_research_supervisors_count)}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">AU Research<br/>Supervisors</div>
          </div>

          {/* Card 4: Consultancy Projects */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.consultancy_project_total, (v) => formatCurrency(v).replace('₹', '') + (v >= 10000000 || v >= 100000 ? '' : '+'))}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Consultancy<br/>Projects</div>
          </div>

          {/* Card 5: PhD Holders (Circular Badge effect inside card) */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="w-16 h-16 rounded-full border border-dashed border-[#FDB813] p-0.5 mb-2 relative">
               <div className="w-full h-full bg-gradient-to-br from-[#FDB813] to-[#f59e0b] rounded-full flex flex-col items-center justify-center shadow-lg">
                 <div className="text-xl font-black text-[#0A3D8F] tracking-tighter leading-none">{getValue(liv.faculty_phd_percent ?? 45, (v) => `${v}%`)}</div>
               </div>
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#FDB813]">PhD<br/>Holders</div>
          </div>

          {/* Card 6: AU Scholars */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.au_research_scholars_count)}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">AU Research<br/>Scholars</div>
          </div>

          {/* Card 7: Seed Fund Grants */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.seed_fund_grants_total, (v) => formatCurrency(v).replace('₹', '') + (v >= 10000000 || v >= 100000 ? '' : '+'))}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Seed Fund<br/>Grants</div>
          </div>

          {/* Card 8: Incentives */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.incentives_total, (v) => formatCurrency(v).replace('₹', '') + (v >= 10000000 || v >= 100000 ? '' : '+'))}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Incentives<br/>Sanctioned</div>
          </div>

          {/* Card 9: Project Grants */}
          <div className="flex flex-col items-center justify-center text-center group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-md rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="text-3xl font-black tracking-tighter mb-1 text-white group-hover:scale-105 transition-transform duration-300">
              {getValue(liv.project_grants_total, (v) => formatCurrency(v).replace('₹', '') + (v >= 10000000 || v >= 100000 ? '' : '+'))}
            </div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-blue-200/80">Project<br/>Grants</div>
          </div>

        </div>
      </div>
    </div>
  )
}
