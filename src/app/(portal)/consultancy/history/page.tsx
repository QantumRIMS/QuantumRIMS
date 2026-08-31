'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Briefcase, ArrowRight, AlertCircle, Edit3, Clock, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

export default function ConsultancyHistoryPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMySubmissions = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('consultancy_applications')
      .select(`id, project_title, client_name, consultancy_fee, status, rejection_remark, created_at`)
      .eq('applicant_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setSubmissions(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMySubmissions()
  }, [fetchMySubmissions])

  return (
    <div className="bg-blue-50 min-h-full pb-16 selection:bg-indigo-500/30">
      <div className="relative overflow-hidden pt-12 pb-24 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        
        {/* Dynamic Animated Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
          <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] bg-cyan-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 w-full mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
            <Briefcase className="w-4 h-4 text-cyan-300 drop-shadow-md" /> History
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            Submission History
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm flex items-center justify-center gap-2 max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            Track your recorded consultancy projects and their approval status.
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 -mt-12">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 transition-transform duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="p-0">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading your submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No submissions yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">You haven&apos;t submitted any consultancy projects to the portal yet. When you do, they will appear here.</p>
                <Link href="/consultancy" className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  Submit a Proposal <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-blue-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold min-w-[250px]">Project Title</th>
                      <th className="px-6 py-4 font-semibold min-w-[200px]">Client</th>
                      <th className="px-6 py-4 font-semibold">Fee</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-normal font-medium text-slate-800 align-top">
                          <div title={sub.project_title}>{sub.project_title}</div>
                          {sub.status === 'rejected' && sub.rejection_remark && (
                            <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                <div>
                                  <p className="font-semibold mb-1">Rejection Remark:</p>
                                  <p>{sub.rejection_remark}</p>
                                </div>
                              </div>
                              <div className="mt-3 text-right">
                                <Link 
                                  href={`/consultancy?edit=${sub.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-md transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit Proposal
                                </Link>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-normal text-slate-600 align-top">
                          <div title={sub.client_name}>{sub.client_name}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 align-top font-semibold text-blue-700">
                          ₹{sub.consultancy_fee?.toLocaleString('en-IN') || '-'}
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          {sub.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : sub.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 align-top text-right">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
