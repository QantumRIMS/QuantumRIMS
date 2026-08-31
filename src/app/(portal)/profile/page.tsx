'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFaculty } from '@/context/FacultyContext'
import { User, FileText, Wallet, FlaskConical, TrendingUp, GraduationCap, CheckCircle2, AlertCircle, Loader2, Edit3, X } from 'lucide-react'
import Link from 'next/link'

const DEPARTMENTS = [
  "CSE", "IT", "AIDS", "CSBS", "ECE", "EEE", "MECH", 
  "CYS", "MCT", "S&H", "MBA"
]
const DESIGNATIONS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor"
]

const steps = [
  { n: '01', title: 'Submit Paper', desc: 'Fill in all publication details from your Scopus record.' },
  { n: '02', title: 'Upload Proofs', desc: 'Attach full paper PDF, Scopus screenshot, and published proof.' },
  { n: '03', title: 'Await Approval', desc: 'Admin reviews your submission — usually within 2–3 working days.' },
  { n: '04', title: 'Apply for Incentive', desc: 'Once approved, apply for your financial incentive from the Incentive module.' },
]

const seedFundSteps = [
  { n: '01', title: 'Fill Application', desc: 'Provide Screening and Requisition details.' },
  { n: '02', title: 'Upload Docs', desc: 'Attach Screening/Requisition forms and Project Proposal.' },
  { n: '03', title: 'Await Approval', desc: 'Admin reviews your application.' },
  { n: '04', title: 'Submit PPT', desc: 'Once approved, submit your presentation.' },
  { n: '05', title: 'Final Docs', desc: 'After presentation approval, upload project docs.' },
]

export default function ProfilePage() {
  const faculty = useFaculty()
  const [stats, setStats] = useState({ papers: '-', incentives: '-', projects: '-' })
  const [profileReq, setProfileReq] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', designation: '', dept: '', type: '' })
  const [submittingProfile, setSubmittingProfile] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      try {
        const { count: paperCount } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('submitted_by', session.user.id)
          .eq('status', 'approved')

        const { data: incData } = await supabase
          .from('incentive_applications')
          .select('calculated_amount')
          .eq('applicant_id', session.user.id)
          .eq('status', 'approved')
        
        const incSum = incData?.reduce((sum, item) => sum + (Number(item.calculated_amount) || 0), 0) || 0
        const formatIndianCurrency = (num: number) => {
          if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`
          return `₹${num.toLocaleString('en-IN')}`
        }
        const formattedInc = formatIndianCurrency(incSum)

        const { count: seedCount } = await supabase
          .from('seed_fund_applications')
          .select('*', { count: 'exact', head: true })
          .eq('applicant_id', session.user.id)

        setStats({
          papers: `${paperCount || 0}`,
          incentives: formattedInc,
          projects: `${seedCount || 0}`
        })

        const { data: reqData } = await supabase
          .from('profile_edit_requests')
          .select('*')
          .eq('applicant_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (reqData) setProfileReq(reqData)

      } catch (err) {
        console.error('Failed to fetch dashboard stats', err)
      }
    }
    fetchStats()
  }, [])

  const modules = [
    {
      href: '/submit',
      icon: FileText,
      title: 'Research Paper Submission',
      description: 'Submit your Scopus-indexed research publications to the institutional repository.',
      buttonText: 'Submit paper →',
      stat: stats.papers,
      statLabel: 'APPROVED PAPERS',
    },
    {
      href: '/incentive',
      icon: Wallet,
      title: 'Incentive Application',
      description: 'Apply for financial incentives on your approved SCI, ESCI, Conference, Book, Patent or Citation publications.',
      buttonText: 'Apply for incentive →',
      stat: stats.incentives,
      statLabel: 'EARNED',
    },
    {
      href: '/seed-fund',
      icon: FlaskConical,
      title: 'Seed Fund Application',
      description: 'Apply for research seed funding — from initial screening through final project documentation.',
      buttonText: 'Open Seed Fund →',
      stat: stats.projects,
      statLabel: 'TOTAL PROJECTS',
    },
  ]

  const handleOpenEdit = () => {
    setEditForm({
      name: faculty.name,
      designation: faculty.designation,
      dept: faculty.dept,
      type: faculty.type || ''
    })
    setIsEditing(true)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingProfile(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const payload: any = {}
      if (editForm.name !== faculty.name) payload.requested_name = editForm.name
      if (editForm.designation !== faculty.designation) payload.requested_designation = editForm.designation
      if (editForm.dept !== faculty.dept) payload.requested_dept = editForm.dept
      if (editForm.type !== faculty.type) payload.requested_type = editForm.type

      const res = await fetch('/api/profile/edit-request', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        const data = await res.json()
        setProfileReq(data)
        setIsEditing(false)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to submit request')
      }
    } catch (err) {
      alert('Failed to submit request')
    } finally {
      setSubmittingProfile(false)
    }
  }

  const showPhdToggle = faculty.type === 'Doing Ph.D in SECE' || faculty.type === 'Doing Ph.D in Other Institute'
  const hasChanges = editForm.name !== faculty.name || editForm.designation !== faculty.designation || editForm.dept !== faculty.dept || editForm.type !== faculty.type

  return (
    <div className="bg-blue-50 min-h-full pb-16 selection:bg-indigo-500/30">
      <div className="relative overflow-hidden pt-12 pb-16 px-6 sm:px-12 shadow-inner"
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
            <User className="w-4 h-4 text-cyan-300 drop-shadow-md" /> My Profile
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            {faculty.name}
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm flex items-center justify-center gap-2 max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            <span>{faculty.designation}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{faculty.dept}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded">{faculty.emp_id}</span>
          </p>

          <div className="mt-8 flex items-center justify-center animate-slide-up" style={{animationDelay:'0.3s'}}>
            {profileReq?.status === 'pending' ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 text-white rounded-full text-sm font-medium backdrop-blur-md">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" /> 
                Profile edit request pending approval
              </div>
            ) : (
              <button onClick={handleOpenEdit} className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-indigo-900 rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all group">
                <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                {profileReq?.status === 'rejected' ? 'Review Rejected Request' : 'Edit Profile'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" /> Edit Profile Request
              </h2>
              <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="p-6">
              {profileReq?.status === 'rejected' && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1 text-red-800">Previous Request Rejected</p>
                    <p>{profileReq.rejection_remark}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all" required />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Designation</label>
                  <select value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white" required>
                    {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                  <select value={editForm.dept} onChange={e => setEditForm({...editForm, dept: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-white" required>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {showPhdToggle && (
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors bg-slate-50/50">
                      <input 
                        type="checkbox" 
                        checked={editForm.type === 'Doctorate'} 
                        onChange={e => setEditForm({...editForm, type: e.target.checked ? 'Doctorate' : (faculty.type || '')})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                      />
                      <div>
                        <span className="block font-bold text-slate-800 text-sm">I have completed my PhD</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Request update to Doctorate status</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!hasChanges || submittingProfile} className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                  {submittingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {modules.map((mod, i) => {
            const Icon = mod.icon
            return (
              <div 
                key={mod.href} 
                className="group bg-gradient-to-br from-[var(--brand-blue-start)] to-[var(--brand-blue-end)] rounded-2xl p-6 lg:p-8 text-white flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 shadow-md hover:shadow-xl animate-slide-up"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-white/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-[var(--brand-yellow)] drop-shadow-sm" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl lg:text-4xl font-black tracking-tight">{mod.stat}</div>
                    <div className="text-[10px] lg:text-xs uppercase tracking-widest text-blue-200/90 font-bold mt-1">{mod.statLabel}</div>
                  </div>
                </div>
                
                <div className="flex-grow">
                  <h3 className="text-xl lg:text-2xl font-bold mb-3">{mod.title}</h3>
                  <p className="text-blue-100/90 text-sm leading-relaxed mb-8 pr-2">
                    {mod.description}
                  </p>
                </div>
                
                <div className="mt-auto">
                  <Link href={mod.href} className="inline-flex items-center justify-center gap-2 bg-[var(--brand-yellow)] hover:bg-[#eab308] text-[var(--brand-yellow-text)] font-bold text-sm px-6 py-2.5 rounded-full transition-colors shadow-sm">
                    {mod.buttonText}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Workflow Steps - Paper & Incentive */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden animate-slide-up mb-8" style={{animationDelay:'0.4s'}}>
          <div className="px-8 py-6 border-b border-slate-100 bg-blue-50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">Paper & Incentive Guide</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Follow these steps to submit & claim incentives</p>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div key={step.n} className="relative group p-6 rounded-2xl bg-blue-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                  <div className="absolute -top-4 -right-4 text-7xl font-black text-slate-900/5 transition-colors pointer-events-none">
                    {step.n}
                  </div>
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center text-white text-lg font-black shadow-md group-hover:scale-110 transition-transform">
                      {step.n}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-base mb-2 group-hover:text-blue-600 transition-colors">{step.title}</p>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Steps - Seed Fund */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden animate-slide-up" style={{animationDelay:'0.5s'}}>
          <div className="px-8 py-6 border-b border-slate-100 bg-blue-50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0A3D8F] flex items-center justify-center shadow-lg shadow-blue-900/20">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">Seed Fund Guide</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">End-to-end workflow for seed funding</p>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {seedFundSteps.map((step, i) => (
                <div key={step.n} className="relative group p-6 rounded-2xl bg-blue-50 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                  <div className="absolute -top-4 -right-4 text-7xl font-black text-slate-900/5 transition-colors pointer-events-none">
                    {step.n}
                  </div>
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0A3D8F] flex items-center justify-center text-white text-lg font-black shadow-md group-hover:scale-110 transition-transform">
                      {step.n}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-base mb-2 group-hover:text-blue-800 transition-colors">{step.title}</p>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
