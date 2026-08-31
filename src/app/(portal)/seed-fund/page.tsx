'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FlaskConical, FileText, Loader2, UploadCloud, X, CheckCircle2, Clock, AlertCircle, MessageSquareX, Edit3, Download } from 'lucide-react'
import { useFaculty } from '@/context/FacultyContext'
import { saveAs } from 'file-saver'
import { PROJECT_DOCUMENT_CHECKLIST } from '@/lib/seedFundProjectDocs'
import { uploadFile as cloudUpload } from '@/lib/uploadFile'

function ProjectDocumentsSection({ application, onRefresh }: { application: any, onRefresh: () => void }) {
  const [files, setFiles] = useState<Record<string, { file: File | null; url: string | null; uploading: boolean }>>({})
  const [submitting, setSubmitting] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
  const docs = application.project_documents
  const [isEditing, setIsEditing] = useState(false)

  const handleUpload = async (key: string, selectedFile: File) => {
    const sizeMB = selectedFile.size / (1024 * 1024)
    const sizeStr = `${sizeMB.toFixed(2)} MB`
    if (selectedFile.size > 1 * 1024 * 1024) {
      setFiles(s => ({ ...s, [key]: { file: selectedFile, url: null, uploading: false, error: `File is ${sizeStr} — must be under 1MB` } as any }))
      if (inputRefs.current[key]) inputRefs.current[key]!.value = ''
      return
    }
    setFiles(s => ({ ...s, [key]: { ...s[key], file: selectedFile, uploading: true, error: undefined } }))
    try {
      const url = await cloudUpload(selectedFile, 'seed-fund/project-documents')
      setFiles(s => ({ ...s, [key]: { file: selectedFile, url, uploading: false, error: undefined } }))
    } catch (err: any) {
      alert(err.message)
      setFiles(s => ({ ...s, [key]: { ...s[key], uploading: false } }))
    }
  }

  const hasFileError = Object.values(files).some((f: any) => f?.error)
  const allUploaded = PROJECT_DOCUMENT_CHECKLIST.every(item => files[item.key]?.url)
  const missingDocs = PROJECT_DOCUMENT_CHECKLIST.filter(item => !files[item.key]?.url).map(item => item.label)

  const handleSubmit = async () => {
    if (!allUploaded) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const isUpdate = docs && docs.status === 'rejected' && isEditing
      const url = isUpdate ? `/api/seed-fund/project-documents/${docs.id}` : `/api/seed-fund/project-documents`
      const method = isUpdate ? 'PATCH' : 'POST'

      const bodyData: Record<string, string> = { application_id: application.id }
      PROJECT_DOCUMENT_CHECKLIST.forEach(item => {
        bodyData[item.key] = files[item.key].url!
      })

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(bodyData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit documents')
      }

      setIsEditing(false)
      onRefresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (docs && !isEditing) {
    return (
      <div className="bg-blue-50 rounded-2xl p-6 border border-slate-200 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Final Project Documents
          </h3>
          <div className="flex items-center gap-2">
            {docs.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>}
            {docs.status === 'approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
            {docs.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200"><AlertCircle className="w-3 h-3" /> Rejected</span>}
          </div>
        </div>
        
        {docs.status === 'rejected' && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <MessageSquareX className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Reason for Rejection</p>
                <p className="text-sm font-medium mt-1">{docs.rejection_remark}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                // Pre-fill existing files
                const initialFiles: any = {}
                PROJECT_DOCUMENT_CHECKLIST.forEach(item => {
                  initialFiles[item.key] = { file: null, url: docs[item.key], uploading: false }
                })
                setFiles(initialFiles)
                setIsEditing(true)
              }}
              className="self-start mt-2 px-4 py-2 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit & Resubmit
            </button>
          </div>
        )}

        <div className="space-y-2">
          {PROJECT_DOCUMENT_CHECKLIST.map(item => (
            <div key={item.key} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700 truncate">{item.label}</p>
                <a href={docs[item.key]} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">View File</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 rounded-2xl p-6 border border-slate-200 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs">5</span>
          Step 5: Final Project Documents
        </h3>
      </div>
      
      <p className="text-sm text-slate-600 mb-6 font-medium">Download the templates, fill them by hand, and upload all 9 documents below to complete your project closure.</p>
      
      <div className="space-y-4">
        {PROJECT_DOCUMENT_CHECKLIST.map(item => {
          const fileState = files[item.key] || { file: null, url: null, uploading: false }
          return (
            <div key={item.key} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm mb-1">{item.label} <span className="text-red-500">*</span></p>
                <a href={item.template} download className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download Template
                </a>
              </div>
              <div className="shrink-0 w-full sm:w-auto flex flex-col items-center">
                <div 
                  onClick={() => !fileState.uploading && inputRefs.current[item.key]?.click()}
                  className={`border-2 border-dashed rounded-xl px-4 py-3 text-center cursor-pointer transition-all min-w-[200px] ${fileState.url ? 'border-emerald-300 bg-emerald-50' : (fileState as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-cyan-400 hover:bg-cyan-50/50 bg-blue-50'}`}
                >
                  <input type="file" ref={el => { inputRefs.current[item.key] = el }} className="hidden" accept="application/pdf,.doc,.docx" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) handleUpload(item.key, e.target.files[0])
                  }} />
                  {fileState.uploading ? (
                    <div className="flex items-center justify-center gap-2 text-cyan-600 text-sm font-bold"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>
                  ) : fileState.url ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Uploaded
                      <button type="button" onClick={(e) => { e.stopPropagation(); setFiles(s => ({...s, [item.key]: {file:null,url:null,uploading:false}})); }} className="ml-2 text-[10px] text-red-500 hover:underline uppercase">Remove</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-bold"><UploadCloud className="w-4 h-4" /> Upload File</div>
                  )}
                </div>
                {fileState.file && (
                  <p className="text-xs font-semibold text-slate-600 mt-1 truncate max-w-[200px] text-center">
                    {fileState.file.name} ({(fileState.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
                {(fileState as any).error && (
                  <p className="text-xs font-bold text-red-600 mt-1 text-center max-w-[200px]">
                    {(fileState as any).error}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        
        <div className="flex flex-col items-end gap-3 pt-4 border-t border-slate-200">
          {!allUploaded && (
            <p className="text-xs text-red-500 font-bold max-w-lg text-right">
              Missing: {missingDocs.join(', ')}
            </p>
          )}
          <div className="flex justify-end gap-3">
            {isEditing && (
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 transition-colors">
                Cancel
              </button>
            )}
            {!hasFileError && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !allUploaded}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:bg-slate-400 transition-colors flex items-center gap-2 shadow-sm"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit All Documents'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PPTPresentationSection({ application, onRefresh }: { application: any, onRefresh: () => void }) {
  const [file, setFile] = useState<{ file: File | null; url: string | null; uploading: boolean }>({ file: null, url: null, uploading: false })
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const ppt = application.ppt_submission
  const [isEditing, setIsEditing] = useState(false)

  const handleUpload = async (selectedFile: File) => {
    const sizeMB = selectedFile.size / (1024 * 1024)
    const sizeStr = `${sizeMB.toFixed(2)} MB`
    if (selectedFile.size > 1 * 1024 * 1024) {
      setFile({ file: selectedFile, url: null, uploading: false, error: `File is ${sizeStr} — must be under 1MB` } as any)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(s => ({ ...s, file: selectedFile, uploading: true }))
    try {
      const url = await cloudUpload(selectedFile, 'seed-fund/ppt')
      setFile({ file: selectedFile, url, uploading: false })
    } catch (err: any) {
      alert(err.message)
      setFile(s => ({ ...s, uploading: false }))
    }
  }

  const handleSubmit = async () => {
    if (!file.url) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const isUpdate = ppt && ppt.status === 'rejected' && isEditing
      const url = isUpdate ? `/api/seed-fund/ppt/${ppt.id}` : `/api/seed-fund/ppt`
      const method = isUpdate ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          application_id: application.id,
          ppt_file_url: file.url
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit presentation')
      }

      setIsEditing(false)
      onRefresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (ppt && !isEditing) {
    return (
      <div className="bg-blue-50 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Presentation Submission
          </h3>
          <div className="flex items-center gap-2">
            {ppt.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>}
            {ppt.status === 'approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
            {ppt.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200"><AlertCircle className="w-3 h-3" /> Rejected</span>}
          </div>
        </div>
        
        {ppt.status === 'rejected' && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <MessageSquareX className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-70">Reason for Rejection</p>
                <p className="text-sm font-medium mt-1">{ppt.rejection_remark}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="self-start mt-2 px-4 py-2 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Edit & Resubmit
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">Presentation Document</p>
            <a href={ppt.ppt_file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View Uploaded File</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center text-xs">4</span>
          Step 4: Presentation Submission
        </h3>
        <a href="/templates/PPT%20Template%20for%20presentation%20-%20Seed%20money%20funded%20project%202025-2026.pptx" download className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          <Download className="w-3 h-3" /> Download Template
        </a>
      </div>
      
      <p className="text-sm text-slate-600 mb-4 font-medium">Fill in the template with your project details and upload the completed presentation below.</p>
      
      <div className="space-y-4">
        <div 
          onClick={() => !file.uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${file.url ? 'border-emerald-300 bg-emerald-50' : (file as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-fuchsia-400 hover:bg-fuchsia-50/50 bg-white'}`}
        >
          <input type="file" ref={inputRef} className="hidden" accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(e) => {
            if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0])
          }} />
          {file.uploading ? (
            <div className="flex flex-col items-center text-fuchsia-500"><Loader2 className="w-6 h-6 animate-spin mb-2" /><p className="text-sm font-bold">Uploading...</p></div>
          ) : file.url ? (
            <div className="flex flex-col items-center text-emerald-600"><CheckCircle2 className="w-6 h-6 mb-2" /><p className="text-sm font-bold">Uploaded Successfully</p>
            <button type="button" onClick={(e) => { e.stopPropagation(); setFile({url:null,file:null,uploading:false}); }} className="mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg">Remove File</button></div>
          ) : (
            <div className="flex flex-col items-center text-slate-400"><UploadCloud className="w-6 h-6 text-slate-400 mb-2" /><p className="text-sm font-bold text-slate-600">Click to upload PPT</p></div>
          )}
        </div>
        {file.file && (
          <p className="text-xs font-semibold text-slate-600 text-center mt-2">
            {file.file.name} ({(file.file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}
        {(file as any).error && (
          <p className="text-xs font-bold text-red-600 text-center mt-1">
            {(file as any).error}
          </p>
        )}
        
        <div className="flex justify-end gap-3">
          {isEditing && (
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 transition-colors">
              Cancel
            </button>
          )}
          {!(file as any).error && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !file.url}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Presentation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SeedFundPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const faculty = useFaculty()
  const facultyLoading = !faculty

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  const [editData, setEditData] = useState<any>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [isGeneratingScreening, setIsGeneratingScreening] = useState(false)
  const [isGeneratingRequisition, setIsGeneratingRequisition] = useState(false)
  
  const [isStep1Valid, setIsStep1Valid] = useState(false)
  const [isStep2Valid, setIsStep2Valid] = useState(false)
  const [coInvestigatorCount, setCoInvestigatorCount] = useState<number>(0)

  // File upload state
  const [screeningFile, setScreeningFile] = useState<{ file: File | null; url: string | null; uploading: boolean }>({ file: null, url: null, uploading: false })
  const [requisitionFile, setRequisitionFile] = useState<{ file: File | null; url: string | null; uploading: boolean }>({ file: null, url: null, uploading: false })
  const [projectFile, setProjectFile] = useState<{ file: File | null; url: string | null; uploading: boolean }>({ file: null, url: null, uploading: false })
  
  const screeningInputRef = useRef<HTMLInputElement>(null)
  const requisitionInputRef = useRef<HTMLInputElement>(null)
  const projectInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (editId) fetchEditData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const fetchApplications = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('seed_fund_applications')
      .select('*')
      .eq('applicant_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      const { data: ppts } = await supabase
        .from('seed_fund_ppt_submissions')
        .select('*')
        .eq('applicant_id', session.user.id)

      const { data: docs } = await supabase
        .from('seed_fund_project_documents')
        .select('*')
        .eq('applicant_id', session.user.id)

      const appsWithPpts = data.map(app => ({
        ...app,
        ppt_submission: ppts?.find(p => p.application_id === app.id) || null,
        project_documents: docs?.find(d => d.application_id === app.id) || null
      }))
      setApplications(appsWithPpts)
    }
    setLoading(false)
  }

  const fetchEditData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('seed_fund_applications')
      .select('*')
      .eq('id', editId)
      .eq('applicant_id', session.user.id)
      .single()

    if (!error && data) {
      setEditData(data)
      setScreeningFile(s => ({ ...s, url: data.screening_form_url }))
      setRequisitionFile(s => ({ ...s, url: data.requisition_form_url }))
      setProjectFile(s => ({ ...s, url: data.project_document_url }))
      if (data.co_investigators) {
        setCoInvestigatorCount(data.co_investigators.split('\n').filter(Boolean).length)
      }
    }
  }

  const handleFormChange = () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current)
      const title = formData.get('title') as string
      const pi = formData.get('pi_name_designation') as string
      
      setIsStep1Valid(!!(title && pi))
      
      const amt = formData.get('amount_requested') as string
      const obj = formData.get('objectives') as string
      const expected = formData.get('expected_utilization') as string
      
      setIsStep2Valid(!!(title && pi && amt && obj && expected))
    }
  }

  useEffect(() => {
    if (!loading) {
      setTimeout(handleFormChange, 100)
    }
  }, [loading, editData, faculty])

  const handleFileUpload = async (selectedFile: File, type: 'screening' | 'requisition' | 'project') => {
    if (!selectedFile) return
    const sizeMB = selectedFile.size / (1024 * 1024)
    const sizeStr = `${sizeMB.toFixed(2)} MB`
    const setState = type === 'screening' ? setScreeningFile : type === 'requisition' ? setRequisitionFile : setProjectFile
    const ref = type === 'screening' ? screeningInputRef : type === 'requisition' ? requisitionInputRef : projectInputRef

    if (selectedFile.size > 1 * 1024 * 1024) {
      setState({ file: selectedFile, url: null, uploading: false, error: `File is ${sizeStr} — must be under 1MB` } as any)
      if (ref.current) ref.current.value = ''
      return
    }

    setState(s => ({ ...s, file: selectedFile, uploading: true, error: undefined } as any))
    try {
      const url = await cloudUpload(selectedFile, 'seed-fund/application')
      setState({ file: selectedFile, url, uploading: false, error: undefined } as any)
    } catch (err: any) {
      alert(err.message)
      setState(s => ({ ...s, uploading: false }))
    }
  }

  const handleDownloadScreening = async () => {
    if (!formRef.current || isGeneratingScreening) return
    const formData = new FormData(formRef.current)
    const title = formData.get('title') as string
    const pi_name_designation = formData.get('pi_name_designation') as string
    
    if (!title || !pi_name_designation) {
       alert("Please fill 'Project Title' and 'Principal Investigator' before downloading the screening form.")
       return
    }
    
    setIsGeneratingScreening(true)
    const data = {
      title,
      funding_agency: formData.get('funding_agency') as string,
      announcement_details: formData.get('announcement_details') as string,
      pi_name_designation,
      co_investigators: Array.from({ length: coInvestigatorCount }).map((_, i) => formData.get(`co_investigator_${i}`) as string).filter(Boolean).join('\n')
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/seed-fund/generate-screening-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })

      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      saveAs(blob, `Screening-Form-${title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingScreening(false)
    }
  }

  const handleDownloadRequisition = async () => {
    if (!formRef.current || isGeneratingRequisition) return
    const formData = new FormData(formRef.current)
    const title = formData.get('title') as string
    const pi_name_designation = formData.get('pi_name_designation') as string
    const amount_requested = formData.get('amount_requested') as string
    const objectives = formData.get('objectives') as string
    const expected_utilization = formData.get('expected_utilization') as string
    
    if (!title || !pi_name_designation || !amount_requested || !objectives || !expected_utilization) {
       alert("Please fill all required fields in Step 1 & 2 before downloading the requisition form.")
       return
    }
    
    setIsGeneratingRequisition(true)
    const data = {
      title,
      amount_requested: parseFloat(amount_requested),
      objectives,
      expected_utilization,
      pi_name_designation,
      co_investigators: Array.from({ length: coInvestigatorCount }).map((_, i) => formData.get(`co_investigator_${i}`) as string).filter(Boolean).join('\n'),
      proposed_location: formData.get('proposed_location') as string,
      duration_months: formData.get('duration_months') ? parseInt(formData.get('duration_months') as string) : null,
      reviewer_feedback: formData.get('reviewer_feedback') as string,
      expected_outcomes: formData.get('expected_outcomes') as string,
      additional_resources: formData.get('additional_resources') as string,
      collaborating_industry: formData.get('collaborating_industry') as string
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/seed-fund/generate-requisition-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })

      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      saveAs(blob, `Requisition-Form-${title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingRequisition(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!faculty) return
    if (!screeningFile.url) {
      alert('Please upload the Signed Screening Form in Step 3.')
      return
    }
    if (!requisitionFile.url) {
      alert('Please upload the Signed Requisition Form in Step 3.')
      return
    }
    if (!projectFile.url) {
      alert('Please upload the Project Proposal Document in Step 3.')
      return
    }

    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      title: formData.get('title') as string,
      funding_agency: formData.get('funding_agency') as string,
      announcement_details: formData.get('announcement_details') as string,
      pi_name_designation: formData.get('pi_name_designation') as string,
      co_investigators: Array.from({ length: coInvestigatorCount }).map((_, i) => formData.get(`co_investigator_${i}`) as string).filter(Boolean).join('\n'),
      amount_requested: parseFloat(formData.get('amount_requested') as string),
      objectives: formData.get('objectives') as string,
      expected_utilization: formData.get('expected_utilization') as string,
      proposed_location: formData.get('proposed_location') as string,
      duration_months: formData.get('duration_months') ? parseInt(formData.get('duration_months') as string) : null,
      reviewer_feedback: formData.get('reviewer_feedback') as string,
      expected_outcomes: formData.get('expected_outcomes') as string,
      additional_resources: formData.get('additional_resources') as string,
      collaborating_industry: formData.get('collaborating_industry') as string,
      screening_form_url: screeningFile.url,
      requisition_form_url: requisitionFile.url,
      project_document_url: projectFile.url
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const url = editId ? `/api/seed-fund/${editId}` : '/api/seed-fund/apply'
      const method = editId ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit application')
      }

      alert(editId ? 'Application resubmitted successfully!' : 'Application submitted successfully!')
      if (!editId) {
        formRef.current?.reset()
        setScreeningFile({ file: null, url: null, uploading: false })
        setRequisitionFile({ file: null, url: null, uploading: false })
        setProjectFile({ file: null, url: null, uploading: false })
      } else {
        router.push('/seed-fund')
      }
      fetchApplications()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (facultyLoading || (editId && !editData)) {
    return <div className="min-h-screen bg-blue-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  const inputClass = "w-full bg-blue-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
  const labelClass = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
  const sectionTitleClass = "text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 pb-2 border-b border-slate-100 mb-6"

  return (
    <div className="bg-blue-50 min-h-full pb-16 selection:bg-indigo-500/30">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden pt-12 pb-24 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        
        {/* Dynamic Animated Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-60">
          <div className="absolute -top-10 left-[10%] w-[40%] h-[40%] bg-indigo-500/40 mix-blend-screen filter blur-[80px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-fuchsia-500/30 mix-blend-screen filter blur-[80px] animate-blob animation-delay-2000" />
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="relative z-10 w-full mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
            <FlaskConical className="w-4 h-4 text-cyan-300 drop-shadow-md" /> Seed Fund Application
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            {editId ? 'Edit & Resubmit Application' : 'Apply for Seed Fund'}
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            Apply for research seed funding by filling out the requisition and proposal forms.
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 -mt-12 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div />
          {editId && (
            <button onClick={() => router.push('/seed-fund')} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 transition-colors shadow-sm">
              Cancel Edit
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {editId && editData?.rejection_remark && (
            <div className="bg-red-50 border-b border-red-100 p-6 flex gap-4">
              <MessageSquareX className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-1">Reason for Rejection</h3>
                <p className="text-sm font-medium text-red-700">{editData.rejection_remark}</p>
              </div>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} onChange={handleFormChange} className="divide-y divide-slate-100">
            {/* STEP 1 */}
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">1</span> 
                  Initial Request / Screening Details
                </h2>
                {isStep1Valid && (
                  <button type="button" onClick={handleDownloadScreening} disabled={isGeneratingScreening} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 disabled:opacity-50">
                    {isGeneratingScreening ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} 
                    {isGeneratingScreening ? 'Generating...' : 'Download Screening Form'}
                  </button>
                )}
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Project Title <span className="text-red-500">*</span></label>
                  <textarea name="title" required rows={2} className={inputClass} placeholder="Enter full title..." defaultValue={editData?.title || ''} />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Funding Agency (Optional)</label>
                    <input type="text" name="funding_agency" className={inputClass} placeholder="If applicable..." defaultValue={editData?.funding_agency || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Announcement Details (Optional)</label>
                    <input type="text" name="announcement_details" className={inputClass} placeholder="Date of event, etc..." defaultValue={editData?.announcement_details || ''} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Principal Investigator <span className="text-red-500">*</span></label>
                  <input type="text" name="pi_name_designation" required className={inputClass} defaultValue={editData?.pi_name_designation || `${faculty?.name}, ${faculty?.designation}`} />
                </div>

                <div>
                  <label className={labelClass}>Co-Investigator(s) (Optional)</label>
                  <select 
                    value={coInvestigatorCount} 
                    onChange={(e) => {
                      setCoInvestigatorCount(parseInt(e.target.value))
                      setTimeout(handleFormChange, 100)
                    }}
                    className={`${inputClass} mb-4`}
                  >
                    <option value={0}>0 (No Co-Investigator)</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>

                  {coInvestigatorCount > 0 && (
                    <div className="space-y-3">
                      {Array.from({ length: coInvestigatorCount }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm mt-1">{i + 1}</span>
                          <textarea 
                            name={`co_investigator_${i}`} 
                            rows={2} 
                            className={inputClass} 
                            placeholder="Name & Designation..." 
                            defaultValue={editData?.co_investigators ? editData.co_investigators.split('\n').filter(Boolean)[i] : ''} 
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="p-8 space-y-8 bg-blue-50/50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">2</span> 
                  Seed Money Requisition
                </h2>
                {isStep2Valid && (
                  <button type="button" onClick={handleDownloadRequisition} disabled={isGeneratingRequisition} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 disabled:opacity-50">
                    {isGeneratingRequisition ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {isGeneratingRequisition ? 'Generating...' : 'Download Requisition Form'}
                  </button>
                )}
              </div>
              
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Amount Requested (₹) <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400 font-bold">₹</span>
                      <input type="number" name="amount_requested" required min="1" step="0.01" className={`${inputClass} pl-8`} placeholder="0.00" defaultValue={editData?.amount_requested || ''} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Duration (Months) (Optional)</label>
                    <input type="number" name="duration_months" min="1" className={inputClass} placeholder="e.g. 12" defaultValue={editData?.duration_months || ''} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Objectives <span className="text-red-500">*</span></label>
                  <textarea name="objectives" required rows={3} className={inputClass} placeholder="Project objectives..." defaultValue={editData?.objectives || ''} />
                </div>

                <div>
                  <label className={labelClass}>Expected Utilization <span className="text-red-500">*</span></label>
                  <textarea name="expected_utilization" required rows={3} className={inputClass} placeholder="How the funds will be used..." defaultValue={editData?.expected_utilization || ''} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Proposed Location (Optional)</label>
                    <input type="text" name="proposed_location" className={inputClass} placeholder="Where the work will be done..." defaultValue={editData?.proposed_location || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Collaborating Industry (Optional)</label>
                    <input type="text" name="collaborating_industry" className={inputClass} placeholder="Industry partners..." defaultValue={editData?.collaborating_industry || ''} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Expected Outcomes (Optional)</label>
                  <textarea name="expected_outcomes" rows={2} className={inputClass} placeholder="Publications, patents, etc..." defaultValue={editData?.expected_outcomes || ''} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>External Reviewer Feedback (Optional)</label>
                    <textarea name="reviewer_feedback" rows={2} className={inputClass} defaultValue={editData?.reviewer_feedback || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Additional Resources (Optional)</label>
                    <textarea name="additional_resources" rows={2} className={inputClass} defaultValue={editData?.additional_resources || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">3</span> 
                  Project Document
                </h2>
                <a href="/templates/seed-fund-proposal-template.pdf" download className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Download Template</a>
              </div>
              
              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-sm font-bold text-blue-900 mb-2">Instructions</h3>
                <ol className="list-decimal list-inside text-sm text-blue-800/80 space-y-1 font-medium">
                  <li>Download the seed fund proposal template using the link above.</li>
                  <li>Fill out all details completely.</li>
                  <li>Print, sign, and scan the document as a PDF.</li>
                  <li>Upload the scanned PDF below.</li>
                </ol>
              </div>

              <div className="space-y-6">
                
                {/* Upload Screening */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <label className={labelClass}>Upload Signed Screening Form <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500 mb-4">The printed, signed, and scanned copy of the form downloaded in Step 1.</p>
                  <div 
                    onClick={() => !screeningFile.uploading && screeningInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${screeningFile.url ? 'border-emerald-300 bg-emerald-50' : (screeningFile as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 bg-blue-50/50'}`}
                  >
                    <input type="file" ref={screeningInputRef} className="hidden" accept="application/pdf" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], 'screening')
                    }} />
                    {screeningFile.uploading ? (
                      <div className="flex flex-col items-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p className="text-sm font-bold">Uploading...</p></div>
                    ) : screeningFile.url ? (
                      <div className="flex flex-col items-center text-emerald-600"><CheckCircle2 className="w-8 h-8 mb-2" /><p className="text-sm font-bold">Uploaded Successfully</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setScreeningFile({url:null,file:null,uploading:false}); }} className="mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg">Remove File</button></div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400"><UploadCloud className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-bold text-slate-600">Click to upload PDF</p></div>
                    )}
                  </div>
                  {screeningFile.file && (
                    <p className="text-xs font-semibold text-slate-600 text-center mt-2 break-all">
                      {screeningFile.file.name} ({(screeningFile.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  {(screeningFile as any).error && (
                    <p className="text-xs font-bold text-red-600 text-center mt-1">
                      {(screeningFile as any).error}
                    </p>
                  )}
                </div>

                {/* Upload Requisition */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <label className={labelClass}>Upload Signed Requisition Form <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500 mb-4">The printed, signed, and scanned copy of the form downloaded in Step 2.</p>
                  <div 
                    onClick={() => !requisitionFile.uploading && requisitionInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${requisitionFile.url ? 'border-emerald-300 bg-emerald-50' : (requisitionFile as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 bg-blue-50/50'}`}
                  >
                    <input type="file" ref={requisitionInputRef} className="hidden" accept="application/pdf" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], 'requisition')
                    }} />
                    {requisitionFile.uploading ? (
                      <div className="flex flex-col items-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p className="text-sm font-bold">Uploading...</p></div>
                    ) : requisitionFile.url ? (
                      <div className="flex flex-col items-center text-emerald-600"><CheckCircle2 className="w-8 h-8 mb-2" /><p className="text-sm font-bold">Uploaded Successfully</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setRequisitionFile({url:null,file:null,uploading:false}); }} className="mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg">Remove File</button></div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400"><UploadCloud className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-bold text-slate-600">Click to upload PDF</p></div>
                    )}
                  </div>
                  {requisitionFile.file && (
                    <p className="text-xs font-semibold text-slate-600 text-center mt-2 break-all">
                      {requisitionFile.file.name} ({(requisitionFile.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  {(requisitionFile as any).error && (
                    <p className="text-xs font-bold text-red-600 text-center mt-1">
                      {(requisitionFile as any).error}
                    </p>
                  )}
                </div>

                {/* Upload Project Proposal */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <label className={labelClass}>Upload Project Proposal Document <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500 mb-4">The filled out official project proposal document based on the template.</p>
                  <div 
                    onClick={() => !projectFile.uploading && projectInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${projectFile.url ? 'border-emerald-300 bg-emerald-50' : (projectFile as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 bg-blue-50/50'}`}
                  >
                    <input type="file" ref={projectInputRef} className="hidden" accept="application/pdf" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0], 'project')
                    }} />
                    {projectFile.uploading ? (
                      <div className="flex flex-col items-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin mb-2" /><p className="text-sm font-bold">Uploading...</p></div>
                    ) : projectFile.url ? (
                      <div className="flex flex-col items-center text-emerald-600"><CheckCircle2 className="w-8 h-8 mb-2" /><p className="text-sm font-bold">Uploaded Successfully</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setProjectFile({url:null,file:null,uploading:false}); }} className="mt-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg">Remove File</button></div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400"><UploadCloud className="w-8 h-8 text-slate-400 mb-2" /><p className="text-sm font-bold text-slate-600">Click to upload PDF</p></div>
                    )}
                  </div>
                  {projectFile.file && (
                    <p className="text-xs font-semibold text-slate-600 text-center mt-2 break-all">
                      {projectFile.file.name} ({(projectFile.file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                  {(projectFile as any).error && (
                    <p className="text-xs font-bold text-red-600 text-center mt-1">
                      {(projectFile as any).error}
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* SUBMIT BUTTON */}
            {!((screeningFile as any).error || (requisitionFile as any).error || (projectFile as any).error) && (
              <div className="p-6 sm:p-8 bg-blue-50 flex items-center justify-end gap-4">
                <button
                  type="submit"
                  disabled={submitting || !faculty || !screeningFile.url || !requisitionFile.url || !projectFile.url}
                  className="px-8 py-4 rounded-xl text-sm font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2 uppercase tracking-wider"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    editId ? 'Resubmit Application' : 'Submit Application'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* LIST */}
        {!editId && (
          <div className="space-y-6 pt-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              My Seed Fund Applications
            </h2>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-sm font-medium">Loading applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-slate-400">
                <FlaskConical className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium">No seed fund applications found.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map(app => (
                  <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {app.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200"><Clock className="w-3 h-3" /> Pending Review</span>}
                          {app.status === 'approved' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Approved</span>}
                          {app.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200"><AlertCircle className="w-3 h-3" /> Rejected</span>}
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">{app.title}</h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Submitted: {new Date(app.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      
                      {app.status === 'rejected' && (
                        <button 
                          onClick={() => router.push(`/seed-fund?edit=${app.id}`)}
                          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" /> Edit & Resubmit
                        </button>
                      )}
                    </div>
                    {app.rejection_remark && app.status === 'rejected' && (
                      <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 flex gap-3">
                        <MessageSquareX className="w-5 h-5 shrink-0 mt-0.5 opacity-70" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Reason for Rejection</p>
                          <p className="text-sm font-medium">{app.rejection_remark}</p>
                        </div>
                      </div>
                    )}
                    
                    {app.status === 'approved' && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <PPTPresentationSection 
                          application={app} 
                          onRefresh={fetchApplications}
                        />
                        {app.ppt_submission?.status === 'approved' && (
                          <ProjectDocumentsSection
                            application={app}
                            onRefresh={fetchApplications}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
