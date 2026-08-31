'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Bell, BookOpen, CalendarDays, Clock, Coins, FileText,
  Megaphone, Download, X, Sparkles, ChevronRight, ExternalLink
} from 'lucide-react'

// Component for animating the number count-up
function CountUp({ targetValue, duration = 500 }: { targetValue: number, duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (targetValue === 0) {
      setCount(0)
      return
    }
    
    let startTimestamp: number | null = null
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(Math.floor(progress * targetValue))
      
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(targetValue)
      }
    }
    window.requestAnimationFrame(step)
  }, [targetValue, duration])

  return <span>{count}</span>
}

const CATEGORIES = [
  {
    key: 'workshops',
    label: 'Workshops',
    Icon: BookOpen,
    gradient: 'from-[#1a6cf5] via-[#2563eb] to-[#1d4ed8]',
    glow: 'shadow-blue-500/40',
    accent: '#60a5fa',
    dot: 'bg-blue-400',
  },
  {
    key: 'seminars',
    label: 'Seminars',
    Icon: FileText,
    gradient: 'from-[#5b21b6] via-[#6d28d9] to-[#4c1d95]',
    glow: 'shadow-violet-500/40',
    accent: '#a78bfa',
    dot: 'bg-violet-400',
  },
  {
    key: 'events',
    label: 'Events',
    Icon: CalendarDays,
    gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]',
    glow: 'shadow-purple-500/40',
    accent: '#c4b5fd',
    dot: 'bg-purple-400',
  },
  {
    key: 'deadlines',
    label: 'Deadlines',
    Icon: Clock,
    gradient: 'from-[#dc2626] via-[#ef4444] to-[#b91c1c]',
    glow: 'shadow-red-500/40',
    accent: '#fca5a5',
    dot: 'bg-red-400',
  },
  {
    key: 'funding_opportunities',
    label: 'Funding',
    Icon: Coins,
    gradient: 'from-[#047857] via-[#059669] to-[#065f46]',
    glow: 'shadow-emerald-500/40',
    accent: '#6ee7b7',
    dot: 'bg-emerald-400',
  },
  {
    key: 'general_notices',
    label: 'Notices',
    Icon: Bell,
    gradient: 'from-[#d97706] via-[#f59e0b] to-[#b45309]',
    glow: 'shadow-amber-500/40',
    accent: '#fcd34d',
    dot: 'bg-amber-400',
  },
  {
    key: 'cfrd_circular',
    label: 'CFRD Circular',
    Icon: Megaphone,
    gradient: 'from-[#c026d3] via-[#d946ef] to-[#a21caf]',
    glow: 'shadow-fuchsia-500/40',
    accent: '#f0abfc',
    dot: 'bg-fuchsia-400',
  },
]

// legacy color map for announcement feed cards
const COLOR_MAP: Record<string, string> = {
  workshops: 'from-blue-600 to-blue-800',
  seminars: 'from-indigo-600 to-indigo-800',
  events: 'from-violet-600 to-violet-800',
  deadlines: 'from-red-600 to-red-800',
  funding_opportunities: 'from-emerald-600 to-emerald-800',
  general_notices: 'from-amber-600 to-amber-800',
  cfrd_circular: 'from-fuchsia-600 to-fuchsia-800',
}

const CATEGORY_LABELS: Record<string, string> = {
  workshops: 'Workshops',
  seminars: 'Seminars',
  events: 'Events',
  deadlines: 'Deadlines',
  funding_opportunities: 'Funding Opportunities',
  general_notices: 'General Notices',
  cfrd_circular: 'CFRD Circular',
}

interface Announcement {
  id: string
  category: string
  title: string
  body: string
  event_date: string | null
  start_date: string | null
  registration_end_date: string | null
  registration_link: string | null
  poster_url: string | null
  funding_agency?: string | null
  created_at: string
}

export default function AnnouncementsOverviewPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/announcements', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (!res.ok) return
        const { data } = await res.json()
        if (!mounted) return

        setAnnouncements(data || [])

        const c: Record<string, number> = {}
        CATEGORIES.forEach(cat => {
          c[cat.key] = (data || []).filter((a: any) => a.category === cat.key).length
        })
        setCounts(c)

        if (data && data.length > 0) {
          const { data: readRow } = await supabase
            .from('announcement_reads')
            .select('last_seen_at')
            .eq('user_id', session.user.id)
            .single()

          let newItems = 0
          if (!readRow) {
            newItems = data.length
          } else {
            const lastSeen = new Date(readRow.last_seen_at)
            newItems = data.filter((a: any) => new Date(a.created_at) > lastSeen).length
          }
          setUnreadCount(newItems)

          if (newItems > 0) {
            await supabase
              .from('announcement_reads')
              .upsert({ user_id: session.user.id, last_seen_at: new Date().toISOString() })
            setUnreadCount(0)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  const filteredAnnouncements = activeCategory
    ? announcements.filter(a => a.category === activeCategory)
    : announcements.slice(0, 12)

  const activeCat = CATEGORIES.find(c => c.key === activeCategory)

  return (
    <div className="min-h-full pb-16 font-sans bg-slate-50">
      {/* Premium Page Header */}
      <div className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-[88px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A3D8F] to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  Announcements
                  {unreadCount > 0 && (
                    <span className="flex items-center gap-1 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg shadow-red-500/40 animate-pulse">
                      <Sparkles className="w-3 h-3" /> {unreadCount} New
                    </span>
                  )}
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5">
                  Stay updated with the latest news, events, and circulars
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Link 
                href="/funding-agencies"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors shadow-sm"
              >
                <BookOpen className="w-4 h-4" />
                Funding Agencies
              </Link>
            </div>
          </div>
          
          {/* Category Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-2 pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeCategory === null
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Updates
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeCategory === null ? 'bg-white/20' : 'bg-slate-200'}`}>
                {announcements.length}
              </span>
            </button>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.key;
              const Icon = cat.Icon;
              const count = counts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                    isActive
                      ? `bg-blue-50 border-blue-200 text-blue-700 shadow-sm`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {cat.label}
                  {count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0A3D8F] animate-spin" />
            </div>
            <p className="text-slate-400 font-semibold">Loading announcements…</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
              <Megaphone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-slate-700 font-black text-xl mb-1">No announcements found</h3>
            <p className="text-slate-500 font-medium text-sm text-center max-w-md">
              There are currently no updates in this category. Check back later or explore other categories.
            </p>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-colors"
              >
                View all announcements
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnouncements.map(a => {
              const catInfo = CATEGORIES.find(c => c.key === a.category)
              const Icon = catInfo?.Icon || Bell
              
              return (
                <div
                  key={a.id}
                  className="group relative bg-white rounded-3xl shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden border border-slate-100"
                >
                  {/* Subtle Gradient Top Border */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${catInfo?.gradient || 'from-slate-500 to-slate-700'}`} />

                  {/* Card Content Area */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    
                    {/* Header Row: Category Badge & Date */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm bg-gradient-to-br ${catInfo?.gradient || 'from-slate-500 to-slate-700'} text-white`}>
                        <Icon className="w-3.5 h-3.5" />
                        {CATEGORY_LABELS[a.category]}
                      </div>
                      <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                        {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-black text-slate-800 text-xl leading-tight group-hover:text-blue-600 transition-colors mb-3 line-clamp-2">
                      {a.title}
                    </h3>
                    
                    {a.category === 'funding_opportunities' && a.funding_agency && (
                      <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 w-fit">
                        Agency: <span className="font-black">{a.funding_agency}</span>
                      </div>
                    )}
                    
                    {/* Body */}
                    <p className="text-slate-500 text-[15px] leading-relaxed line-clamp-4 flex-1">
                      {a.body}
                    </p>

                    {/* Metadata tags (Dates) */}
                    {(a.start_date || a.registration_end_date || a.event_date) && (
                      <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-100/80">
                        {a.start_date && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Starts</span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
                              🚀 {new Date(a.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        {a.registration_end_date && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Reg. Closes</span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 rounded-xl px-3 py-1.5 border border-red-100">
                              ⏳ {new Date(a.registration_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                        {a.event_date && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Event Date</span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-xl px-3 py-1.5 border border-blue-100">
                              <CalendarDays className="w-3.5 h-3.5" /> {new Date(a.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {(a.poster_url || a.registration_link) && (
                      <div className="flex flex-col gap-3 mt-6">
                        {a.registration_link && (
                          <a href={a.registration_link} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-[#0A3D8F] bg-[#FDB813] rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:bg-yellow-400 hover:-translate-y-0.5 transition-all">
                            <ExternalLink className="w-4 h-4" /> Register Now
                          </a>
                        )}
                        {a.poster_url && (
                          <a href={a.poster_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:bg-slate-50 hover:-translate-y-0.5 transition-all">
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" /> View Attached Poster
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
