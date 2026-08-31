'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Briefcase, FileText, Loader2, UploadCloud, CheckCircle2, AlertCircle, MessageSquareX, Edit3, Download, Clock } from 'lucide-react'
import { useFaculty } from '@/context/FacultyContext'
import { saveAs } from 'file-saver'
import { uploadFile as cloudUpload } from '@/lib/uploadFile'

const DOCUMENT_CHECKLIST = [
  { key: 'proposal_form_url', label: 'Signed Proposal Form', template: null },
  { key: 'mou_url', label: 'Memorandum of Understanding', template: '/templates/consultancy/CFRD_CON_MOU_02 - MEMORANDUM OF UNDERSTANDING FOR CONSULTANCY SERVICES.docx' },
  { key: 'work_monitoring_url', label: 'Work Monitoring Form', template: '/templates/consultancy/CFRD_CON_WM_03 - CONSULTANCY WORK MONITORING FORM.docx' },
  { key: 'payment_receipt_url', label: 'Payment Receipt Form', template: '/templates/consultancy/CFRD_CON_PR_04 - CONSULTANCY PAYMENT RECEIPT FORM.docx' },
  { key: 'work_expense_report_url', label: 'Work Expense Report', template: '/templates/consultancy/CFRD_CON_WE_05 - CONSULTANCY WORK EXPENSE REPORT.docx' },
  { key: 'expenditure_documentation_checklist_url', label: 'Expenditure Documentation Checklist', template: '/templates/consultancy/CFRD_CON_ED_06 - CONSULTANCY EXPENDITURE DOCUMENTATION CHECKLIST.docx' },
  { key: 'audit_statement_url', label: 'Audit Statement', template: '/templates/consultancy/CFRD_CON_AS_07 - CONSULTANCY AUDIT STATEMENT.docx' },
  { key: 'agreement_closure_url', label: 'Agreement Closure Form', template: '/templates/consultancy/CFRD_CON_ACF_08 - CONSULTANCY AGREEMENT CLOSURE FORM.docx' },
  { key: 'revenue_sharing_url', label: 'Revenue Sharing Form', template: '/templates/consultancy/CFRD_CON_RS_09 - CONSULTANCY REVENUE SHARING FORM.docx' },
  { key: 'closer_checklist_url', label: 'Closer Checklist', template: '/templates/consultancy/CFRD_CON_RS_10 - CONSULTANCY Closer Checklist Ver 2.0.docx' },
]

export default function ConsultancyPage() {
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
  const [paymentTerms, setPaymentTerms] = useState('advance')
  
  // File upload state for all 10 documents
  const [files, setFiles] = useState<Record<string, { file: File | null; url: string | null; uploading: boolean }>>({})
  const hasFileError = Object.values(files).some((f: any) => f?.error)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

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
      .from('consultancy_applications')
      .select('*')
      .eq('id', editId)
      .eq('applicant_id', session.user.id)
      .single()

    if (!error && data) {
      setEditData(data)
      setPaymentTerms(data.payment_terms)
      
      const initialFiles: any = {}
      DOCUMENT_CHECKLIST.forEach(item => {
        initialFiles[item.key] = { file: null, url: data[item.key], uploading: false }
      })
      setFiles(initialFiles)
    }
  }

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
      const url = await cloudUpload(selectedFile, 'consultancy')
      setFiles(s => ({ ...s, [key]: { file: selectedFile, url, uploading: false, error: undefined } }))
    } catch (err: any) {
      alert(err.message)
      setFiles(s => ({ ...s, [key]: { ...s[key], uploading: false } }))
    }
  }

  const handleDownloadProposal = async () => {
    if (!formRef.current || isGeneratingProposal) return
    const formData = new FormData(formRef.current)
    const title = formData.get('project_title') as string
    
    if (!title) {
       alert("Please fill 'Project Title' before downloading the proposal form.")
       return
    }
    
    setIsGeneratingProposal(true)
    const data = {
      project_title: title,
      pi_email: formData.get('pi_email') as string,
      pi_mobile: formData.get('pi_mobile') as string,
      client_name: formData.get('client_name') as string,
      client_city: formData.get('client_city') as string,
      client_state: formData.get('client_state') as string,
      client_pincode: formData.get('client_pincode') as string,
      contact_person_name: formData.get('contact_person_name') as string,
      contact_designation: formData.get('contact_designation') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
      objectives: formData.get('objectives') as string,
      nature_of_work: formData.get('nature_of_work') as string,
      scope_expected_outcomes: formData.get('scope_expected_outcomes') as string,
      deliverables: formData.get('deliverables') as string,
      project_timeline: formData.get('project_timeline') as string,
      consultancy_fee: parseFloat(formData.get('consultancy_fee') as string) || null,
      payment_terms: paymentTerms,
      payment_terms_schedule: formData.get('payment_terms_schedule') as string,
      involves_ip: formData.get('involves_ip') === 'on',
      requires_ethics_approval: formData.get('requires_ethics_approval') === 'on'
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/consultancy/generate-proposal-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      })

      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      saveAs(blob, `Consultancy-Proposal-${title.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsGeneratingProposal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!faculty) return

    const hasError = Object.values(files).some((f: any) => f.error)
    if (hasError) {
      alert('Please resolve all file upload errors before submitting.')
      return
    }

    const missingDocs = DOCUMENT_CHECKLIST.filter(item => !files[item.key]?.url).map(item => item.label)
    if (missingDocs.length > 0) {
      alert(`Please upload the following missing documents:\n\n${missingDocs.join('\n')}`)
      return
    }

    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    
    const payload: any = {
      project_title: formData.get('project_title') as string,
      pi_email: formData.get('pi_email') as string,
      pi_mobile: formData.get('pi_mobile') as string,
      client_name: formData.get('client_name') as string,
      client_city: formData.get('client_city') as string,
      client_state: formData.get('client_state') as string,
      client_pincode: formData.get('client_pincode') as string,
      contact_person_name: formData.get('contact_person_name') as string,
      contact_designation: formData.get('contact_designation') as string,
      contact_email: formData.get('contact_email') as string,
      contact_phone: formData.get('contact_phone') as string,
      objectives: formData.get('objectives') as string,
      nature_of_work: formData.get('nature_of_work') as string,
      scope_expected_outcomes: formData.get('scope_expected_outcomes') as string,
      deliverables: formData.get('deliverables') as string,
      project_timeline: formData.get('project_timeline') as string,
      consultancy_fee: parseFloat(formData.get('consultancy_fee') as string) || null,
      payment_terms: paymentTerms,
      payment_terms_schedule: formData.get('payment_terms_schedule') as string,
      involves_ip: formData.get('involves_ip') === 'on',
      requires_ethics_approval: formData.get('requires_ethics_approval') === 'on'
    }

    DOCUMENT_CHECKLIST.forEach(item => {
      payload[item.key] = files[item.key].url
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const url = editId ? `/api/consultancy/${editId}` : '/api/consultancy/apply'
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
        setFiles({})
      } else {
        router.push('/consultancy/history')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (facultyLoading || (editId && !editData) || (loading && !editId)) {
    return <div className="min-h-screen bg-blue-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }



  const inputClass = "w-full bg-blue-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
  const labelClass = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"

  return (
    <div className="bg-blue-50 min-h-full pb-16 selection:bg-indigo-500/30">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden pt-12 pb-24 px-6 sm:px-12 shadow-inner"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 50%, #1e3a8a 100%)' }}>
        <div className="relative z-10 w-full mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
            <Briefcase className="w-4 h-4 text-cyan-300 drop-shadow-md" /> Consultancy Project
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200 tracking-tight leading-tight animate-slide-up" style={{animationDelay:'0.1s'}}>
            {editId ? 'Edit & Resubmit Application' : 'Apply for Consultancy Project'}
          </h1>
          <p className="text-indigo-200 mt-4 font-medium text-sm max-w-xl mx-auto animate-slide-up" style={{animationDelay:'0.2s'}}>
            Submit your consultancy proposal and all required documents.
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mx-auto px-4 sm:px-6 -mt-12 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div />
          {editId && (
            <button onClick={() => router.push('/consultancy')} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-blue-50 transition-colors shadow-sm">
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

          <form ref={formRef} onSubmit={handleSubmit} className="divide-y divide-slate-100">
            {/* SECTION 1 */}
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">1</span> 
                  General Information
                </h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Project/Consultancy Title <span className="text-red-500">*</span></label>
                  <textarea name="project_title" required rows={2} className={inputClass} placeholder="Enter full title..." defaultValue={editData?.project_title || ''} />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>PI Name (Auto-filled)</label>
                    <input type="text" readOnly className={`${inputClass} bg-slate-100 text-slate-500`} value={faculty?.name || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Department (Auto-filled)</label>
                    <input type="text" readOnly className={`${inputClass} bg-slate-100 text-slate-500`} value={faculty?.dept || ''} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Email ID <span className="text-red-500">*</span></label>
                    <input type="email" name="pi_email" required className={inputClass} defaultValue={editData?.pi_email || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="pi_mobile" required className={inputClass} defaultValue={editData?.pi_mobile || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="p-8 space-y-8 bg-blue-50/50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">2</span> 
                  Client / Industry Partner Details
                </h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Client/Organization Name <span className="text-red-500">*</span></label>
                  <input type="text" name="client_name" required className={inputClass} defaultValue={editData?.client_name || ''} />
                </div>
                
                <div className="grid sm:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>City <span className="text-red-500">*</span></label>
                    <input type="text" name="client_city" required className={inputClass} defaultValue={editData?.client_city || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>State <span className="text-red-500">*</span></label>
                    <input type="text" name="client_state" required className={inputClass} defaultValue={editData?.client_state || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Pin Code <span className="text-red-500">*</span></label>
                    <input type="text" name="client_pincode" required className={inputClass} defaultValue={editData?.client_pincode || ''} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Contact Person Name <span className="text-red-500">*</span></label>
                    <input type="text" name="contact_person_name" required className={inputClass} defaultValue={editData?.contact_person_name || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Designation <span className="text-red-500">*</span></label>
                    <input type="text" name="contact_designation" required className={inputClass} defaultValue={editData?.contact_designation || ''} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Email ID <span className="text-red-500">*</span></label>
                    <input type="email" name="contact_email" required className={inputClass} defaultValue={editData?.contact_email || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="contact_phone" required className={inputClass} defaultValue={editData?.contact_phone || ''} />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3 */}
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">3</span> 
                  Scope of Consultancy Work
                </h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Objectives <span className="text-red-500">*</span></label>
                  <textarea name="objectives" required rows={3} className={inputClass} defaultValue={editData?.objectives || ''} />
                </div>
                <div>
                  <label className={labelClass}>Nature of Work <span className="text-red-500">*</span></label>
                  <textarea name="nature_of_work" required rows={3} className={inputClass} defaultValue={editData?.nature_of_work || ''} />
                </div>
                <div>
                  <label className={labelClass}>Expected Outcomes <span className="text-red-500">*</span></label>
                  <textarea name="scope_expected_outcomes" required rows={3} className={inputClass} defaultValue={editData?.scope_expected_outcomes || ''} />
                </div>
              </div>
            </div>

            {/* SECTIONS 4, 5, 6 */}
            <div className="p-8 space-y-8 bg-blue-50/50">
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">4</span> 
                      Deliverables & Expected Outcomes
                    </h2>
                  </div>
                  <textarea name="deliverables" required rows={3} className={inputClass} defaultValue={editData?.deliverables || ''} />
                </div>

                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">5</span> 
                      Project Timeline
                    </h2>
                  </div>
                  <textarea name="project_timeline" required rows={3} className={inputClass} placeholder="Start/end dates + milestones..." defaultValue={editData?.project_timeline || ''} />
                </div>

                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">6</span> 
                      Financial Details
                    </h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Total Consultancy Fee (INR) <span className="text-red-500">*</span></label>
                      <input type="number" name="consultancy_fee" required className={inputClass} defaultValue={editData?.consultancy_fee || ''} />
                    </div>
                    <div>
                      <label className={labelClass}>Payment Terms <span className="text-red-500">*</span></label>
                      <div className="space-y-3 mt-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input type="radio" name="payment_terms" value="advance" checked={paymentTerms === 'advance'} onChange={() => setPaymentTerms('advance')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          100% Advance
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input type="radio" name="payment_terms" value="installments" checked={paymentTerms === 'installments'} onChange={() => setPaymentTerms('installments')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          Instalments
                        </label>
                        {paymentTerms === 'installments' && (
                          <input type="text" name="payment_terms_schedule" required className={`${inputClass} mt-2 ml-6 w-[calc(100%-1.5rem)]`} placeholder="Specify schedule..." defaultValue={editData?.payment_terms_schedule || ''} />
                        )}
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input type="radio" name="payment_terms" value="after_completion" checked={paymentTerms === 'after_completion'} onChange={() => setPaymentTerms('after_completion')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          After Project Completion
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 7 */}
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">7</span> 
                  Institutional Approvals & Compliance
                </h2>
              </div>
              
              <div className="space-y-5">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="involves_ip" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={editData?.involves_ip} />
                  Does the project involve IP/Patentable Work?
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="requires_ethics_approval" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300" defaultChecked={editData?.requires_ethics_approval} />
                  Does it require Institutional Ethics Approval?
                </label>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button type="button" onClick={handleDownloadProposal} disabled={isGeneratingProposal} className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold transition-all duration-200 shadow-sm disabled:opacity-50">
                  {isGeneratingProposal ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} 
                  {isGeneratingProposal ? 'Generating...' : 'Download Proposal Form'}
                </button>
                <p className="text-xs text-slate-500 font-medium mt-3">Download the form, sign it, and upload it back below along with the other required documents.</p>
              </div>
            </div>

            {/* SECTION 8 (Final Documents) */}
            <div className="p-8 space-y-8 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-sm shadow-md">8</span> 
                  Final Documents
                </h2>
              </div>
              
              <p className="text-sm text-slate-600 mb-6 font-medium">Download the templates, fill them out or obtain the required signatures, and upload all 10 documents below.</p>
              
              <div className="space-y-4">
                {DOCUMENT_CHECKLIST.map(item => {
                  const fileState = files[item.key] || { file: null, url: null, uploading: false }
                  return (
                    <div key={item.key} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm mb-1">{item.label} <span className="text-red-500">*</span></p>
                        {item.template ? (
                          <a href={item.template} download className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download Template
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Use Generated Form
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 w-full sm:w-auto flex flex-col items-center">
                        <div 
                          onClick={() => !fileState.uploading && inputRefs.current[item.key]?.click()}
                          className={`border-2 border-dashed rounded-xl px-4 py-3 text-center cursor-pointer transition-all min-w-[200px] ${fileState.url ? 'border-emerald-300 bg-emerald-50' : (fileState as any).error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 bg-slate-50'}`}
                        >
                          <input type="file" ref={el => { inputRefs.current[item.key] = el }} className="hidden" accept="application/pdf,.doc,.docx" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) handleUpload(item.key, e.target.files[0])
                          }} />
                          {fileState.uploading ? (
                            <div className="flex items-center justify-center gap-2 text-blue-600 text-sm font-bold"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div>
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
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            {!hasFileError && (
              <div className="p-8 bg-white text-right">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 py-3 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:bg-slate-400"
                >
                  {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Submit Application'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
