'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Submission } from '@/lib/types'
import {
  Loader2, FileText, ArrowRight, ExternalLink, AlertCircle, Edit3, Clock, CheckCircle, IndianRupee, BookOpen
} from 'lucide-react'
import Link from 'next/link'

export default function SubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMySubmissions = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id, title, source_title, year, status, rejection_remark,
        proof_full_paper_url, proof_scopus_url,
        incentive_applications (id, status, calculated_amount, rejection_remark)
      `)
      .eq('submitted_by', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setSubmissions(data as any)
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
            <BookOpen className="w-4 h-4 text-cyan-300 drop-shadow-md" /> History
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            Submission History
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm flex items-center justify-center gap-2 max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            Track your recorded research publications and incentive applications.
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
                  <FileText className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No submissions yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">You haven&apos;t submitted any research papers to the portal yet. When you do, they will appear here.</p>
                <Link href="/submit" className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  Submit a Paper <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-blue-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold min-w-[300px]">Title</th>
                      <th className="px-6 py-4 font-semibold min-w-[250px]">Source</th>
                      <th className="px-6 py-4 font-semibold">Year</th>
                      <th className="px-6 py-4 font-semibold text-center">Paper Status</th>
                      <th className="px-6 py-4 font-semibold text-center">Incentive Status</th>
                      <th className="px-6 py-4 font-semibold text-center">Proofs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => {
                      const incentive = sub.incentive_applications?.[0]
                      
                      return (
                        <tr key={sub.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-normal font-medium text-slate-800">
                            <div title={sub.title}>{sub.title}</div>
                            {sub.status === 'rejected' && sub.rejection_remark && (
                              <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                  <div>
                                    <p className="font-semibold mb-1">Paper Rejection Remark:</p>
                                    <p>{sub.rejection_remark}</p>
                                  </div>
                                </div>
                                <div className="mt-3 text-right">
                                  <Link 
                                    href={`/submit?edit=${sub.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-md transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit Paper
                                  </Link>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-normal text-slate-600 align-top">
                            <div title={sub.source_title}>{sub.source_title}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 align-top">{sub.year}</td>
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
                          <td className="px-6 py-4 align-top text-center min-w-[200px]">
                            {sub.status === 'approved' ? (
                              incentive ? (
                                <div className="flex flex-col items-center gap-2">
                                  {incentive.status === 'approved' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                                      <CheckCircle className="w-3.5 h-3.5" /> Approved (₹{incentive.calculated_amount})
                                    </span>
                                  ) : incentive.status === 'rejected' ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold">
                                        <AlertCircle className="w-3.5 h-3.5" /> Rejected
                                      </span>
                                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded text-left w-full border border-red-100">
                                        <span className="font-semibold block mb-1">Remark:</span>
                                        {incentive.rejection_remark}
                                      </div>
                                      <Link href={`/incentive/apply?submission=${sub.id}`} className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors w-full justify-center mt-1">
                                        <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit
                                      </Link>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-semibold">
                                      <Clock className="w-3.5 h-3.5" /> Pending
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Link 
                                  href={`/incentive/apply?submission=${sub.id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                                >
                                  <IndianRupee className="w-3.5 h-3.5" /> Apply for Incentive
                                </Link>
                              )
                            ) : (
                              <span className="text-slate-400 text-xs italic">Paper not approved</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center align-top">
                            <div className="flex items-center justify-center gap-2">
                              {sub.proof_full_paper_url && (
                                <a href={sub.proof_full_paper_url} target="_blank" rel="noreferrer" 
                                   className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors">
                                  <ExternalLink className="w-3 h-3" /> Full
                                </a>
                              )}
                              {sub.proof_scopus_url && (
                                <a href={sub.proof_scopus_url} target="_blank" rel="noreferrer" 
                                   className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors">
                                  <ExternalLink className="w-3 h-3" /> Scopus
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
