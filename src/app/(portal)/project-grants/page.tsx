'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Briefcase, FileText, Loader2, UploadCloud, CheckCircle2, AlertCircle, MessageSquareX, Download, CheckSquare, Edit3 } from 'lucide-react'
import { useFaculty } from '@/context/FacultyContext'
import { saveAs } from 'file-saver'
import { uploadFile as cloudUpload } from '@/lib/uploadFile'

export default function ProjectGrantsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const faculty = useFaculty()
  const facultyLoading = !faculty

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  
  const [file, setFile] = useState<{ file: File | null; url: string | null; uploading: boolean }>({ file: null, url: null, uploading: false })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editId) {
      fetchEditData()
    } else {
      setLoading(false)
    }
  }, [editId])

  const fetchEditData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('project_grant_applications')
      .select('*')
      .eq('id', editId)
      .eq('applicant_id', session.user.id)
      .single()

    if (!error && data) {
      setEditData(data)
      setFile({ file: null, url: data.proposal_form_url, uploading: false })
    }
    setLoading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const sizeMB = selectedFile.size / (1024 * 1024)
    const sizeStr = `${sizeMB.toFixed(2)} MB`
    if (selectedFile.size > 1 * 1024 * 1024) {
      setFile({ file: selectedFile, url: null, uploading: false, error: `File is ${sizeStr} — must be under 1MB` } as any)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(s => ({ ...s, file: selectedFile, uploading: true, error: undefined } as any))
    try {
      const url = await cloudUpload(selectedFile, 'project-grants')
      setFile({ file: selectedFile, url, uploading: false })
    } catch (err: any) {
      alert(err.message)
      setFile(s => ({ ...s, uploading: false }))
    }
  }

  const handleDownloadProposal = async () => {
    if (!formRef.current || isGeneratingProposal) return
    const formData = new FormData(formRef.current)
    const title = formData.get('research_project_title') as string
    
    if (!title) {
       alert("Please fill 'Research Project Title' before downloading the proposal form.")
       return
    }
    
    setIsGeneratingProposal(true)
    const data = {
      research_project_title: title,
      funding_agency: formData.get('funding_agency') as string,
      project_announcement_details: formData.get('project_announcement_details') as string,
      submission_deadline: formData.get('submission_deadline') as string,
      co_investigators: formData.get('co_investigators') as string,
      collaborating_industry: formData.get('collaborating_industry') as string,
      project_duration_months: formData.get('project_duration_months') as string,
      total_proposed_budget: formData.get('total_proposed_budget') as string,
      external_reviewer_feedback: formData.get('external_reviewer_feedback') as string,
      expected_outcomes_papers: formData.get('expected_outcomes_papers') as string,
      expected_outcomes_patents: formData.get('expected_outcomes_patents') as string,
      expected_outcomes_infrastructure: formData.get('expected_outcomes_infrastructure') as string,
      additional_resources: formData.get('additional_resources') as string
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/project-grants/generate-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })

      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      saveAs(blob, `Project-Grant-Proposal-${title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!faculty) return

    if ((file as any).error) {
      alert("Please resolve all file upload errors before submitting.")
      return
    }

    if (!file.url) {
      alert("Please upload the signed Proposal Form.")
      return
    }

    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const payload = {
      research_project_title: formData.get('research_project_title'),
      funding_agency: formData.get('funding_agency'),
      project_announcement_details: formData.get('project_announcement_details'),
      submission_deadline: formData.get('submission_deadline'),
      co_investigators: formData.get('co_investigators'),
      collaborating_industry: formData.get('collaborating_industry'),
      project_duration_months: formData.get('project_duration_months') ? parseFloat(formData.get('project_duration_months') as string) : null,
      total_proposed_budget: formData.get('total_proposed_budget') ? parseFloat(formData.get('total_proposed_budget') as string) : null,
      external_reviewer_feedback: formData.get('external_reviewer_feedback'),
      expected_outcomes_papers: formData.get('expected_outcomes_papers'),
      expected_outcomes_patents: formData.get('expected_outcomes_patents'),
      expected_outcomes_infrastructure: formData.get('expected_outcomes_infrastructure'),
      additional_resources: formData.get('additional_resources'),
      proposal_form_url: file.url
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const endpoint = editId ? `/api/project-grants/${editId}` : '/api/project-grants/apply'
      const method = editId ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      router.push('/project-grants/history')
    } catch (err: any) {
      alert(err.message)
      setSubmitting(false)
    }
  }

  if (loading || facultyLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0A3D8F]" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0A3D8F] to-[#0A3D8F]/80 p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold mb-6 backdrop-blur-md">
            <CheckSquare className="w-4 h-4 text-[#FDB813]" /> PROJECT GRANTS
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Apply for a Project Grant</h1>
          <p className="text-blue-100 text-lg max-w-2xl font-medium leading-relaxed">
            Fill out the details below to generate your Project Grant Proposal Form. Once generated, get it signed and upload it back here.
          </p>
        </div>
      </div>

      {editData?.status === 'rejected' && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
          <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0"><MessageSquareX className="w-6 h-6" /></div>
          <div>
            <h3 className="font-bold text-red-900 text-lg mb-1">Application Rejected</h3>
            <p className="text-red-700 font-medium mb-3">Please address the following remarks and resubmit your application.</p>
            <div className="bg-white px-4 py-3 rounded-xl border border-red-100 text-red-800 text-sm font-semibold">
              &quot;{editData.rejection_remark}&quot;
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1 */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group hover:border-[#0A3D8F]/20 transition-colors">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#FDB813]" />
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A3D8F]/10 text-[#0A3D8F] text-sm">1</span>
            General Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Research Project Title <span className="text-red-500">*</span></label>
              <input required name="research_project_title" defaultValue={editData?.research_project_title} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all placeholder:font-normal" placeholder="Enter full project title" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">PI Name</label>
              <input disabled type="text" value={faculty?.name || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold rounded-xl px-4 py-3 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
              <input disabled type="text" value={faculty?.dept || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-500 text-sm font-semibold rounded-xl px-4 py-3 cursor-not-allowed" />
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group hover:border-[#0A3D8F]/20 transition-colors">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#FDB813]" />
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A3D8F]/10 text-[#0A3D8F] text-sm">2</span>
            Funding Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Funding Agency (Name and Address)</label>
              <input name="funding_agency" defaultValue={editData?.funding_agency} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Project Announcement Details (Date/Scheme)</label>
              <input name="project_announcement_details" defaultValue={editData?.project_announcement_details} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Submission Deadline</label>
              <input name="submission_deadline" defaultValue={editData?.submission_deadline} type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group hover:border-[#0A3D8F]/20 transition-colors">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#FDB813]" />
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A3D8F]/10 text-[#0A3D8F] text-sm">3</span>
            Project Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Co-Investigator(s) (if any)</label>
              <input name="co_investigators" defaultValue={editData?.co_investigators} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Collaborating Industry (if any)</label>
              <input name="collaborating_industry" defaultValue={editData?.collaborating_industry} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Project Duration (Months)</label>
              <input name="project_duration_months" defaultValue={editData?.project_duration_months} type="number" step="0.1" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Total Proposed Budget (₹)</label>
              <input name="total_proposed_budget" defaultValue={editData?.total_proposed_budget} type="number" step="1" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group hover:border-[#0A3D8F]/20 transition-colors">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#FDB813]" />
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A3D8F]/10 text-[#0A3D8F] text-sm">4</span>
            Expected Outcomes & Resources
          </h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Research Papers</label>
                <input name="expected_outcomes_papers" defaultValue={editData?.expected_outcomes_papers || '0'} type="number" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Patents</label>
                <input name="expected_outcomes_patents" defaultValue={editData?.expected_outcomes_patents || '0'} type="number" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Addition of Infrastructure</label>
                <input name="expected_outcomes_infrastructure" defaultValue={editData?.expected_outcomes_infrastructure} type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all" placeholder="e.g. Yes / No" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Additional Resources / Facilities Required</label>
              <textarea name="additional_resources" defaultValue={editData?.additional_resources} rows={3} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">External Reviewer&apos;s Feedback & Remarks (if any)</label>
              <textarea name="external_reviewer_feedback" defaultValue={editData?.external_reviewer_feedback} rows={3} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-[#0A3D8F] focus:ring-1 focus:ring-[#0A3D8F] transition-all resize-none" />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex flex-col items-center justify-center py-6 px-4 bg-blue-50/50 rounded-3xl border border-blue-100 border-dashed">
          <p className="text-slate-500 font-medium text-sm mb-4 text-center max-w-md">Verify the details above, then download your filled proposal form to be signed and scanned.</p>
          <button 
            type="button" 
            onClick={handleDownloadProposal} 
            disabled={isGeneratingProposal}
            className="group flex items-center gap-3 bg-white border border-[#0A3D8F] text-[#0A3D8F] hover:bg-[#0A3D8F] hover:text-white px-8 py-4 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {isGeneratingProposal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />}
            {isGeneratingProposal ? 'Generating Proposal...' : 'Download Proposal Form'}
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#FDB813]" />
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A3D8F]/10 text-[#0A3D8F] text-sm">5</span>
            Upload Signed Proposal
          </h2>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors hover:bg-slate-100/50">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl shadow-sm ${file.url ? 'bg-emerald-50 text-emerald-600' : (file as any).error ? 'bg-red-50 text-red-600' : 'bg-white text-[#0A3D8F]'}`}>
                {file.url ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Signed Proposal Form <span className="text-red-500">*</span></h3>
                <p className="text-sm font-medium text-slate-500">Scan and upload the printed form with signatures.</p>
                {file.file && (
                  <p className="text-xs font-semibold text-slate-600 mt-1 break-all">
                    {file.file.name} ({(file.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
                {(file as any).error && (
                  <p className="text-xs font-bold text-red-600 mt-1">
                    {(file as any).error}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleUpload} />
              
              {file.url ? (
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200 flex-1 md:flex-none justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">Uploaded</span>
                </div>
              ) : null}

              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={file.uploading}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm border shadow-sm ${
                  file.uploading ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait' :
                  file.url ? 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50' : 
                  (file as any).error ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                  'bg-[#0A3D8F] text-white border-transparent hover:bg-blue-800'
                }`}
              >
                {file.uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : file.url ? <Edit3 className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                {file.uploading ? 'Uploading...' : file.url ? 'Change File' : 'Upload PDF'}
              </button>
            </div>
          </div>
        </div>

        {!(file as any).error && (
          <div className="pt-6">
            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-[#FDB813] hover:bg-yellow-400 text-[#0A3D8F] px-8 py-5 rounded-2xl font-black text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50">
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
              {submitting ? 'Submitting Application...' : (editId ? 'Update & Resubmit Application' : 'Submit Application')}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
