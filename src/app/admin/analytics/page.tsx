'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/context/AdminAuthContext'
import { useTheme } from 'next-themes'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import {
  Loader2, Filter, Home, Award, Users, BookOpen, Briefcase, Zap, TrendingUp, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B', '#06B6D4', '#3B82F6', '#14B8A6']

const MotionCard = motion.div

export default function AnalyticsDashboard() {
  const router = useRouter()
  const { token, loading: authLoading } = useAdminAuth()
  const { resolvedTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Filters & Tabs
  const [yearFilter, setYearFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    if (!token) return
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (yearFilter) params.append('year', yearFilter)
        if (deptFilter) params.append('department', deptFilter)
        
        const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const result = await res.json()
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [token, yearFilter, deptFilter])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <span className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-widest animate-pulse">LOADING ANALYTICS...</span>
        </div>
      </div>
    )
  }

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 gap-3 py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
        <Filter className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No data available</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
      </div>
    </div>
  )

  const formatCurrency = (val: number) => {
    if (!val) return '₹0'
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const formatCurrencyAxis = (val: any) => {
    if (!val) return '₹0'
    if (val >= 10000000) return `₹${parseFloat((val / 10000000).toFixed(2))}Cr`
    if (val >= 100000) return `₹${parseFloat((val / 100000).toFixed(2))}L`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const getTotal = (dataArr: any[]) => dataArr?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-1.5 min-w-[160px] text-slate-800 dark:text-white">
          <p className="font-extrabold text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2 mb-1 uppercase tracking-wider">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {(() => {
                  const isCurrency = entry.name?.includes('Amount') || entry.name?.includes('₹')
                  if (isCurrency && typeof entry.value === 'number') {
                    return formatCurrency(entry.value)
                  }
                  return entry.value
                })()}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
  }

  // Derived KPI Counts
  const totalScopus = getTotal(data?.scopus?.byDept)
  const totalSci = getTotal(data?.sciPublications?.byDept)
  const totalPatents = getTotal(data?.patents?.byDept)
  const totalGrants = getTotal(data?.projectGrants?.byYear)
  const totalConsultancy = getTotal(data?.consultancies?.byDept)
  const totalPhds = getTotal(data?.phds?.byDept)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'publications', label: 'Publications & Patents' },
    { id: 'funding', label: 'Funding & Grants' },
    { id: 'talent', label: 'Talent & Scholars' }
  ]

  // Dynamic grid lines based on theme
  const gridStrokeColor = isDark ? '#1e293b' : '#e2e8f0'
  const textLabelColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] pb-24 font-sans text-slate-800 dark:text-slate-100 selection:bg-indigo-500/30 transition-colors duration-200">
      
      {/* Header Section with Aurora Gradient Effect */}
      <div className="relative pt-8 pb-32 px-6 lg:px-12 overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-800 to-violet-900 border-b border-blue-950 dark:border-slate-900">
        <div className="absolute top-0 right-0 w-[40rem] h-[25rem] bg-white/5 dark:bg-indigo-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute top-1/4 left-10 w-[30rem] h-[20rem] bg-blue-400/10 dark:bg-violet-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-200/80 mb-3 text-xs font-semibold uppercase tracking-wider">
              <Link href="/admin/reports" className="flex items-center gap-1 hover:text-white transition-colors">
                <Home className="w-3.5 h-3.5" /> Admin Portal
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-blue-300/60" />
              <span className="text-white">Analytics</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight mb-2">
              Research Intelligence
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              Deep dive into real-time metrics, interactive visualizations, and comprehensive analysis across all 10 modules.
            </p>
          </div>

          {/* Filters - Glassmorphism */}
          <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800/80 p-2 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 border-r border-white/10 dark:border-slate-800 text-white/90 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
            </div>
            
            <select 
              value={yearFilter} 
              onChange={e => setYearFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/10 dark:hover:bg-slate-800 transition-colors"
            >
              <option value="" className="text-slate-800 bg-white dark:bg-slate-950 dark:text-slate-300">All Years</option>
              {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y} className="text-slate-800 bg-white dark:bg-slate-950 dark:text-slate-300">{y}</option>
              ))}
            </select>
            
            <select 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1.5 px-3 rounded-xl hover:bg-white/10 dark:hover:bg-slate-800 transition-colors"
            >
              <option value="" className="text-slate-800 bg-white dark:bg-slate-950 dark:text-slate-300">All Depts</option>
              {['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AI-DS', 'AI-ML', 'CSBS', 'S&H'].map(d => (
                <option key={d} value={d} className="text-slate-800 bg-white dark:bg-slate-950 dark:text-slate-300">{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 -mt-20 relative z-20">
        
        {/* KPI Mini Grid */}
        <motion.div 
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8"
        >
          {[
            { label: 'Scopus Pubs', val: totalScopus.toLocaleString(), icon: BookOpen, color: 'from-blue-500/10 to-indigo-500/5 hover:border-blue-500/50 bg-white dark:bg-transparent', iconColor: 'text-blue-500 dark:text-blue-400' },
            { label: 'SCI Pubs', val: totalSci.toLocaleString(), icon: BookOpen, color: 'from-violet-500/10 to-purple-500/5 hover:border-purple-500/50 bg-white dark:bg-transparent', iconColor: 'text-purple-500 dark:text-purple-400' },
            { label: 'Patents', val: totalPatents.toLocaleString(), icon: Award, color: 'from-fuchsia-500/10 to-pink-500/5 hover:border-pink-500/50 bg-white dark:bg-transparent', iconColor: 'text-pink-500 dark:text-pink-400' },
            { label: 'Research Grants', val: formatCurrency(totalGrants), icon: TrendingUp, color: 'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/50 bg-white dark:bg-transparent', iconColor: 'text-emerald-500 dark:text-emerald-400' },
            { label: 'Consultancy', val: formatCurrency(totalConsultancy), icon: Briefcase, color: 'from-cyan-500/10 to-blue-500/5 hover:border-cyan-500/50 bg-white dark:bg-transparent', iconColor: 'text-cyan-500 dark:text-cyan-400' },
            { label: 'PhD Faculty', val: totalPhds.toLocaleString(), icon: Users, color: 'from-pink-500/10 to-rose-500/5 hover:border-rose-500/50 bg-white dark:bg-transparent', iconColor: 'text-rose-500 dark:text-rose-400' },
          ].map((kpi, idx) => (
            <MotionCard 
              key={idx}
              variants={itemVariants} 
              whileHover={{ y: -3, scale: 1.02 }}
              className={`bg-gradient-to-br ${kpi.color} border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-lg dark:shadow-xl dark:shadow-black/10 flex flex-col justify-between transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              </div>
              <p className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono">{kpi.val}</p>
            </MotionCard>
          ))}
        </motion.div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800/80 gap-6 mb-8 overflow-x-auto custom-scrollbar whitespace-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-semibold tracking-wide relative transition-colors ${activeTab === tab.id ? 'text-[#0A3D8F] dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-[#0A3D8F] dark:bg-indigo-500"
                />
              )}
            </button>
          ))}
        </div>

        {/* Charts Grid */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {activeTab === 'overview' && (
              <>
                {/* Scopus Publications */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Scopus Publications &middot; Total: {totalScopus.toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Total publications per department</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.scopus?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.scopus.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(99, 102, 241, 0.03)' : 'rgba(99, 102, 241, 0.05)'}} />
                          <Bar dataKey="value" name="Publications" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.scopus.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Project Grants */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-855 dark:text-white">Project Grants &middot; Total: {formatCurrency(totalGrants)}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Research funding growth trends</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.projectGrants?.byYear?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.projectGrants.byYear} margin={{top:15, right:15, left:10, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tickFormatter={formatCurrencyAxis} tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="value" name="Amount (₹)" stroke="#10B981" strokeWidth={3} dot={{r: 4, fill: isDark ? '#090D16' : '#fff', strokeWidth: 2, stroke: '#10B981'}} activeDot={{r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>
              </>
            )}

            {activeTab === 'publications' && (
              <>
                {/* Scopus Publications */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Scopus Publications &middot; Total: {totalScopus.toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Scopus index publications by department</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.scopus?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.scopus.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(99, 102, 241, 0.03)' : 'rgba(99, 102, 241, 0.05)'}} />
                          <Bar dataKey="value" name="Publications" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.scopus.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* SCI Publications */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">SCI Publications &middot; Total: {totalSci.toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">SCI-indexed publications per department</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <BookOpen className="w-4 h-4 text-violet-550 dark:text-violet-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.sciPublications?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.sciPublications.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(139, 92, 246, 0.03)' : 'rgba(139, 92, 246, 0.05)'}} />
                          <Bar dataKey="value" name="SCI Publications" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.sciPublications.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Patents Published */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px] lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Patents Published &middot; Total: {totalPatents.toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Approved & filed patents across departments</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                      <Award className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.patents?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.patents.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(236, 72, 153, 0.03)' : 'rgba(236, 72, 153, 0.05)'}} />
                          <Bar dataKey="value" name="Patents" fill="#EC4899" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.patents.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>
              </>
            )}

            {activeTab === 'funding' && (
              <>
                {/* Project Grants */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Project Grants &middot; Total: {formatCurrency(totalGrants)}</h2>
                      <p className="text-xs font-semibold text-slate-455 dark:text-slate-500 mt-0.5">Research funding growth trends</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <TrendingUp className="w-4 h-4 text-blue-550 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.projectGrants?.byYear?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.projectGrants.byYear} margin={{top:15, right:15, left:10, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tickFormatter={formatCurrencyAxis} tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="value" name="Amount (₹)" stroke="#3B82F6" strokeWidth={3} dot={{r: 4, fill: isDark ? '#090D16' : '#fff', strokeWidth: 2, stroke: '#3B82F6'}} activeDot={{r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Consultancy Projects */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Consultancy Revenue &middot; Total: {formatCurrency(totalConsultancy)}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">External consultancy revenue by department</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                      <Briefcase className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.consultancies?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.consultancies.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tickFormatter={formatCurrencyAxis} tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(6, 182, 212, 0.03)' : 'rgba(6, 182, 212, 0.05)'}} />
                          <Bar dataKey="value" name="Amount (₹)" fill="#06B6D4" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" formatter={formatCurrencyAxis} style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Seed Fund Grants */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Seed Fund Grants &middot; Total: {formatCurrency(getTotal(data?.seedFunds?.byDept))}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Internal funding distribution by department</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Briefcase className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.seedFunds?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.seedFunds.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tickFormatter={formatCurrencyAxis} tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(245, 158, 11, 0.03)' : 'rgba(245, 158, 11, 0.05)'}} />
                          <Bar dataKey="value" name="Amount (₹)" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" formatter={formatCurrencyAxis} style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Incentives Sanctioned */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Incentives Sanctioned &middot; Total: {formatCurrency(getTotal(data?.incentives?.byYear))}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Financial incentives granted over time</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <Zap className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.incentives?.byYear?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.incentives.byYear} margin={{top:15, right:15, left:10, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tickFormatter={formatCurrencyAxis} tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="value" name="Amount (₹)" stroke="#8B5CF6" strokeWidth={3} dot={{r: 4, fill: isDark ? '#090D16' : '#fff', strokeWidth: 2, stroke: '#8B5CF6'}} activeDot={{r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2}} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>
              </>
            )}

            {activeTab === 'talent' && (
              <>
                {/* Research Supervisors */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Research Supervisors &middot; Total: {getTotal(data?.supervisors?.byDept).toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Supervisors across departments</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.supervisors?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.supervisors.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(59, 130, 246, 0.03)' : 'rgba(59, 130, 246, 0.05)'}} />
                          <Bar dataKey="value" name="Supervisors" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.supervisors.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* Research Scholars */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">Research Scholars &middot; Total: {getTotal(data?.scholars?.byDept).toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Scholars across departments</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.scholars?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.scholars.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(16, 185, 129, 0.03)' : 'rgba(16, 185, 129, 0.05)'}} />
                          <Bar dataKey="value" name="Scholars" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.scholars.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>

                {/* PhD Holders */}
                <MotionCard className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-slate-800/50 flex flex-col h-[400px] lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-850 dark:text-white">PhD Holders Distribution &middot; Total: {totalPhds.toLocaleString('en-IN')}</h2>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">Faculty with doctorates across departments</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                      <Users className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                    </div>
                  </div>
                  <div className="flex-1 w-full min-h-0">
                    {data?.phds?.byDept?.some((d: any) => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.phds.byDept} margin={{top:10, right:0, left:0, bottom:0}}>
                          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridStrokeColor} />
                          <XAxis dataKey="name" interval={0} tick={{fontSize: 9, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} dy={8} />
                          <YAxis tick={{fontSize: 10, fill: textLabelColor, fontWeight: 600}} axisLine={false} tickLine={false} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{fill: isDark ? 'rgba(236, 72, 153, 0.03)' : 'rgba(236, 72, 153, 0.05)'}} />
                          <Bar dataKey="value" name="PhD Holders" fill="#EC4899" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: isDark ? '#94a3b8' : '#475569', fontWeight: 700 }} />
                            {data.phds.byDept.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState />}
                  </div>
                </MotionCard>
              </>
            )}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
