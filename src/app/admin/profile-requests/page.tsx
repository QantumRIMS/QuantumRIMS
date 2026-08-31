'use client'

import { useState, useEffect, useCallback, useContext } from 'react'
import { AdminAuthContext } from '@/context/AdminAuthContext'
import { Loader2, Check, X, Search, CheckCircle2, MessageSquareX, ArrowRight, UserCog } from 'lucide-react'

type TabStatus = 'pending' | 'approved' | 'rejected'

export default function ProfileRequestsPage() {
  const { token, loading: authLoading } = useContext(AdminAuthContext)
  const [activeTab, setActiveTab] = useState<TabStatus>('pending')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [remark, setRemark] = useState('')

  const fetchRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/profile-edit-requests?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      })
      const json = await res.json()
      if (res.ok) {
        setRequests(json.data || [])
      }
    } catch (error) {
      console.error('Error fetching profile requests', error)
    } finally {
      setLoading(false)
    }
  }, [token, activeTab])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = async (id: string) => {
    if (!token || actionLoading) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/profile-edit-requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setRequests(s => s.filter(x => x.id !== id))
      } else {
        alert('Approval failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  const handleReject = async (id: string) => {
    if (!token || actionLoading || !remark.trim()) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/profile-edit-requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        setRequests(s => s.filter(x => x.id !== id))
        setRejectingId(null)
        setRemark('')
      } else {
        alert('Rejection failed: ' + (await res.json()).error)
      }
    } finally { setActionLoading(null) }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )

  const tabColors: Record<TabStatus, string> = {
    pending:  activeTab === 'pending'  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30 border border-amber-400/50' : 'text-amber-600 bg-white hover:bg-amber-50 border border-amber-100 shadow-sm',
    approved: activeTab === 'approved' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/50' : 'text-emerald-600 bg-white hover:bg-emerald-50 border border-emerald-100 shadow-sm',
    rejected: activeTab === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-400 text-white shadow-lg shadow-red-500/30 border border-red-400/50' : 'text-red-600 bg-white hover:bg-red-50 border border-red-100 shadow-sm',
  }

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col font-sans">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-[88px] z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-4 sm:px-6 py-6 sm:py-8 lg:py-10 max-w-[1600px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight leading-tight">
                  Profile Edit Requests
                </h1>
                <p className="text-slate-500 font-medium mt-2">Manage staff profile updates.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
                {(['pending', 'approved', 'rejected'] as TabStatus[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setRejectingId(null); setRemark(''); }}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 capitalize ${tabColors[tab]}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {loading ? (
            <div className="py-20 text-center text-blue-600">
              <Loader2 className="w-10 h-10 animate-spin mx-auto drop-shadow-sm" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-xl text-slate-600">No {activeTab} profile edit requests found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {requests.map((req, idx) => (
                <div key={req.id} className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-slate-200 hover:border-blue-200 transition-all duration-300 flex flex-col xl:flex-row gap-5 items-start xl:items-center">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {idx + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg leading-snug mb-1">{req.faculty_name || req.previous_name || 'Unknown Staff'} ({req.emp_id})</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                      {req.requested_dept && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-500">Dept:</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded line-through">{req.previous_dept || req.department || 'None'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{req.requested_dept}</span>
                        </div>
                      )}
                      {req.requested_designation && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-500">Designation:</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded line-through">{req.previous_designation || 'None'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{req.requested_designation}</span>
                        </div>
                      )}
                      {req.requested_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-500">Name:</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded line-through">{req.previous_name || 'None'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{req.requested_name}</span>
                        </div>
                      )}
                      {req.requested_type && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-500">Type:</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded line-through">{req.previous_type || 'None'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">{req.requested_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end w-full xl:w-[280px] pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-slate-100 xl:pl-5">
                    {activeTab === 'pending' && (
                      rejectingId === req.id ? (
                        <div className="flex flex-col gap-2 w-full">
                          <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Rejection reason..." className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 bg-slate-50" rows={2} />
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => { setRejectingId(null); setRemark(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                            <button onClick={() => handleReject(req.id)} disabled={!remark.trim() || actionLoading === req.id} className="bg-red-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow">{actionLoading === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject'}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 w-full">
                          <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white border border-emerald-200 hover:border-emerald-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><Check className="w-4 h-4" /> Approve</button>
                          <button onClick={() => setRejectingId(req.id)} disabled={actionLoading === req.id} className="flex-1 bg-red-50 text-red-700 hover:bg-red-500 hover:text-white border border-red-200 hover:border-red-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"><X className="w-4 h-4" /> Reject</button>
                        </div>
                      )
                    )}
                    {activeTab === 'rejected' && (
                      <div className="w-full bg-red-50 text-red-800 p-3 rounded-xl text-xs font-medium border border-red-100 flex gap-2">
                        <MessageSquareX className="w-4 h-4 shrink-0 text-red-500" />
                        <p className="leading-snug">{req.rejection_remark}</p>
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
      </div>
    </div>
  )
}
