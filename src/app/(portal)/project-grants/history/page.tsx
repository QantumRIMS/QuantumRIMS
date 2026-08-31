'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileText, Loader2, ArrowRight, ExternalLink, Calendar, Plus, RefreshCw, XCircle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ProjectGrantsHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [grants, setGrants] = useState<any[]>([])

  useEffect(() => {
    fetchGrants()
  }, [])

  const fetchGrants = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('project_grant_applications')
        .select('*')
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGrants(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
      case 'rejected': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full"><XCircle className="w-3.5 h-3.5" /> Rejected</span>
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full"><Clock className="w-3.5 h-3.5" /> Pending Review</span>
      default: return null
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A3D8F]" /></div>

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Project Grants History</h1>
          <p className="text-slate-500 font-medium">Track and manage your submitted project grant proposals.</p>
        </div>
        <Link href="/project-grants" className="inline-flex items-center gap-2 bg-[#FDB813] hover:bg-yellow-400 text-[#0A3D8F] px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow hover:-translate-y-0.5 whitespace-nowrap">
          <Plus className="w-5 h-5" /> New Application
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        {grants.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-10 h-10 text-blue-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Applications Yet</h3>
            <p className="text-slate-500 font-medium max-w-sm mb-6">You haven&apos;t submitted any project grant applications yet.</p>
            <Link href="/project-grants" className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all">
              Start Application <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Project Title</th>
                  <th className="px-6 py-4 font-bold">Funding Agency</th>
                  <th className="px-6 py-4 font-bold">Budget</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Submitted On</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grants.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 whitespace-normal min-w-[200px]">{app.research_project_title}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {app.funding_agency || '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {app.total_proposed_budget ? `₹${app.total_proposed_budget.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Calendar className="w-4 h-4" />
                        {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {app.status === 'rejected' ? (
                        <div className="flex flex-col items-end gap-2">
                          <Link href={`/project-grants?edit=${app.id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0A3D8F] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                            <RefreshCw className="w-4 h-4" /> Edit & Resubmit
                          </Link>
                          {app.rejection_remark && (
                            <div className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded max-w-[200px] truncate" title={app.rejection_remark}>
                              {app.rejection_remark}
                            </div>
                          )}
                        </div>
                      ) : (
                        <a href={app.proposal_form_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#0A3D8F] font-bold text-sm bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                          <ExternalLink className="w-4 h-4" /> View PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
