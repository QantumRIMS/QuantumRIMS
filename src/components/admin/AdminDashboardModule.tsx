'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/lib/useDebounce'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/context/AdminAuthContext'
import type { Submission } from '@/lib/types'
import {
  Download, Loader2, Search, Filter, CheckCircle, CheckCircle2, AlertCircle, Check, X, MessageSquareX, Edit3, IndianRupee, FileText, ChevronDown, ChevronUp, Star, ChevronRight, FlaskConical, Briefcase, BarChart3, Megaphone, ExternalLink, Globe, Link as LinkIcon, FolderOpen, FolderKanban, GraduationCap
} from 'lucide-react'
import Image from 'next/image'
import { PROJECT_DOCUMENT_CHECKLIST } from '@/lib/seedFundProjectDocs'

const LIMIT = 20

type TabStatus = 'pending' | 'approved' | 'rejected'
export type ModuleTab = 'submissions' | 'incentives' | 'applications' | 'ppts' | 'projectDocs' | 'consultancy' | 'projectGrants'

export default function AdminDashboardModule({ module }: { module: ModuleTab }) {
  const router = useRouter()
  const { session, token, loading: authLoading } = useAdminAuth()
  
  const activeModule = module
  const [activeTab, setActiveTab] = useState<TabStatus>('approved')

  const isSeedFundActive = activeModule === 'applications' || activeModule === 'ppts' || activeModule === 'projectDocs'
  const [seedFundExpanded, setSeedFundExpanded] = useState(isSeedFundActive)
  
  useEffect(() => {
    if (isSeedFundActive) setSeedFundExpanded(true)
  }, [isSeedFundActive])

  // Submissions State
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  
  // Incentives State
  const [incentives, setIncentives] = useState<any[]>([])

  // Consultancy State
  const [consultancies, setConsultancies] = useState<any[]>([])

  // Project Grants State
  const [projectGrantApps, setProjectGrantApps] = useState<any[]>([])

  // Final Applications State
  const [applications, setApplications] = useState<any[]>([])
  
  // PPT Submissions State
  const [ppts, setPpts] = useState<any[]>([])

  const [projectDocs, setProjectDocs] = useState<any[]>([])
  const [phdRequests, setPhdRequests] = useState<any[]>([])
  const [phdRequestsCount, setPhdRequestsCount] = useState<number>(0)
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)

  // Filters
  const [deptFilter, setDeptFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('')
  const [incYearFilter, setIncYearFilter] = useState('')
  const [incMonthFilter, setIncMonthFilter] = useState('')
  const [incDeptFilter, setIncDeptFilter] = useState('')
  const [incFacultyFilter, setIncFacultyFilter] = useState('')

  const debouncedDeptFilter = useDebounce(deptFilter, 300)
  const debouncedYearFilter = useDebounce(yearFilter, 300)
  const debouncedFacultyFilter = useDebounce(facultyFilter, 300)
  const debouncedIncYearFilter = useDebounce(incYearFilter, 300)
  const debouncedIncMonthFilter = useDebounce(incMonthFilter, 300)
  const debouncedIncDeptFilter = useDebounce(incDeptFilter, 300)
  const debouncedIncFacultyFilter = useDebounce(incFacultyFilter, 300)

  // Shared Action State
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [remark, setRemark] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleDownloadAll = async (docId: string) => {
    if (!session || downloadingDocId) return
    setDownloadingDocId(docId)
    try {
      const res = await fetch(`/api/admin/seed-fund-project-documents/${docId}/download-all`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to generate combined PDF. Please try again.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      a.download = match?.[1] || 'Project-Documents.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Download failed: ' + (err.message || 'Unknown error'))
    } finally {
      setDownloadingDocId(null)
    }
  }

  // Edit Incentive State
  const [editingIncentiveId, setEditingIncentiveId] = useState<string | null>(null)
  const [editIncentiveData, setEditIncentiveData] = useState<any>({})


  const fetchSubmissions = useCallback(async () => {
    if (!session || activeModule !== 'submissions') return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        status: activeTab,
        ...(debouncedDeptFilter && { dept: debouncedDeptFilter }),
        ...(debouncedYearFilter && { year: debouncedYearFilter }),
        ...(debouncedFacultyFilter && { faculty: debouncedFacultyFilter })
      })
      const res = await fetch(`/api/admin/submissions?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) {
        setSubmissions(json.data)
        setTotal(json.total)
      }
    } catch (error) {
      console.error('Error fetching submissions', error)
    } finally {
      setLoading(false)
    }
  }, [session, page, debouncedDeptFilter, debouncedYearFilter, debouncedFacultyFilter, activeTab, activeModule])

  const fetchIncentives = useCallback(async () => {
    if (!session || activeModule !== 'incentives') return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: activeTab,
        ...(debouncedIncYearFilter && { year: debouncedIncYearFilter }),
        ...(debouncedIncMonthFilter && { month: debouncedIncMonthFilter }),
        ...(debouncedIncDeptFilter && { dept: debouncedIncDeptFilter }),
        ...(debouncedIncFacultyFilter && { faculty: debouncedIncFacultyFilter })
      })
      const res = await fetch(`/api/admin/incentive-applications?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) {
        setIncentives(json.data)
      }
    } catch (error) {
      console.error('Error fetching incentives', error)
    } finally {
      setLoading(false)
    }
  }, [session, activeTab, activeModule, debouncedIncYearFilter, debouncedIncMonthFilter, debouncedIncDeptFilter, debouncedIncFacultyFilter])


  const fetchConsultancies = async () => {
    if (!session || activeModule !== 'consultancy') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/consultancy?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) setConsultancies(json.data)
    } catch (error) {
      console.error('Error fetching consultancies', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectGrants = async () => {
    if (!session || activeModule !== 'projectGrants') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/project-grants?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) setProjectGrantApps(json.data)
    } catch (error) {
      console.error('Error fetching project grants', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    if (!session || activeModule !== 'applications') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/seed-fund?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) setApplications(json.data)
    } catch (error) {
      console.error('Error fetching applications', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPpts = async () => {
    if (!session || activeModule !== 'ppts') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/seed-fund-ppt?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) setPpts(json)
    } catch (error) {
      console.error('Error fetching PPTs', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectDocs = async () => {
    if (!session || activeModule !== 'projectDocs') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/seed-fund-project-documents?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) setProjectDocs(json)
    } catch (error) {
      console.error('Error fetching Project Docs', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPhdRequests = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: activeTab })
      const res = await fetch(`/api/admin/phd-requests?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) {
        if ((activeModule as string) === 'phdRequests') {
          setPhdRequests(json.data)
        }
        if (activeTab === 'pending' || (activeModule as string) !== 'phdRequests') {
          const pendingRes = await fetch(`/api/admin/phd-requests?status=pending`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store'
          })
          if (pendingRes.ok) {
            const pendingJson = await pendingRes.json()
            setPhdRequestsCount(pendingJson.data.length)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching PhD requests', error)
    } finally {
      setLoading(false)
    }
  }, [session, activeTab, activeModule])

  useEffect(() => {
    if (session) {
      if (activeModule === 'submissions') fetchSubmissions()
      else if (activeModule === 'incentives') fetchIncentives()
      else if (activeModule === 'applications') fetchApplications()
      else if (activeModule === 'ppts') fetchPpts()
      else if (activeModule === 'projectDocs') fetchProjectDocs()
      else if (activeModule === 'consultancy') fetchConsultancies()
      else if (activeModule === 'projectGrants') fetchProjectGrants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fetchSubmissions, fetchIncentives, activeModule, activeTab])

  const handleExport = async () => {
    if (!session) return
    try {
      const params = new URLSearchParams({
        ...(debouncedDeptFilter && { dept: debouncedDeptFilter }),
        ...(debouncedYearFilter && { year: debouncedYearFilter })
      })
      const res = await fetch(`/api/admin/export?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Submissions_Export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting', error)
      alert('Failed to export data')
    }
  }

  const handleIncentivesExport = async () => {
    if (!session) return
    try {
      const params = new URLSearchParams({
        ...(debouncedIncYearFilter && { year: debouncedIncYearFilter }),
        ...(debouncedIncMonthFilter && { month: debouncedIncMonthFilter })
      })
      const res = await fetch(`/api/admin/incentive-applications/export?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Incentive_Applications_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting', error)
      alert('Failed to export data')
    }
  }

  const handleApproveSub = async (id: string) => {
    if (!session || actionLoading) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/submissions/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setSubmissions(s => s.filter(x => x.id !== id))
        setTotal(t => t - 1)
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleRejectSub = async (id: string) => {
    if (!session || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/submissions/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setSubmissions(s => s.filter(x => x.id !== id))
        setTotal(t => t - 1)
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleApproveInc = async (id: string) => {
    if (!session || actionLoading) return
    setActionLoading(id)
    try {
      const payload = editingIncentiveId === id ? editIncentiveData : {}
      const res = await fetch(`/api/admin/incentive-applications/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setIncentives(s => s.filter(x => x.id !== id))
        setEditingIncentiveId(null)
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleRejectInc = async (id: string) => {
    if (!session || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/incentive-applications/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setIncentives(s => s.filter(x => x.id !== id))
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handlePptApprove = async (id: string) => {
    if (!session || actionLoading) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/seed-fund-ppt/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setPpts(s => s.filter(x => x.id !== id))
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleProjectDocsApprove = async (id: string) => {
    if (!session) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/seed-fund-project-documents/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) fetchProjectDocs()
    } finally {
      setActionLoading(null)
    }
  }

  const handleProjectDocsReject = async (id: string) => {
    if (!session) return
    if (!remark) return alert('Remark required')
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/seed-fund-project-documents/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setRejectingId(null)
        setRemark('')
        fetchProjectDocs()
      }
    } finally {
      setActionLoading(null)
    }
  }
  const handlePptReject = async (id: string) => {
    if (!session || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/seed-fund-ppt/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setPpts(s => s.filter(x => x.id !== id))
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }



  const handleConsultancyApprove = async (id: string) => {
    if (!session || actionLoading) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/consultancy`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      })
      if (res.ok) {
        setConsultancies(s => s.filter(x => x.id !== id))
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleConsultancyReject = async (id: string) => {
    if (!session || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/consultancy`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected', rejection_remark: remark })
      })
      if (res.ok) {
        setConsultancies(s => s.filter(x => x.id !== id))
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleApproveProjectGrant = async (id: string) => {
    if (!session || actionLoading) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/project-grants/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setProjectGrantApps(s => s.filter(x => x.id !== id))
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleRejectProjectGrant = async (id: string) => {
    if (!session || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/project-grants/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setProjectGrantApps(s => s.filter(x => x.id !== id))
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }


  if (!session || authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#1e1b4b,#312e81,#1e3a8a)'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-white/60 text-sm font-medium">Loading dashboard...</p>
      </div>
    </div>
  )

  const tabColors: Record<TabStatus, string> = {
    pending:  activeTab === 'pending'  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30 border border-amber-400/50' : 'text-amber-600 bg-white dark:bg-slate-700 dark:text-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-amber-100 shadow-sm',
    approved: activeTab === 'approved' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/50' : 'text-emerald-600 bg-white dark:bg-slate-700 dark:text-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-emerald-100 shadow-sm',
    rejected: activeTab === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-400 text-white shadow-lg shadow-red-500/30 border border-red-400/50' : 'text-red-600 bg-white dark:bg-slate-700 dark:text-red-300 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-100 shadow-sm',
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col font-sans">
      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full w-full mx-auto pb-12 selection:bg-indigo-500/30">
          
          {/* Premium Hero Banner */}
          <div className="relative overflow-hidden px-6 sm:px-10 py-8 mb-6 shadow-inner"
            style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
            {/* Dynamic Animated Orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
              <div className="absolute top-[10%] right-[10%] w-[40%] h-[40%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
              <div className="absolute bottom-[-20%] left-[10%] w-[50%] h-[50%] bg-cyan-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-4 animate-fade-in">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-[10px] font-bold tracking-widest uppercase backdrop-blur-md shadow-lg shadow-black/10">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                    Welcome to the Future of Research
                  </div>
                </div>
              <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
                {activeModule === 'submissions' ? 'Paper Submissions' : activeModule === 'incentives' ? 'Incentive Applications' : activeModule === 'projectDocs' ? 'Final Project Documents' : activeModule === 'ppts' ? 'Seed Fund — PPT Submissions' : activeModule === 'consultancy' ? 'Consultancy Projects' : activeModule === 'projectGrants' ? 'Project Grants' : 'Seed Fund Applications'}
              </h1>
              <p className="text-indigo-200 mt-3 font-medium text-sm animate-slide-up" style={{animationDelay:'0.2s'}}>
                Review, approve or reject {activeModule === 'submissions' ? 'research paper submissions' : activeModule === 'incentives' ? 'faculty incentive applications' : activeModule === 'ppts' ? 'seed fund presentations' : activeModule === 'consultancy' ? 'consultancy projects' : activeModule === 'projectGrants' ? 'project grants applications' : 'seed fund applications'}
              </p>
              </div>
              
              <div className="flex items-center gap-2">
                {activeModule === 'submissions' && activeTab === 'approved' && (
                  <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors shadow-sm text-white border border-white/20">
                    <Download className="w-4 h-4" /> Export
                  </button>
                )}
                {activeModule === 'incentives' && activeTab === 'approved' && (
                  <button onClick={handleIncentivesExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors shadow-sm text-white border border-white/20">
                    <Download className="w-4 h-4" /> Export
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex justify-center gap-3 mb-6">
          {(['approved', 'pending', 'rejected'] as TabStatus[]).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); setRejectingId(null); setRemark(''); }}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all duration-200 ${tabColors[tab]}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeModule === 'submissions' && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-600/60 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm"><Filter className="w-4 h-4 text-indigo-500" /> Filters:</div>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]">
              <option value="">All Departments</option><option value="CSE">CSE</option><option value="ECE">ECE</option><option value="IT">IT</option><option value="MECH">MECH</option><option value="AIDS">AIDS</option>
            </select>
            <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }} className="bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[130px]">
              <option value="">All Years</option><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Staff Name..." 
                value={facultyFilter}
                onChange={e => { setFacultyFilter(e.target.value); setPage(1); }}
                className="w-full bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        )}

        {activeModule === 'incentives' && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-600/60 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-sm"><Filter className="w-4 h-4 text-indigo-500" /> Filters:</div>
            <select value={incYearFilter} onChange={e => { setIncYearFilter(e.target.value); setPage(1); }} className="bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[130px]">
              <option value="">All Years</option><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option>
            </select>
            <select value={incMonthFilter} onChange={e => { setIncMonthFilter(e.target.value); setPage(1); }} className="bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[140px]">
              <option value="">All Months</option>
              <option value="1">January</option><option value="2">February</option><option value="3">March</option>
              <option value="4">April</option><option value="5">May</option><option value="6">June</option>
              <option value="7">July</option><option value="8">August</option><option value="9">September</option>
              <option value="10">October</option><option value="11">November</option><option value="12">December</option>
            </select>
            <select value={incDeptFilter} onChange={e => { setIncDeptFilter(e.target.value); setPage(1); }} className="bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]">
              <option value="">All Departments</option><option value="CSE">CSE</option><option value="ECE">ECE</option><option value="IT">IT</option><option value="MECH">MECH</option><option value="AIDS">AIDS</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Staff Name..." 
                value={incFacultyFilter}
                onChange={e => { setIncFacultyFilter(e.target.value); setPage(1); }}
                className="w-full bg-blue-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
        )}

        <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-600/40">
          <div className="overflow-x-auto">
            {activeModule === 'submissions' ? (
              <div className="flex flex-col p-4 sm:p-6 bg-slate-50/50">
                {loading ? (
                  <div className="py-12 text-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                ) : submissions.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200/60">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Submissions Found</h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed">
                    There are currently no submissions matching your criteria in this category.
                  </p>
                </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {submissions.map((sub, idx) => (
                      <div key={sub.id} className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col xl:flex-row gap-5 items-start xl:items-center">
                        {/* Number/Icon block */}
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {(page - 1) * LIMIT + idx + 1}
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-800 text-lg leading-snug line-clamp-1 mb-1.5 group-hover:text-indigo-700 transition-colors" title={sub.title}>{sub.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[200px]" title={sub.authors}>
                              {sub.authors}
                            </span>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                              {sub.department}
                            </span>
                            <span className="font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              {sub.year}
                            </span>
                            {sub.doi && (
                              <a href={`https://doi.org/${sub.doi}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors">
                                DOI: {sub.doi} <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Proofs */}
                        <div className="flex flex-wrap gap-2 shrink-0 xl:w-[220px] justify-start xl:justify-center">
                          {sub.proof_full_paper_url && <a href={sub.proof_full_paper_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 hover:bg-emerald-100 hover:scale-105 transition-all shadow-sm"><FileText className="w-3.5 h-3.5"/> Full Paper</a>}
                          {sub.proof_scopus_url && <a href={sub.proof_scopus_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60 hover:bg-blue-100 hover:scale-105 transition-all shadow-sm"><LinkIcon className="w-3.5 h-3.5"/> Scopus</a>}
                          {sub.proof_published_url && <a href={sub.proof_published_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200/60 hover:bg-purple-100 hover:scale-105 transition-all shadow-sm"><Globe className="w-3.5 h-3.5"/> Web Page</a>}
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center justify-end w-full xl:w-[280px] pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-5">
                          {activeTab === 'pending' && (
                            rejectingId === sub.id ? (
                              <div className="flex flex-col gap-2 w-full">
                                <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Rejection reason..." className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-slate-50" rows={2} />
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => { setRejectingId(null); setRemark(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                                  <button onClick={() => handleRejectSub(sub.id)} disabled={!remark.trim() || actionLoading === sub.id} className="bg-red-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow">{actionLoading === sub.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 w-full">
                                <button onClick={() => handleApproveSub(sub.id)} disabled={actionLoading === sub.id} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><Check className="w-4 h-4" /> Approve</button>
                                <button onClick={() => setRejectingId(sub.id)} disabled={actionLoading === sub.id} className="flex-1 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><X className="w-4 h-4" /> Reject</button>
                              </div>
                            )
                          )}
                          {activeTab === 'rejected' && (
                            <div className="w-full bg-red-50 text-red-800 p-3 rounded-xl text-xs font-medium border border-red-100 flex gap-2">
                              <MessageSquareX className="w-4 h-4 shrink-0 text-red-500" />
                              <p className="leading-snug">{sub.rejection_remark}</p>
                            </div>
                          )}
                          {activeTab === 'approved' && (
                            <div className="w-full flex justify-end">
                               <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/50 border border-emerald-200 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-4 h-4"/> Approved</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeModule === 'projectGrants' ? (
              <div className="flex flex-col p-4 sm:p-6 bg-slate-50/50">
                {loading ? (
                  <div className="py-12 text-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                ) : projectGrantApps.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200/60">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Project grants Found</h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed">
                    There are currently no project grants matching your criteria in this category.
                  </p>
                </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {projectGrantApps.map((app, idx) => (
                      <div key={app.id} className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col xl:flex-row gap-5 items-start xl:items-center">
                        {/* Number/Icon block */}
                        <div className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {(page - 1) * LIMIT + idx + 1}
                        </div>

                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-800 text-lg leading-snug line-clamp-1 mb-1.5 group-hover:text-indigo-700 transition-colors" title={app.research_project_title}>{app.research_project_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                            <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[200px]" title={app.faculty_name}>
                              {app.faculty_name}
                            </span>
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                              {app.department}
                            </span>
                            <span className="font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                              {app.funding_agency || 'Unknown Agency'}
                            </span>
                            {app.total_proposed_budget && (
                              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                                ₹{app.total_proposed_budget.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Document */}
                        <div className="flex flex-wrap gap-2 shrink-0 xl:w-[220px] justify-start xl:justify-center">
                          {app.proposal_form_url && (
                            <a href={app.proposal_form_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60 hover:bg-blue-100 hover:scale-105 transition-all shadow-sm">
                              <FileText className="w-3.5 h-3.5"/> Proposal Form
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center justify-end w-full xl:w-[280px] pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-5">
                          {activeTab === 'pending' && (
                            rejectingId === app.id ? (
                              <div className="flex flex-col gap-2 w-full">
                                <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Rejection reason..." className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-slate-50" rows={2} />
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => { setRejectingId(null); setRemark(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                                  <button onClick={() => handleRejectProjectGrant(app.id)} disabled={!remark.trim() || actionLoading === app.id} className="bg-red-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow">{actionLoading === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 w-full">
                                <button onClick={() => handleApproveProjectGrant(app.id)} disabled={actionLoading === app.id} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><Check className="w-4 h-4" /> Approve</button>
                                <button onClick={() => setRejectingId(app.id)} disabled={actionLoading === app.id} className="flex-1 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><X className="w-4 h-4" /> Reject</button>
                              </div>
                            )
                          )}
                          {activeTab === 'rejected' && (
                            <div className="w-full bg-red-50 text-red-800 p-3 rounded-xl text-xs font-medium border border-red-100 flex gap-2">
                              <MessageSquareX className="w-4 h-4 shrink-0 text-red-500" />
                              <p className="leading-snug">{app.rejection_remark}</p>
                            </div>
                          )}
                          {activeTab === 'approved' && (
                            <div className="w-full flex justify-end">
                               <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/50 border border-emerald-200 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-4 h-4"/> Approved</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeModule === 'incentives' ? (
              <div className="flex flex-col p-4 sm:p-6 bg-slate-50/50">
                {loading ? (
                  <div className="py-12 text-center text-indigo-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                ) : incentives.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200/60">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No Applications Found</h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed">
                    There are currently no applications matching your criteria in this category.
                  </p>
                </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {incentives.map((inc, idx) => {
                      const isEditing = editingIncentiveId === inc.id;
                      return (
                        <div key={inc.id} className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-200 hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col xl:flex-row gap-5 items-start xl:items-center">
                          {/* Left: Faculty & Title */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded-md">{inc.submissions?.faculty_name || 'Unknown Faculty'}</span>
                              <span className="text-slate-400 text-xs font-medium">{inc.submissions?.department || 'Unknown Dept'}</span>
                              <span className="text-slate-300 text-xs font-medium px-2">•</span>
                              <span className="text-slate-400 text-xs font-medium">{new Date(inc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <h3 className="font-black text-slate-800 text-lg leading-snug line-clamp-2 mb-2 group-hover:text-indigo-700 transition-colors" title={inc.submissions?.title}>{inc.submissions?.title}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-indigo-100 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                                {inc.category === 'sci_journal' ? 'SCI Journal' : 
                                 inc.category === 'esci_scopus_journal' ? 'ESCI/Scopus' :
                                 inc.category === 'conference' ? 'Conference' :
                                 inc.category === 'book_chapter' ? 'Book Chapter' :
                                 inc.category === 'book' ? 'Book' :
                                 inc.category === 'patent' ? 'Patent' : 'Citations'}
                              </span>
                              {inc.submissions && (inc.submissions.doi || inc.submissions.issn_no || inc.submissions.volume) && (
                                <div className="text-[11px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                  {[
                                    inc.submissions.doi && `DOI: ${inc.submissions.doi}`,
                                    inc.submissions.issn_no && `ISSN: ${inc.submissions.issn_no}`,
                                    inc.submissions.volume && `Vol: ${inc.submissions.volume}`
                                  ].filter(Boolean).join(' | ')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Middle: Details Matrix */}
                          <div className="shrink-0 w-full xl:w-auto xl:min-w-[320px] bg-slate-50/80 border border-slate-100 rounded-xl p-3">
                            {isEditing ? (
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {['sci_journal', 'esci_scopus_journal', 'conference', 'book_chapter'].includes(inc.category) && (
                                  <>
                                    <div><label className="block text-slate-600 font-bold mb-1">Auth Count</label><input type="number" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.author_count ?? inc.author_count ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, author_count: e.target.value})} /></div>
                                    <div><label className="block text-slate-600 font-bold mb-1">Your Pos</label><input type="number" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.author_position ?? inc.author_position ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, author_position: e.target.value})} /></div>
                                  </>
                                )}
                                {inc.category === 'sci_journal' && (
                                  <div><label className="block text-slate-600 font-bold mb-1">Impact Factor</label><input type="number" step="0.1" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.impact_factor ?? inc.impact_factor ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, impact_factor: e.target.value})} /></div>
                                )}
                                {['sci_journal', 'esci_scopus_journal'].includes(inc.category) && (
                                  <div>
                                    <label className="block text-slate-600 font-bold mb-1">Quartile</label>
                                    <select className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.journal_quartile ?? inc.journal_quartile ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, journal_quartile: e.target.value})}>
                                      <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option>
                                    </select>
                                  </div>
                                )}
                                {inc.category === 'conference' && (
                                  <div><label className="block text-slate-600 font-bold mb-1">H-Index</label><input type="number" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.h_index ?? inc.h_index ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, h_index: e.target.value})} /></div>
                                )}
                                {['book_chapter', 'book'].includes(inc.category) && (
                                  <div>
                                    <label className="block text-slate-600 font-bold mb-1">Publisher Tier</label>
                                    <select className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.publisher_tier ?? inc.publisher_tier ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, publisher_tier: e.target.value})}>
                                      <option value="springer_elsevier_acm">Springer/Elsevier/ACM</option>
                                      <option value="wiley_igi_other">Wiley/IGI/Other</option>
                                    </select>
                                  </div>
                                )}
                                {inc.category === 'book' && (
                                  <div>
                                    <label className="block text-slate-600 font-bold mb-1">Book Type</label>
                                    <select className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.book_type ?? inc.book_type ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, book_type: e.target.value})}>
                                      <option value="authored">Authored</option>
                                      <option value="edited">Edited</option>
                                    </select>
                                  </div>
                                )}
                                {inc.category === 'patent' && (
                                  <div>
                                    <label className="block text-slate-600 font-bold mb-1">Patent Type</label>
                                    <select className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.patent_type ?? inc.patent_type ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, patent_type: e.target.value})}>
                                      <option value="application">Application</option>
                                      <option value="grant">Grant</option>
                                      <option value="design">Design</option>
                                    </select>
                                  </div>
                                )}
                                {inc.category === 'citations' && (
                                  <div><label className="block text-slate-600 font-bold mb-1">Citations</label><input type="number" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.citation_count ?? inc.citation_count ?? ''} onChange={e => setEditIncentiveData({...editIncentiveData, citation_count: e.target.value})} /></div>
                                )}
                                <div className="col-span-2"><label className="block text-slate-600 font-bold mb-1">Self Citations</label><input type="number" className="border border-slate-300 p-1.5 w-full rounded-lg bg-white" value={editIncentiveData.self_citation_count ?? inc.self_citation_count} onChange={e => setEditIncentiveData({...editIncentiveData, self_citation_count: e.target.value})} /></div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                {inc.author_count != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Total Authors</span> <span className="font-black text-slate-700">{inc.author_count}</span></div>}
                                {inc.author_position != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Faculty Pos</span> <span className="font-black text-slate-700">#{inc.author_position}</span></div>}
                                {inc.impact_factor != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Impact Factor</span> <span className="font-black text-slate-700">{inc.impact_factor}</span></div>}
                                {inc.journal_quartile != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Quartile</span> <span className="font-black text-slate-700">{inc.journal_quartile}</span></div>}
                                {inc.h_index != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">H-Index</span> <span className="font-black text-slate-700">{inc.h_index}</span></div>}
                                {inc.publisher_tier != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Publisher Tier</span> <span className="font-black text-slate-700">{inc.publisher_tier === 'springer_elsevier_acm' ? 'Springer/Elsevier/ACM' : 'Wiley/IGI/Other'}</span></div>}
                                {inc.book_type != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Book Type</span> <span className="font-black text-slate-700">{inc.book_type === 'authored' ? 'Authored' : 'Edited'}</span></div>}
                                {inc.patent_type != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Patent Type</span> <span className="font-black text-slate-700">{inc.patent_type === 'application' ? 'Application' : inc.patent_type === 'grant' ? 'Grant' : 'Design'}</span></div>}
                                {inc.citation_count != null && <div><span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] block">Total Citations</span> <span className="font-black text-slate-700">{inc.citation_count}</span></div>}
                                <div className="col-span-2 flex items-center justify-between border-t border-slate-200 mt-1 pt-2">
                                  <span className="text-slate-500 font-bold">Self Citations:</span>
                                  <span className="font-black text-red-600 bg-red-50 px-2 rounded">{inc.self_citation_count}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Amount & Actions */}
                          <div className="shrink-0 flex flex-col xl:items-end justify-between w-full xl:w-[220px] pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-5 self-stretch gap-4">
                            <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-start w-full">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Incentive</span>
                              <div className="text-2xl font-black text-indigo-700 drop-shadow-sm">₹{inc.calculated_amount?.toLocaleString('en-IN') || 0}</div>
                              {isEditing && <div className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full mt-1">Will recalculate on save</div>}
                            </div>

                            <div className="w-full">
                              {activeTab === 'pending' && (
                                rejectingId === inc.id ? (
                                  <div className="flex flex-col gap-2 w-full">
                                    <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Reason for rejection..." className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-slate-50" rows={2} />
                                    <div className="flex items-center gap-2 justify-end">
                                      <button onClick={() => { setRejectingId(null); setRemark(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                                      <button onClick={() => handleRejectInc(inc.id)} disabled={!remark.trim() || actionLoading === inc.id} className="bg-red-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow">{actionLoading === inc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2 w-full">
                                    {isEditing ? (
                                      <div className="flex items-center gap-2 w-full">
                                        <button onClick={() => setEditingIncentiveId(null)} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs px-2 py-2.5 rounded-xl transition-all shadow-sm">Cancel</button>
                                        <button onClick={() => handleApproveInc(inc.id)} disabled={actionLoading === inc.id} className="flex-[2] bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs px-2 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><Check className="w-4 h-4" /> Save</button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2 w-full">
                                          <button onClick={() => handleApproveInc(inc.id)} disabled={actionLoading === inc.id} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 font-bold text-xs px-2 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"><Check className="w-4 h-4" /> Approve</button>
                                          <button onClick={() => setRejectingId(inc.id)} disabled={actionLoading === inc.id} className="flex-1 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 font-bold text-xs px-2 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"><X className="w-4 h-4" /> Reject</button>
                                        </div>
                                        <button onClick={() => { setEditingIncentiveId(inc.id); setEditIncentiveData({}); }} className="w-full bg-slate-50 text-slate-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Override Values</button>
                                      </>
                                    )}
                                  </div>
                                )
                              )}
                              {activeTab === 'rejected' && (
                                <div className="w-full bg-red-50 text-red-800 p-3 rounded-xl text-xs font-medium border border-red-100 flex gap-2">
                                  <MessageSquareX className="w-4 h-4 shrink-0 text-red-500" />
                                  <p className="leading-snug">{inc.rejection_remark}</p>
                                </div>
                              )}
                              {activeTab === 'approved' && (
                                <div className="w-full flex justify-end">
                                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/50 border border-emerald-200 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-4 h-4"/> Approved</span>
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

            ) : activeModule === 'consultancy' ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider min-w-[200px]">Faculty</th>
                    <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider">Project Title</th>
                    <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider">Client & Fee</th>
                    <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider min-w-[250px]">Documents</th>
                    {activeTab === 'pending' && <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider text-right min-w-[200px]">Actions</th>}
                    {activeTab === 'rejected' && <th className="px-4 py-3.5 font-bold text-blue-900 text-xs uppercase tracking-wider min-w-[200px]">Remark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50 align-top">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></td></tr>
                  ) : consultancies.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500"><Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />No consultancy applications found.</td></tr>
                  ) : (
                    consultancies.map(app => (
                      <tr key={app.id} className="hover:bg-blue-50/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{app.faculty_name}</div>
                          <div className="text-xs text-slate-500">{app.department}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-normal font-medium text-slate-700 w-[200px] max-w-[200px]">
                          <div title={app.project_title}>{app.project_title}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-normal font-medium text-slate-600 w-[150px]">
                          <div className="font-semibold text-slate-800">{app.client_name}</div>
                          <div className="text-xs text-slate-500 font-bold mt-0.5">₹{app.consultancy_fee?.toLocaleString('en-IN') || '-'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-normal min-w-[280px]">
                          <details className="group">
                            <summary className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 list-none shadow-sm select-none cursor-pointer transition-all w-max marker:hidden [&::-webkit-details-marker]:hidden">
                              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                              View 10 Documents
                              <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-2 grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                              {app.proposal_form_url && <a href={app.proposal_form_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Proposal</span></a>}
                              {app.mou_url && <a href={app.mou_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">MOU</span></a>}
                              {app.work_monitoring_url && <a href={app.work_monitoring_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Monitoring</span></a>}
                              {app.payment_receipt_url && <a href={app.payment_receipt_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Receipt</span></a>}
                              {app.work_expense_report_url && <a href={app.work_expense_report_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Expense</span></a>}
                              {app.expenditure_documentation_checklist_url && <a href={app.expenditure_documentation_checklist_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Exp Docs</span></a>}
                              {app.audit_statement_url && <a href={app.audit_statement_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Audit</span></a>}
                              {app.agreement_closure_url && <a href={app.agreement_closure_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Closure</span></a>}
                              {app.revenue_sharing_url && <a href={app.revenue_sharing_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Rev Share</span></a>}
                              {app.closer_checklist_url && <a href={app.closer_checklist_url} target="_blank" className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 px-2 py-1.5 rounded-lg shadow-sm transition-all"><FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" /> <span className="truncate">Checklist</span></a>}
                            </div>
                          </details>
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            {rejectingId === app.id ? (
                              <div className="flex flex-col items-end gap-2 w-full max-w-[250px] ml-auto">
                                <input autoFocus type="text" value={remark} onChange={e => setRemark(e.target.value)} placeholder="Reason for rejection..." className="w-full text-xs px-2 py-1 border border-red-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500" />
                                <div className="flex gap-2">
                                  <button onClick={() => { setRejectingId(null); setRemark(''); }} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded">Cancel</button>
                                  <button onClick={() => handleConsultancyReject(app.id)} disabled={actionLoading === app.id || !remark.trim()} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-50">Confirm</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setRejectingId(app.id)} disabled={actionLoading === app.id} className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-200 flex items-center gap-1 disabled:opacity-50"><X className="w-3 h-3" /> Reject</button>
                                <button onClick={() => handleConsultancyApprove(app.id)} disabled={actionLoading === app.id} className="bg-emerald-100 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-200 flex items-center gap-1 disabled:opacity-50"><Check className="w-3 h-3" /> Approve</button>
                              </div>
                            )}
                          </td>
                        )}
                        {activeTab === 'rejected' && (
                          <td className="px-4 py-3 whitespace-normal w-[250px] max-w-[250px]">
                            <div className="flex items-start gap-2 bg-red-50 text-red-800 p-2 rounded text-xs border border-red-100"><MessageSquareX className="w-4 h-4 mt-0.5 shrink-0 text-red-500" /><p>{app.rejection_remark}</p></div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeModule === 'applications' ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-emerald-100">
                    <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider min-w-[200px]">Faculty</th>
                    <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider">Details</th>
                    {activeTab === 'pending' && <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider text-right min-w-[200px]">Actions</th>}
                    {activeTab === 'rejected' && <th className="px-4 py-3.5 font-bold text-emerald-900 text-xs uppercase tracking-wider min-w-[200px]">Remark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 align-top">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></td></tr>
                  ) : applications.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500"><Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />No applications found.</td></tr>
                  ) : (
                    applications.map(app => (
                      <tr key={app.id} className="hover:bg-emerald-50/50 cursor-pointer" onClick={() => router.push(`/admin/seed-fund/${app.id}`)}>
                        <td className="px-4 py-3 text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{app.faculty_name}</div>
                          <div className="text-xs text-slate-500">{app.department}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-normal font-medium text-slate-700 w-[250px] max-w-[250px]">
                          <div title={app.title}>{app.title}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          ₹{app.amount_requested?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-blue-600 font-medium hover:underline text-xs">
                          Click to view full application →
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/seed-fund/${app.id}`); }} className="bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1">Review</button>
                            </div>
                          </td>
                        )}
                        {activeTab === 'rejected' && (
                          <td className="px-4 py-3 whitespace-normal">
                            <div className="flex items-start gap-2 bg-red-50 text-red-800 p-2 rounded text-xs border border-red-100"><MessageSquareX className="w-4 h-4 mt-0.5 shrink-0 text-red-500" /><p>{app.rejection_remark}</p></div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeModule === 'ppts' ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gradient-to-r from-fuchsia-50 to-purple-50 border-b border-fuchsia-100">
                    <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider min-w-[200px]">Faculty</th>
                    <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider">Project Title</th>
                    <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider">Presentation</th>
                    {activeTab === 'pending' && <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider text-right min-w-[200px]">Actions</th>}
                    {activeTab === 'rejected' && <th className="px-4 py-3.5 font-bold text-fuchsia-900 text-xs uppercase tracking-wider min-w-[200px]">Remark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-50 align-top">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-fuchsia-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></td></tr>
                  ) : ppts.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500"><Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />No PPT submissions found.</td></tr>
                  ) : (
                    ppts.map(ppt => (
                      <tr key={ppt.id} className="hover:bg-fuchsia-50/50">
                        <td className="px-4 py-3 text-slate-500">{new Date(ppt.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{ppt.faculty?.name}</div>
                          <div className="text-xs text-slate-500">{ppt.faculty?.dept}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-normal font-medium text-slate-700 w-[250px] max-w-[250px]">
                          <div title={ppt.application?.title}>{ppt.application?.title}</div>
                          <a href={`/admin/seed-fund/${ppt.application_id}`} target="_blank" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">View Application ↗</a>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <a href={ppt.ppt_file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-fuchsia-600 hover:text-fuchsia-800 bg-fuchsia-50 px-3 py-1.5 rounded-lg border border-fuchsia-100 w-max">
                            <Download className="w-3.5 h-3.5" /> Download PPT
                          </a>
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {rejectingId === ppt.id ? (
                                <div className="flex items-center gap-2">
                                  <input type="text" placeholder="Reason for rejection..." value={remark} onChange={e => setRemark(e.target.value)} className="text-xs border px-2 py-1.5 rounded w-40" autoFocus />
                                  <button onClick={() => handlePptReject(ppt.id)} disabled={!remark.trim()} className="bg-red-600 text-white text-xs px-2 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => {setRejectingId(null); setRemark('');}} className="bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded hover:bg-slate-300"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => setRejectingId(ppt.id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100">Reject</button>
                                  <button onClick={() => handlePptApprove(ppt.id)} disabled={actionLoading === ppt.id} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                                    {actionLoading === ppt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                        {activeTab === 'rejected' && (
                          <td className="px-4 py-3 whitespace-normal">
                            <div className="flex items-start gap-2 bg-red-50 text-red-800 p-2 rounded text-xs border border-red-100"><MessageSquareX className="w-4 h-4 mt-0.5 shrink-0 text-red-500" /><p>{ppt.rejection_remark}</p></div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeModule === 'projectDocs' ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
                    <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider min-w-[200px]">Faculty</th>
                    <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider">Project Title</th>
                    <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider text-center">Documents</th>
                    {activeTab === 'pending' && <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider text-right min-w-[200px]">Actions</th>}
                    {activeTab === 'rejected' && <th className="px-4 py-3.5 font-bold text-cyan-900 text-xs uppercase tracking-wider min-w-[200px]">Remark</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-50 align-top">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-cyan-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></td></tr>
                  ) : projectDocs.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500"><Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />No project documents found.</td></tr>
                  ) : (
                    projectDocs.map(doc => {
                      const isExpanded = expandedDocs[doc.id]
                      return (
                        <tr key={doc.id} className="hover:bg-cyan-50/50">
                          <td className="px-4 py-3 text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{doc.faculty?.name}</div>
                            <div className="text-xs text-slate-500">{doc.faculty?.dept}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-normal font-medium text-slate-700 w-[250px] max-w-[250px]">
                            <div title={doc.application?.title}>{doc.application?.title}</div>
                            <a href={`/admin/seed-fund/${doc.application_id}`} target="_blank" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">View Application ↗</a>
                          </td>
                          <td className="px-4 py-3 font-semibold text-center whitespace-normal">
                            <div className="flex flex-col gap-2">
                              {/* Download All button */}
                              <button
                                onClick={() => handleDownloadAll(doc.id)}
                                disabled={downloadingDocId === doc.id}
                                className="flex items-center justify-center gap-1.5 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 w-full font-bold text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {downloadingDocId === doc.id ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PDF…</>
                                ) : (
                                  <><Download className="w-3.5 h-3.5" /> Download All (Combined PDF)</>
                                )}
                              </button>
                              {/* Toggle individual documents */}
                              <button onClick={() => setExpandedDocs(s => ({...s, [doc.id]: !s[doc.id]}))} className="flex items-center justify-center gap-1.5 text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg border border-cyan-100 w-full font-bold text-xs transition-colors">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {isExpanded ? 'Hide Documents' : 'View 9 Documents'}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-3 flex flex-col gap-2 text-left bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                {PROJECT_DOCUMENT_CHECKLIST.map(item => (
                                  <div key={item.key} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                    <span className="text-[11px] text-slate-600 font-medium truncate">{item.label}</span>
                                    {doc[item.key] ? (
                                      <a href={doc[item.key]} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline shrink-0 bg-blue-50 px-2 py-1 rounded">View</a>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 shrink-0">—</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-start justify-end gap-2">
                                {rejectingId === doc.id ? (
                                  <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Reason for rejection..." value={remark} onChange={e => setRemark(e.target.value)} className="text-xs border px-2 py-1.5 rounded w-40" autoFocus />
                                    <button onClick={() => handleProjectDocsReject(doc.id)} disabled={!remark.trim()} className="bg-red-600 text-white text-xs px-2 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => {setRejectingId(null); setRemark('');}} className="bg-slate-200 text-slate-600 text-xs px-2 py-1.5 rounded hover:bg-slate-300"><X className="w-4 h-4" /></button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => setRejectingId(doc.id)} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100">Reject</button>
                                    <button onClick={() => handleProjectDocsApprove(doc.id)} disabled={actionLoading === doc.id} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                                      {actionLoading === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                          {activeTab === 'rejected' && (
                            <td className="px-4 py-3 whitespace-normal">
                              <div className="flex items-start gap-2 bg-red-50 text-red-800 p-2 rounded text-xs border border-red-100"><MessageSquareX className="w-4 h-4 mt-0.5 shrink-0 text-red-500" /><p>{doc.rejection_remark}</p></div>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            ) : null}
          </div>
          
          {activeModule === 'submissions' && !loading && Math.ceil(total / LIMIT) > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-blue-50/50 flex items-center justify-between">
              <span className="text-sm text-slate-500">Showing <span className="font-bold text-slate-700">{(page - 1) * LIMIT + 1}</span> to <span className="font-bold text-slate-700">{Math.min(page * LIMIT, total)}</span> of <span className="font-bold text-slate-700">{total}</span></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-1.5 text-sm bg-white border border-slate-200 rounded-xl hover:bg-blue-50 disabled:opacity-40 font-semibold">← Prev</button>
                <button onClick={() => setPage(p => Math.min(Math.ceil(total / LIMIT), p + 1))} disabled={page === Math.ceil(total / LIMIT)} className="px-4 py-1.5 text-sm bg-white border border-slate-200 rounded-xl hover:bg-blue-50 disabled:opacity-40 font-semibold">Next →</button>
              </div>
            </div>
          )}
        </div>
        </div>
      </main>
      </div>
    </div>
  )
}
