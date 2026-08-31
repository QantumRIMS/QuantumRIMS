'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useFaculty } from '@/context/FacultyContext'
import { Loader2, IndianRupee, Wallet, CheckCircle, Clock, AlertCircle, Edit3, ArrowRight, FileText } from 'lucide-react'
import Link from 'next/link'

export default function IncentivePage() {
  const faculty = useFaculty()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMyApplications = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('incentive_applications')
      .select('*, submissions(title)')
      .eq('applicant_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setApplications(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMyApplications()
  }, [fetchMyApplications])

  return (
    <div className="bg-blue-50 min-h-full pb-16 selection:bg-indigo-500/30">
      <div className="relative overflow-hidden pt-12 pb-24 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        
        {/* Dynamic Animated Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 w-full mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
            <Wallet className="w-4 h-4 text-fuchsia-300 drop-shadow-md" /> Incentive Module
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            My Incentives
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm flex items-center justify-center gap-2 max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            <span>{faculty.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{faculty.dept}</span>
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 -mt-12">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 transition-transform duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white dark:from-transparent dark:to-transparent flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Incentive Applications</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Track the status of your financial incentive claims</p>
              </div>
            </div>
          </div>
          
          <div className="p-0">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Loading your applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">No incentives claimed yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">You haven&apos;t submitted any incentive applications. Head over to your profile to apply for an approved paper.</p>
                <Link href="/profile" className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                  Go to Profile <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-blue-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Date Applied</th>
                      <th className="px-6 py-4 font-semibold min-w-[300px]">Paper Title</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Calculated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-normal font-medium text-slate-800">
                          <div className="line-clamp-2" title={app.submissions?.title}>{app.submissions?.title}</div>
                          {app.status === 'rejected' && app.rejection_remark && (
                            <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                <div>
                                  <p className="font-semibold mb-1">Rejection Remark:</p>
                                  <p>{app.rejection_remark}</p>
                                </div>
                              </div>
                              <div className="mt-3 text-right">
                                <Link 
                                  href={`/incentive/apply?submission=${app.submission_id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-md transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit Application
                                </Link>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                            {app.category === 'sci_journal' ? 'SCI Journal' : app.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-center">
                          {app.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : app.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="text-xl font-black text-blue-700">₹{app.calculated_amount?.toLocaleString('en-IN') || 0}</div>
                           <div className="text-xs text-slate-500 font-medium mt-0.5">Citations: {app.self_citation_count}</div>
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
