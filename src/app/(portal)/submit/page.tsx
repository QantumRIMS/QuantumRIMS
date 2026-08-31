'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useFaculty } from '@/context/FacultyContext'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Submission } from '@/lib/types'
import {
  Loader2, CheckCircle, AlertCircle, User, BookOpen, Upload, ChevronRight, FileText, ShieldCheck,
  MessageSquareX
} from 'lucide-react'
import { Suspense } from 'react'
import { uploadFile as cloudUpload } from '@/lib/uploadFile'

function FormField({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 tracking-tight">
        {label}{required && <span className="text-blue-600 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 font-medium">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 p-2 rounded-md">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

const inputClass = 'w-full rounded-2xl border-slate-200/60 bg-blue-50/50 px-5 py-3.5 text-slate-800 text-sm placeholder-slate-400 shadow-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all duration-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed font-semibold border hover:border-indigo-200'
const readonlyClass = 'w-full rounded-2xl border-slate-200 bg-slate-100/50 px-5 py-3.5 text-slate-700 text-sm shadow-inner font-bold border cursor-default select-none'

function SubmitPageContent() {
  const faculty = useFaculty()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const formRef = useRef<HTMLFormElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMsg, setSubmitMsg] = useState('')
  
  const [editData, setEditData] = useState<Submission | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)
  const [fileStates, setFileStates] = useState<Record<string, { name: string; size: string; error?: string }>>({})
  const hasFileError = Object.values(fileStates).some(f => f.error)

  useEffect(() => {
    async function fetchEditData() {
      if (!editId) return
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', editId)
        .single()

      if (error || !data) {
        router.replace('/profile')
        return
      }

      // Check ownership and status
      if (data.submitted_by !== session.user.id || data.status !== 'rejected') {
        router.replace('/profile')
        return
      }

      setEditData(data)
      setLoadingEdit(false)
    }

    fetchEditData()
  }, [editId, router])

  const uploadFile = async (file: File | null, _submissionId: string, _key: string): Promise<string | undefined> => {
    if (!file || file.size === 0) return undefined
    return cloudUpload(file, 'paper-proofs')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Check if any file has an active error
    const hasError = Object.values(fileStates).some(f => f.error)
    if (hasError) {
      setSubmitResult('error')
      setSubmitMsg('Please resolve all file upload errors before submitting.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setSubmitResult('idle')
    setSubmitMsg('')
    try {
      const fd = new FormData(e.currentTarget)
      const submissionId = editId || crypto.randomUUID()
      
      const [fullPaperUrl, scopusUrl, publishedUrl] = await Promise.all([
        uploadFile(fd.get('proof_full_paper') as File, submissionId, 'full_paper'),
        uploadFile(fd.get('proof_scopus') as File, submissionId, 'scopus'),
        uploadFile(fd.get('proof_published') as File, submissionId, 'published'),
      ])
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired. Please log in again.')
      
      const payload: any = {
        authors: fd.get('authors'),
        title: fd.get('title'),
        source_title: fd.get('source_title'),
        volume: fd.get('volume'),
        issue: fd.get('issue'),
        year: fd.get('year'),
        doi: (fd.get('doi') as string)?.trim(),
        scopus_link: fd.get('scopus_link'),
        doc_type_scopus: fd.get('doc_type_scopus'),
        doc_type: fd.get('doc_type'),
        doc_type_report: fd.get('doc_type_report'),
        isbn_no: fd.get('isbn_no'),
        issn_no: fd.get('issn_no'),
        publication_date: fd.get('publication_date') || null,
      }

      if (fullPaperUrl) payload.proof_full_paper_url = fullPaperUrl
      if (scopusUrl) payload.proof_scopus_url = scopusUrl
      if (publishedUrl) payload.proof_published_url = publishedUrl

      if (!editId) {
        payload.id = submissionId
      }

      const url = editId ? `/api/submissions/${editId}` : '/api/submissions'
      const method = editId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      
      setSubmitResult('success')
      setSubmitMsg(editId ? 'Your paper has been resubmitted successfully!' : 'Your research paper has been recorded successfully!')
      if (!editId) {
        formRef.current?.reset()
        setFileStates({})
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err: any) {
      setSubmitResult('error')
      setSubmitMsg(err.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEdit) {
    return (
      <div className="bg-blue-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-blue-50 min-h-full selection:bg-indigo-500/30">
      <div className="relative overflow-hidden pt-12 pb-24 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        
        {/* Dynamic Animated Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-cyan-300 drop-shadow-md" /> Research Publication Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            {editId ? 'Edit & Resubmit Paper' : 'Submit a Research Paper'}
          </h1>
          <p className="text-indigo-200 font-medium text-sm mt-4 max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            Your name and department are auto-filled from your account. Fill out the details below to submit your Scopus-indexed research.
          </p>
        </div>
      </div>

      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 -mt-12 pb-16">
        {editData && editData.rejection_remark && (
          <div className="mb-6 p-5 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-full"><MessageSquareX className="w-6 h-6 text-red-600" /></div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Rejection Reason</h3>
              <p className="text-red-700 mt-1 font-medium text-sm">{editData.rejection_remark}</p>
              <p className="text-red-600 mt-2 text-xs font-bold uppercase tracking-wide">Please update the fields below and resubmit</p>
            </div>
          </div>
        )}

        {submitResult === 'success' && (
          <div className="mb-6 p-5 rounded-2xl bg-white border-l-4 border-l-green-500 shadow-lg flex items-start gap-4">
            <div className="p-2 bg-green-50 rounded-full"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">Submission Recorded</h3><p className="text-slate-600 mt-1 font-medium">{submitMsg}</p></div>
          </div>
        )}
        {submitResult === 'error' && (
          <div className="mb-6 p-5 rounded-2xl bg-white border-l-4 border-l-red-500 shadow-lg flex items-start gap-4">
            <div className="p-2 bg-red-50 rounded-full"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">Submission Failed</h3><p className="text-slate-600 mt-1 font-medium">{submitMsg}</p></div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Faculty Info */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 transition-transform duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white dark:from-transparent dark:to-transparent flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
                1
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Your Details</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Auto-filled from your account</p>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <FormField label="Faculty Name">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    <div className={`${readonlyClass} pl-12`}>{faculty.name}</div>
                  </div>
                </FormField>
                <FormField label="Department">
                  <div className="relative group">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    <div className={`${readonlyClass} pl-12`}>{faculty.dept}</div>
                  </div>
                </FormField>
              </div>
            </div>
          </div>

          {/* Step 2: Publication Details */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ring-1 ring-slate-200/60 transition-transform duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white dark:from-transparent dark:to-transparent flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-lg">
                2
              </div>
              <h2 className="text-xl font-black text-slate-800">Publication Details</h2>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <FormField label="Authors" required>
                <input type="text" name="authors" defaultValue={editData?.authors} required className={inputClass} placeholder="e.g. Smith J., Jones B., Patel R." />
              </FormField>
              <FormField label="Title of the Paper" required>
                <textarea name="title" defaultValue={editData?.title} required rows={2} className={`${inputClass} resize-none`} placeholder="Enter the full official title of the publication" />
              </FormField>
              <FormField label="Source Title" required hint="Full name of the Journal or Conference Proceedings">
                <input type="text" name="source_title" defaultValue={editData?.source_title} required className={inputClass} placeholder="e.g. IEEE Transactions on Neural Networks" />
              </FormField>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <FormField label="Volume"><input type="text" name="volume" defaultValue={editData?.volume} className={inputClass} placeholder="e.g. 12" /></FormField>
                <FormField label="Issue"><input type="text" name="issue" defaultValue={editData?.issue} className={inputClass} placeholder="e.g. 3" /></FormField>
                <FormField label="Publication Year" required>
                  <input
                    type="number" name="year" required min={1990} max={2099}
                    defaultValue={editData?.year}
                    className={inputClass} placeholder={String(new Date().getFullYear())}
                  />
                </FormField>
                <FormField label="Date of Publication" hint="Leave blank if unknown">
                  <input
                    type="date" name="publication_date"
                    defaultValue={(editData as any)?.publication_date || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const d = e.target.value
                      if (d) {
                        const yr = new Date(d).getFullYear()
                        const yearInput = e.target.closest('form')?.querySelector<HTMLInputElement>('input[name="year"]')
                        if (yearInput) yearInput.value = String(yr)
                      }
                    }}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <FormField label="DOI" required hint="The unique permanent link to your paper">
                  <input type="text" name="doi" defaultValue={editData?.doi} required className={inputClass} placeholder="10.xxxx/xxxxx" />
                </FormField>
                <FormField label="Scopus Record Link" required hint="Direct URL to your paper on Scopus.com">
                  <input type="url" name="scopus_link" defaultValue={editData?.scopus_link} required className={inputClass} placeholder="https://www.scopus.com/..." />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <FormField label="Scopus Document Type" required>
                  <select name="doc_type_scopus" required className={inputClass} defaultValue={editData?.doc_type_scopus || ""}>
                    <option value="" disabled>Select Type…</option>
                    <option>Article</option><option>Book</option><option>Book chapter</option>
                    <option>Conference paper</option><option>Editorial</option><option>Erratum</option>
                    <option>Retracted</option><option>Review</option>
                  </select>
                </FormField>
                <FormField label="Internal Category" required>
                  <select name="doc_type" required className={inputClass} defaultValue={editData?.doc_type || ""}>
                    <option value="" disabled>Select Category…</option>
                    <option>Student Publication</option><option>Faculty Publication</option><option>Scholar Publication</option>
                  </select>
                </FormField>
                <FormField label="Report Classification" required>
                  <select name="doc_type_report" required className={inputClass} defaultValue={editData?.doc_type_report || ""}>
                    <option value="" disabled>Select Classification…</option>
                    <option>SCI</option><option>Scopus/WoS Journals</option>
                    <option>Scopus/WoS Conference/Book Chapter/Others</option>
                    <option>Student Publication</option><option>Book</option>
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <FormField label="ISBN Number" hint="Only if applicable (Books/Chapters)">
                  <input type="text" name="isbn_no" defaultValue={editData?.isbn_no} className={inputClass} placeholder="978-x-xxxx-xxxx-x" />
                </FormField>
                <FormField label="ISSN Number" hint="Only if applicable (Journals)">
                  <input type="text" name="issn_no" defaultValue={editData?.issn_no} className={inputClass} placeholder="xxxx-xxxx" />
                </FormField>
              </div>
            </div>
          </div>

          {/* Step 3: File uploads */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-200">
            <div className="px-6 py-5 border-b border-slate-100 bg-blue-50/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-inner shadow-blue-900/20">
                <span className="text-white font-bold text-lg">3</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800">Upload Proofs</h2>
            </div>
            <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { name: 'proof_full_paper', label: 'Full Paper', accept: '.pdf,.doc,.docx', hint: 'PDF / Word format', existingUrl: editData?.proof_full_paper_url },
                { name: 'proof_scopus', label: 'Scopus Record', accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF or Screenshot', existingUrl: editData?.proof_scopus_url },
                { name: 'proof_published', label: 'Published Proof', accept: '.pdf,.jpg,.jpeg,.png', hint: 'First page / Acceptance', existingUrl: editData?.proof_published_url },
              ].map(({ name, label, accept, hint, existingUrl }) => (
                <div key={name} className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-300" />
                  <div className="relative p-5 rounded-xl border border-slate-200 bg-blue-50 group-hover:bg-white transition-colors h-full flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1">{label}</h3>
                      <p className="text-xs text-slate-500 font-medium mb-4">{hint}</p>
                    </div>
                    <div className="relative">
                      <input type="file" name={name} accept={accept} required={!existingUrl}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const sizeMB = file.size / (1024 * 1024)
                            const sizeStr = `${sizeMB.toFixed(2)} MB`
                            if (file.size > 1 * 1024 * 1024) {
                              setFileStates(prev => ({
                                ...prev,
                                [name]: { name: file.name, size: sizeStr, error: `File is ${sizeStr} — must be under 1MB` }
                              }))
                              e.target.value = '' // Clear input
                            } else {
                              setFileStates(prev => ({
                                ...prev,
                                [name]: { name: file.name, size: sizeStr }
                              }))
                            }
                          } else {
                            setFileStates(prev => {
                              const copy = { ...prev }
                              delete copy[name]
                              return copy
                            })
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 font-semibold text-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                          <Upload className="w-4 h-4" /> {existingUrl ? 'Replace File' : 'Choose File'}
                        </div>
                        {fileStates[name]?.name && (
                          <div className="text-xs font-semibold text-slate-600 text-center break-all">
                            {fileStates[name].name} ({fileStates[name].size})
                          </div>
                        )}
                        {fileStates[name]?.error && (
                          <div className="text-xs font-bold text-red-600 text-center mt-1">
                            {fileStates[name].error}
                          </div>
                        )}
                        {existingUrl && !fileStates[name]?.name && (
                          <div className="text-xs text-slate-500 font-medium text-center">
                            (File already uploaded)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          {!hasFileError && (
            <button id="submit-btn" type="submit" disabled={submitting} className="w-full relative group overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 bg-[length:200%_auto] group-hover:animate-gradient" />
              <div className="relative flex items-center justify-center gap-2 py-5 px-6 text-white font-black text-lg shadow-xl transition-transform active:scale-[0.98]">
                {submitting ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                ) : (
                  <>{editId ? 'Submit Revised Paper' : 'Submit Research Publication'} <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                )}
              </div>
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-blue-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}>
      <SubmitPageContent />
    </Suspense>
  )
}
