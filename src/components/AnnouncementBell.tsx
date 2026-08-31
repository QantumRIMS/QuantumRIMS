'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Bell, BookOpen, CalendarDays, Clock, Coins, FileText,
  X, Megaphone, ArrowRight
} from 'lucide-react'

const CATEGORIES = [
  { key: 'workshops',             label: 'Workshops',             Icon: BookOpen,     bgClass: 'bg-blue-500' },
  { key: 'seminars',              label: 'Seminars',              Icon: FileText,     bgClass: 'bg-indigo-500' },
  { key: 'events',                label: 'Events',                Icon: CalendarDays, bgClass: 'bg-violet-500' },
  { key: 'deadlines',             label: 'Deadlines',             Icon: Clock,        bgClass: 'bg-red-500' },
  { key: 'funding_opportunities', label: 'Funding Opportunities', Icon: Coins,        bgClass: 'bg-emerald-500' },
  { key: 'general_notices',       label: 'General Notices',       Icon: Bell,         bgClass: 'bg-amber-500' },
]

interface Announcement {
  id: string
  category: string
  title: string
  body: string
  event_date: string | null
  created_at: string
}

export function AnnouncementBell({ session }: { session: any }) {
  const [open, setOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [hasNew, setHasNew] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        // Fetch active announcements
        const res = await fetch('/api/announcements')
        if (!res.ok) return
        const { data } = await res.json()
        if (!mounted) return
        setAnnouncements(data || [])

        // Check read-receipt from supabase directly (authenticated user)
        if (session?.user?.id && data?.length > 0) {
          const { data: readRow } = await supabase
            .from('announcement_reads')
            .select('last_seen_at')
            .eq('user_id', session.user.id)
            .single()

          if (!readRow) {
            // Never opened — definitely new
            setHasNew(true)
          } else {
            const lastSeen = new Date(readRow.last_seen_at)
            const newestAnn = new Date(data[0].created_at) // already sorted desc
            setHasNew(newestAnn > lastSeen)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoaded(true)
      }
    }
    load()
    return () => { mounted = false }
  }, [session])

  const handleOpen = async () => {
    setOpen(true)
    if (hasNew && session?.user?.id) {
      setHasNew(false) // optimistic
      try {
        const { error } = await supabase
          .from('announcement_reads')
          .upsert({ user_id: session.user.id, last_seen_at: new Date().toISOString() })
        if (error) console.error('Error marking seen:', error)
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Announcements"
      >
        <Bell className={`w-5 h-5 ${hasNew && loaded ? 'animate-[pulse_1.5s_ease-in-out_infinite]' : ''}`} />
        {hasNew && loaded && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#FDB813] rounded-full animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_6px_rgba(253,184,19,0.8)]" />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute top-[92px] right-4 sm:right-6 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 100px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-[#0A3D8F] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#FDB813]" />
                <h3 className="font-bold text-base">Announcements</h3>
                {announcements.length > 0 && (
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{announcements.length}</span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {announcements.length === 0 ? (
                <div className="py-12 text-center">
                  <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium text-sm">No announcements yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {announcements.slice(0, 6).map(a => {
                    const cat = CATEGORIES.find(c => c.key === a.category)
                    const Icon = cat?.Icon || Bell
                    return (
                      <div key={a.id} className="px-5 py-4 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`shrink-0 w-8 h-8 rounded-lg ${cat?.bgClass || 'bg-slate-400'} flex items-center justify-center mt-0.5`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{cat?.label}</span>
                            <p className="font-bold text-slate-800 text-sm leading-snug">{a.title}</p>
                            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{a.body}</p>
                            {a.event_date && (
                              <div className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-blue-600">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(a.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {announcements.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-blue-50 shrink-0">
                <Link
                  href="/announcements"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full text-sm font-bold text-[#0A3D8F] hover:text-blue-700 py-1"
                >
                  View All Announcements <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
