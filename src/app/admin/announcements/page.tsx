'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/uploadFile'
import {
  X, FileText, Plus, Trash2, Edit, Loader2, Megaphone,
  BookOpen, CalendarDays, Clock, Coins, Bell, Archive, Download, Image as ImageIcon, UserCog, Check, X as CloseIcon
} from 'lucide-react'

const CATEGORIES = [
  { key: 'workshops',            label: 'Workshops',             Icon: BookOpen,     color: 'from-blue-600 to-blue-800',       gradient: 'from-[#1a6cf5] via-[#2563eb] to-[#1d4ed8]', glow: 'shadow-blue-500/40' },
  { key: 'seminars',             label: 'Seminars',              Icon: FileText,     color: 'from-indigo-600 to-indigo-800',   gradient: 'from-[#5b21b6] via-[#6d28d9] to-[#4c1d95]', glow: 'shadow-violet-500/40' },
  { key: 'events',               label: 'Events',                Icon: CalendarDays, color: 'from-violet-600 to-violet-800',   gradient: 'from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9]', glow: 'shadow-purple-500/40' },
  { key: 'deadlines',            label: 'Deadlines',             Icon: Clock,        color: 'from-red-600 to-red-800',         gradient: 'from-[#dc2626] via-[#ef4444] to-[#b91c1c]', glow: 'shadow-red-500/40' },
  { key: 'funding_opportunities',label: 'Funding Opportunities', Icon: Coins,        color: 'from-emerald-600 to-emerald-800', gradient: 'from-[#047857] via-[#059669] to-[#065f46]', glow: 'shadow-emerald-500/40' },
  { key: 'general_notices',      label: 'General Notices',       Icon: Bell,         color: 'from-amber-600 to-amber-800',     gradient: 'from-[#d97706] via-[#f59e0b] to-[#b45309]', glow: 'shadow-amber-500/40' },
  { key: 'cfrd_circular',        label: 'CFRD Circular',         Icon: Megaphone,    color: 'from-fuchsia-600 to-fuchsia-800', gradient: 'from-[#c026d3] via-[#d946ef] to-[#a21caf]', glow: 'shadow-fuchsia-500/40' },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c.label])
)

const emptyForm = {
  id: '',
  category: 'workshops',
  title: '',
  body: '',
  event_date: '',
  start_date: '',
  registration_end_date: '',
  poster_url: '',
  is_active: true,
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  
  const [profileRequests, setProfileRequests] = useState<any[]>([])
  const [showProfilePopover, setShowProfilePopover] = useState(false)
  const [profileRejectingId, setProfileRejectingId] = useState<string | null>(null)
  const [profileRejectReason, setProfileRejectReason] = useState('')
  const [profileActionLoading, setProfileActionLoading] = useState<string | null>(null)

  const fetchProfileRequests = useCallback(async (tok: string) => {
    try {
      const res = await fetch('/api/admin/profile-edit-requests?status=pending', { headers: { Authorization: `Bearer ${tok}` } })
      if (res.ok) {
        const json = await res.json()
        setProfileRequests(json.data || [])
      }
    } catch (e) { console.error(e) }
  }, [])

  const handleApproveProfile = async (id: string) => {
    if (!token || profileActionLoading) return
    setProfileActionLoading(id)
    try {
      const res = await fetch(`/api/admin/profile-edit-requests/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setProfileRequests(prev => prev.filter(req => req.id !== id))
    } finally { setProfileActionLoading(null) }
  }

  const handleRejectProfile = async (id: string) => {
    if (!token || profileActionLoading || !profileRejectReason.trim()) return
    setProfileActionLoading(id)
    try {
      const res = await fetch(`/api/admin/profile-edit-requests/${id}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: profileRejectReason }) })
      if (res.ok) { setProfileRequests(prev => prev.filter(req => req.id !== id)); setProfileRejectingId(null); setProfileRejectReason(''); }
    } finally { setProfileActionLoading(null) }
  }

  const [announcements, setAnnouncements] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'ending_soon'>('all')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)

  // Get session token once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
    })
  }, [router])

  const fetchAnnouncements = useCallback(async (tok: string) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        headers: { Authorization: `Bearer ${tok}` },
        cache: 'no-store'
      })
      if (!res.ok) { router.replace('/admin/login'); return }
      const { data } = await res.json()
      setAnnouncements(data || [])

      // Compute counts (active only per category)
      const c: Record<string, number> = {}
      CATEGORIES.forEach(cat => {
        c[cat.key] = (data || []).filter((a: any) => a.category === cat.key && a.is_active).length
      })
      setCounts(c)
    } catch (err) {
      console.error(err)
    }
  }, [router])

  useEffect(() => {
    if (!token) return
    fetchAnnouncements(token).finally(() => setLoading(false))
    fetchProfileRequests(token)
  }, [token, fetchAnnouncements])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    // Logical Date Validations
    if (form.registration_end_date && form.event_date) {
      if (new Date(form.registration_end_date) > new Date(form.event_date)) {
        alert("Registration End Date cannot be after the Event Date.")
        return
      }
    }
    if (form.start_date && form.event_date) {
      if (new Date(form.start_date) > new Date(form.event_date)) {
        alert("Start Date cannot be after the Event Date.")
        return
      }
    }
    if (form.start_date && form.registration_end_date) {
      if (new Date(form.start_date) > new Date(form.registration_end_date)) {
        alert("Start Date cannot be after the Registration End Date.")
        return
      }
    }

    setSaving(true)
    try {
      const isEdit = !!form.id
      const url = isEdit ? `/api/admin/announcements/${form.id}` : '/api/admin/announcements'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload = { ...form }
      if (isEdit) delete (payload as any).id
      
      // Nullify empty strings for dates
      if (!payload.event_date) payload.event_date = null as any
      if (!payload.start_date) payload.start_date = null as any
      if (!payload.registration_end_date) payload.registration_end_date = null as any

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save announcement')

      await fetchAnnouncements(token)
      alert(isEdit ? 'Announcement updated successfully!' : 'Announcement created successfully!')
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Error saving announcement.')
    } finally {
      setSaving(false)
    }
  }

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeMB = file.size / (1024 * 1024)
    const sizeStr = `${sizeMB.toFixed(2)} MB`
    if (file.size > 1 * 1024 * 1024) {
      alert(`File is ${sizeStr} — must be under 1MB. Please compress and try again.`)
      e.target.value = ''
      return
    }

    setUploadingPoster(true)
    try {
      const url = await uploadFile(file, 'posters')
      setForm({ ...form, poster_url: url })
    } catch (err) {
      console.error(err)
      alert('Failed to upload poster')
    } finally {
      setUploadingPoster(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!token) return
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      await fetchAnnouncements(token)
    } catch (err) {
      console.error(err)
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!token) return
    if (!confirm('Are you sure you want to permanently delete this announcement?')) return
    try {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      await fetchAnnouncements(token)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  )

  const filteredAnnouncements = announcements.filter(a => {
    // 1. Category filter
    if (activeCategory && a.category !== activeCategory) return false

    // 2. Status filter
    if (statusFilter === 'active' && !a.is_active) return false
    if (statusFilter === 'archived' && a.is_active) return false
    if (statusFilter === 'ending_soon') {
      if (!a.is_active) return false
      // Consider ending soon if registration or event is within next 7 days
      const now = new Date()
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      let isEnding = false
      if (a.registration_end_date) {
        const regDate = new Date(a.registration_end_date)
        if (regDate >= now && regDate <= in7Days) isEnding = true
      } else if (a.event_date) {
        const evDate = new Date(a.event_date)
        if (evDate >= now && evDate <= in7Days) isEnding = true
      }
      if (!isEnding) return false
    }

    return true
  })

  return (
    <div className="w-full">
      <main className="flex-1 w-full w-full mx-auto pb-12">
        <div className="px-4 sm:px-6 pt-8 pb-4">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Announcements</h1>
              <p className="text-slate-500 font-medium mt-1">Manage portal announcements by category</p>
            </div>
            
            <div className="flex items-center gap-3 relative">
              <div className="relative">
                <button 
                  onClick={() => setShowProfilePopover(!showProfilePopover)}
                  className="relative p-2.5 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm hover:shadow border border-slate-200 transition-all"
                >
                  <UserCog className="w-5 h-5" />
                  {profileRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                      {profileRequests.length}
                    </span>
                  )}
                </button>
                {showProfilePopover && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#ffffff] rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-[#f8fafc] px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-[#1e293b] text-sm">Profile Updates</h3>
                      <button onClick={() => setShowProfilePopover(false)} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-4 h-4"/></button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {profileRequests.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 dark:text-[#64748b] text-sm">No pending requests.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {profileRequests.map(req => (
                            <div key={req.id} className="p-4 text-sm">
                              <div className="font-bold text-slate-800 dark:text-[#1e293b]">{req.faculty_name || req.master_faculty?.employee_name} <span className="font-normal text-slate-500 dark:text-[#64748b]">({req.emp_id})</span></div>
                              <div className="text-xs text-slate-500 dark:text-[#64748b] mt-1 mb-3">
                                {Object.entries(req.requested_changes).map(([k,v]) => `${k}: ${v}`).join(', ')}
                              </div>
                              {profileRejectingId === req.id ? (
                                <div className="flex flex-col gap-2">
                                  <input type="text" placeholder="Reason for rejection..." value={profileRejectReason} onChange={e => setProfileRejectReason(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-300" />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setProfileRejectingId(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                    <button onClick={() => handleRejectProfile(req.id)} disabled={profileActionLoading === req.id || !profileRejectReason.trim()} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded px-2 py-1 disabled:opacity-50">Confirm</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => handleApproveProfile(req.id)} disabled={profileActionLoading === req.id} className="flex-1 text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg py-1.5 transition-colors disabled:opacity-50">Approve</button>
                                  <button onClick={() => setProfileRejectingId(req.id)} disabled={profileActionLoading === req.id} className="flex-1 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-1.5 transition-colors disabled:opacity-50">Reject</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-[#f8fafc] border-t border-slate-100 text-center">
                      <a href="/admin/profile-requests" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">View all requests →</a>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/admin/funding-agencies"
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-[#0A3D8F] px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
              >
                <BookOpen className="w-5 h-5" /> Funding Agencies
              </Link>

              <button 
                onClick={() => { setForm({ ...emptyForm, category: activeCategory || 'workshops' }); setModalOpen(true) }}
                className="flex items-center gap-2 bg-[#0A3D8F] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md"
              >
                <Plus className="w-5 h-5" /> New Announcement
              </button>
            </div>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.Icon
              const isActive = activeCategory === cat.key
              const count = counts[cat.key] ?? 0
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(isActive ? null : cat.key)}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`
                      group relative flex flex-col justify-between
                      h-24 lg:h-28 p-3 rounded-2xl text-white text-left
                      bg-gradient-to-br ${cat.gradient || cat.color}
                      shadow-md ${cat.glow || 'shadow-black/10'}
                      overflow-hidden transition-all duration-300
                      ${isActive
                        ? 'scale-105 ring-2 ring-white ring-offset-2 ring-offset-blue-50 shadow-lg'
                        : 'hover:scale-[1.03] hover:shadow-lg hover:shadow-black/10 opacity-90 hover:opacity-100'
                      }
                    `}
                  >
                    <Icon
                      className="absolute -bottom-3 -right-3 text-white/10 group-hover:text-white/20 transition-all duration-500"
                      style={{ width: '80px', height: '80px' }}
                    />
                    <div className="flex flex-col justify-between h-full z-10">
                      <div className="flex items-start justify-between">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/10 shadow-inner group-hover:bg-white/30 transition-all">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xl lg:text-2xl font-black leading-none tracking-tight drop-shadow-md">{count}</div>
                          <div className="text-[8px] uppercase tracking-widest font-bold opacity-80 mt-0.5">active</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-xs lg:text-sm leading-tight tracking-tight drop-shadow-sm line-clamp-2">
                          {cat.label}
                        </div>
                        {isActive && (
                          <div className="text-[9px] font-semibold mt-1 opacity-90 flex items-center gap-1 animate-fade-in">
                            <div className="w-1 h-1 rounded-full bg-white animate-pulse shadow-sm" />
                            Filtering
                          </div>
                        )}
                      </div>
                    </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-black text-[#0A3D8F] shrink-0">
              {activeCategory ? `${CATEGORY_LABELS[activeCategory]} Announcements` : 'All Announcements'}
            </h2>
            <div className="h-px bg-blue-100 flex-1 hidden sm:block"></div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0 hide-scrollbar w-full sm:w-auto">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="ending_soon">Ending Soon</option>
                <option value="archived">Archived</option>
              </select>

              {activeCategory && (
                <button 
                  onClick={() => setActiveCategory(null)}
                  className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-4 py-2 rounded-xl transition-colors shadow-sm shrink-0"
                >
                  <X className="w-4 h-4" /> Clear Category
                </button>
              )}
            </div>
          </div>

          {filteredAnnouncements.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-20 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 shadow-sm border border-slate-200/50">
                  <Megaphone className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Announcements Found</h3>
                <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">
                  There are currently no announcements matching your filters. Create a new one to keep everyone informed.
                </p>
                <button onClick={() => { setForm({ ...emptyForm, category: activeCategory || 'workshops' }); setModalOpen(true) }} className="px-5 py-2.5 bg-[#0A3D8F]/5 text-[#0A3D8F] hover:bg-[#0A3D8F]/10 font-bold rounded-xl transition-colors border border-[#0A3D8F]/10 shadow-sm">
                  Create Announcement
                </button>
              </div>
          ) : (
              <div className="flex flex-col gap-4">
                {/* Table Header (Desktop Only) */}
                <div className="hidden lg:grid grid-cols-[140px_minmax(200px,2fr)_minmax(140px,1fr)_100px_90px_120px] gap-4 px-6 py-4 bg-slate-50 dark:bg-[#f8fafc] border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 dark:text-[#64748b] uppercase tracking-wider items-center shadow-sm">
                  <div>Category</div>
                  <div>Announcement</div>
                  <div>Important Dates</div>
                  <div>Status</div>
                  <div>Poster</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows / Mobile Cards */}
                <div className="flex flex-col gap-3">
                  {filteredAnnouncements.map(a => {
                    const catInfo = CATEGORIES.find(c => c.key === a.category)
                    const Icon = catInfo?.Icon || Bell
                    return (
                      <div
                        key={a.id}
                        className={`group relative bg-white dark:bg-[#ffffff] rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden lg:grid lg:grid-cols-[140px_minmax(200px,2fr)_minmax(140px,1fr)_100px_90px_120px] lg:items-center gap-4 p-5 lg:px-6 lg:py-4 ${!a.is_active && 'opacity-80 grayscale-[0.2]'}`}
                      >
                        {/* Category */}
                        <div className="mb-3 lg:mb-0 flex items-center">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r ${catInfo?.gradient || catInfo?.color || 'from-slate-400 to-slate-600'} shadow-sm`}>
                            <Icon className="w-3.5 h-3.5" />
                            {CATEGORY_LABELS[a.category]}
                          </div>
                        </div>

                        {/* Title & Body */}
                        <div className="mb-3 lg:mb-0 flex flex-col gap-1.5 min-w-0">
                          <h3 className="font-bold text-slate-800 dark:text-[#1e293b] text-sm lg:text-base leading-snug group-hover:text-[#0A3D8F] dark:group-hover:text-[#0A3D8F] transition-colors pr-2">
                            {a.title}
                          </h3>
                          {a.body && (
                            <p className="text-slate-500 dark:text-[#64748b] text-xs line-clamp-1 truncate max-w-full" title={a.body}>
                              {a.body}
                            </p>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="mb-4 lg:mb-0 flex flex-wrap gap-1.5 lg:flex-col lg:gap-1.5">
                          {a.start_date && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-[#475569] bg-slate-50 dark:bg-[#f8fafc] px-2 py-1 rounded-md border border-slate-100 whitespace-nowrap">
                              <span>🚀</span> {new Date(a.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                          {a.registration_end_date && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-[#475569] bg-slate-50 dark:bg-[#f8fafc] px-2 py-1 rounded-md border border-slate-100 whitespace-nowrap">
                              <span>📝</span> Reg: {new Date(a.registration_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                          {a.event_date && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-[#475569] bg-slate-50 dark:bg-[#f8fafc] px-2 py-1 rounded-md border border-slate-100 whitespace-nowrap">
                              <CalendarDays className="w-3 h-3 text-slate-400" /> {new Date(a.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                          {!(a.start_date || a.registration_end_date || a.event_date) && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>

                        {/* Status */}
                        <div className="mb-4 lg:mb-0 flex items-center">
                          {a.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" /> Archived
                            </span>
                          )}
                        </div>

                        {/* Poster */}
                        <div className="mb-4 lg:mb-0 flex items-center">
                          {a.poster_url ? (
                            <a href={a.poster_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#0A3D8F] bg-[#0A3D8F]/5 hover:bg-[#0A3D8F]/10 px-2 py-1.5 rounded-lg transition-colors border border-[#0A3D8F]/10">
                              <Download className="w-3.5 h-3.5" /> View
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 lg:justify-end border-t border-slate-100 lg:border-t-0 pt-3 lg:pt-0 mt-2 lg:mt-0">
                          <button onClick={() => toggleStatus(a.id, a.is_active)} title={a.is_active ? 'Archive' : 'Publish'} className={`p-1.5 rounded-lg transition-all hover:scale-110 shadow-sm ${a.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/50'}`}>
                            {a.is_active ? <Archive className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setForm({ ...a, event_date: a.event_date || '', start_date: a.start_date || '', registration_end_date: a.registration_end_date || '', poster_url: a.poster_url || '' }); setModalOpen(true) }} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/50 rounded-lg transition-all hover:scale-110 shadow-sm">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/50 rounded-lg transition-all hover:scale-110 shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

      {/* Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50 shrink-0">
              <h3 className="font-bold text-slate-800">{form.id ? 'Edit' : 'Create'} Announcement</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form id="announcement-form" onSubmit={handleSave} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      required
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                    <input
                      type="text" required
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Call for Papers 2024"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Body</label>
                  <textarea
                    required rows={4}
                    value={form.body}
                    onChange={e => setForm({ ...form, body: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide detailed description..."
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={form.start_date || ''}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Registration End (Optional)</label>
                    <input
                      type="date"
                      value={form.registration_end_date || ''}
                      onChange={e => setForm({ ...form, registration_end_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Event Date (Optional)</label>
                    <input
                      type="date"
                      value={form.event_date || ''}
                      onChange={e => setForm({ ...form, event_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Poster / Circular (Optional)</label>
                  
                  {form.poster_url ? (
                    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">Current Poster attached</span>
                      </div>
                      <button type="button" onClick={() => setForm({ ...form, poster_url: '' })} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md text-sm font-bold transition-colors">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingPoster ? 'bg-slate-100 border-slate-300' : 'bg-white border-blue-200 hover:bg-blue-50'}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingPoster ? (
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-blue-400 mb-2" />
                        )}
                        <p className="text-sm text-slate-500 font-semibold">{uploadingPoster ? 'Uploading...' : 'Click to select PDF/Image'}</p>
                      </div>
                      <input type="file" className="hidden" accept=".pdf,image/*" onChange={handlePosterUpload} disabled={uploadingPoster} />
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-semibold text-slate-700">Publish immediately (Active)</span>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-blue-50 shrink-0 flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-colors">
                Cancel
              </button>
              <button type="submit" form="announcement-form" disabled={saving || uploadingPoster} className="flex-1 py-3 bg-[#0A3D8F] hover:bg-blue-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
