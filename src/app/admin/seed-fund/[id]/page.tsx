'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, ArrowLeft, Check, X, FileText, FlaskConical, IndianRupee, MapPin, Calendar, Users, Building, Target, BookOpen, Link as LinkIcon, Download, Star } from 'lucide-react'

export default function SeedFundApplicationDetail({ params }: { params: { id: string } }) {
  const router = useRouter()

  
  const [app, setApp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [remark, setRemark] = useState('')

  useEffect(() => {
    fetchApplication()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchApplication = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/admin/login')

    try {
      const res = await fetch(`/api/admin/seed-fund/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const json = await res.json()
        setApp(json.data)
      } else {
        router.push('/admin')
      }
    } catch (error) {
      console.error(error)
      router.push('/admin')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (actionLoading) return
    setActionLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const res = await fetch(`/api/admin/seed-fund/${params.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        router.push('/admin')
      } else {
        alert('Approval failed')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (actionLoading || !remark.trim()) return
    setActionLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const res = await fetch(`/api/admin/seed-fund/${params.id}/reject`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ remark })
      })
      if (res.ok) {
        router.push('/admin')
      } else {
        alert('Rejection failed')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-blue-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  if (!app) return null

  const Section = ({ title, icon: Icon, children, number }: { title: string, icon: any, children: React.ReactNode, number: string }) => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-transparent dark:to-transparent flex items-center gap-4">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center text-sm font-black">{number}</span>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Icon className="w-5 h-5 text-indigo-500" />
          {title}
        </h2>
      </div>
      <div className="p-8">
        {children}
      </div>
    </div>
  )

  const Field = ({ label, value, fullWidth = false }: { label: string, value: string | number | null | undefined, fullWidth?: boolean }) => (
    <div className={fullWidth ? 'col-span-2 bg-blue-50/80 p-5 rounded-2xl border border-slate-100/50 hover:bg-blue-50 transition-colors' : 'bg-blue-50/80 p-5 rounded-2xl border border-slate-100/50 hover:bg-blue-50 transition-colors'}>
      <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1.5">{label}</span>
      <p className="text-sm text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{value || '-'}</p>
    </div>
  )

  return (
    <div className="bg-blue-50 min-h-screen pb-20 selection:bg-indigo-500/30">
      
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden pt-10 pb-16 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        
        {/* Dynamic Animated Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-col gap-2 mb-2 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-[10px] font-bold tracking-widest uppercase backdrop-blur-md shadow-lg shadow-black/10 self-start">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                  Welcome to the Future of Research
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold tracking-widest uppercase backdrop-blur-md shadow-lg shadow-black/10 self-start">
                  Application ID: {app.id.substring(0, 8)}
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>Seed Fund Review</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Status</span>
            {app.status === 'pending' && <span className="text-amber-300 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-400/30 uppercase tracking-widest text-xs font-bold backdrop-blur-md shadow-lg shadow-amber-900/20">Pending</span>}
            {app.status === 'approved' && <span className="text-emerald-300 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-400/30 uppercase tracking-widest text-xs font-bold backdrop-blur-md shadow-lg shadow-emerald-900/20">Approved</span>}
            {app.status === 'rejected' && <span className="text-red-300 bg-red-500/20 px-4 py-1.5 rounded-full border border-red-400/30 uppercase tracking-widest text-xs font-bold backdrop-blur-md shadow-lg shadow-red-900/20">Rejected</span>}
          </div>
        </div>
      </div>

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 -mt-8 space-y-8">
        
        {/* Applicant Profile Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <span className="text-2xl font-bold text-white">{app.faculty_name?.charAt(0)}</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-800">{app.faculty_name}</h2>
            <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wider">{app.department} • Emp ID: {app.emp_id}</p>
            <p className="text-slate-400 font-medium text-xs mt-2">Submitted on {new Date(app.created_at).toLocaleString()}</p>
          </div>
        </div>

        <Section number="1" title="Screening Details" icon={FlaskConical}>
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            <Field fullWidth label="Project Title" value={app.title} />
            <Field label="Principal Investigator" value={app.pi_name_designation} />
            <Field label="Co-Investigator(s)" value={app.co_investigators} />
            <Field label="Funding Agency" value={app.funding_agency} />
            <Field label="Announcement Details" value={app.announcement_details} />
          </div>
        </Section>

        <Section number="2" title="Seed Money Requisition" icon={IndianRupee}>
          <div className="grid grid-cols-2 gap-y-6 gap-x-8">
            <Field label="Amount Requested" value={`₹${app.amount_requested?.toLocaleString('en-IN')}`} />
            <Field label="Duration" value={app.duration_months ? `${app.duration_months} Months` : null} />
            <Field fullWidth label="Objectives" value={app.objectives} />
            <Field fullWidth label="Expected Utilization" value={app.expected_utilization} />
            <Field label="Proposed Location" value={app.proposed_location} />
            <Field label="Collaborating Industry" value={app.collaborating_industry} />
            <Field fullWidth label="Expected Outcomes" value={app.expected_outcomes} />
            <Field label="Reviewer Feedback" value={app.reviewer_feedback} />
            <Field label="Additional Resources" value={app.additional_resources} />
          </div>
        </Section>

        <Section number="3" title="Project Documents" icon={FileText}>
          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md hover:bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20"><FileText className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-slate-800 text-lg">Signed Screening Form</h3></div>
              </div>
              <a href={app.screening_form_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold text-blue-700 hover:text-blue-800 hover:bg-blue-100 hover:shadow-md transition-all flex items-center gap-2"><LinkIcon className="w-4 h-4" /> View Document</a>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md hover:bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20"><FileText className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-slate-800 text-lg">Signed Requisition Form</h3></div>
              </div>
              <a href={app.requisition_form_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100 hover:shadow-md transition-all flex items-center gap-2"><LinkIcon className="w-4 h-4" /> View Document</a>
            </div>

            <div className="bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-md hover:bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20"><FileText className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-slate-800 text-lg">Project Proposal Document</h3></div>
              </div>
              <a href={app.project_document_url} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 hover:shadow-md transition-all flex items-center gap-2"><LinkIcon className="w-4 h-4" /> View Document</a>
            </div>
          </div>
        </Section>

        {app.status === 'pending' && (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 sm:p-8 mt-10 mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-cyan-400" />
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest pl-2">Administrator Actions</h2>
            
            {rejecting ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Reason for Rejection <span className="text-red-500">*</span></label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={3}
                    placeholder="Provide detailed feedback to the faculty..."
                    className="w-full bg-blue-50 border border-slate-200 text-slate-900 text-sm rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 transition-all placeholder:text-slate-400 shadow-inner"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setRejecting(false); setRemark(''); }}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!remark.trim() || actionLoading}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Approve Application
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject Application
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
