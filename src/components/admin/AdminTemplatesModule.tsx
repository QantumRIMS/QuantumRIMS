'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/context/AdminAuthContext'
import { Loader2, ArrowLeft, Upload, FileText, CheckCircle2, History, Trash2, ArrowUpCircle } from 'lucide-react'
import Link from 'next/link'

export type TemplateModule = 'seed_fund' | 'consultancy' | 'project_grants'

interface DocumentTemplate {
  id: string
  module: string
  doc_key: string
  doc_label: string
  version_label: string
  file_url: string
  is_current: boolean
  uploaded_by: string
  created_at: string
}

export default function AdminTemplatesModule({ module, moduleName, backLink }: { module: TemplateModule, moduleName: string, backLink: string }) {
  const router = useRouter()
  const { session, loading: authLoading } = useAdminAuth()
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchTemplates()
    }
  }, [session, module])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/templates?module=${module}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const json = await res.json()
        setTemplates(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (doc_key: string, doc_label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session) return
    const versionLabel = prompt(`Enter version label for ${doc_label} (e.g., Ver 2.0 or 2026-Q1):`)
    if (!versionLabel) return

    setUploading(doc_key)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('module', module)
      formData.append('doc_key', doc_key)
      formData.append('doc_label', doc_label)
      formData.append('version_label', versionLabel)

      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }
      await fetchTemplates()
      alert('Template updated successfully.')
    } catch (err: any) {
      alert('Error uploading template: ' + err.message)
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleDelete = async (template: DocumentTemplate, allVersions: DocumentTemplate[]) => {
    let confirmOnly = false
    
    if (template.is_current) {
      if (allVersions.length > 1) {
        alert("This is the active version staff are currently downloading. Set a different version as current first, or delete the other versions instead.")
        return
      } else {
        const confirmDeleteOnly = window.confirm("This is the only version of this document — deleting it will remove the download option for staff entirely until a new one is uploaded. Are you sure?")
        if (!confirmDeleteOnly) return
        confirmOnly = true
      }
    } else {
      const confirmDelete = window.confirm(`Permanently delete '${template.doc_label} - ${template.version_label}'? This cannot be undone.`)
      if (!confirmDelete) return
    }

    setDeletingId(template.id)
    try {
      const res = await fetch(`/api/admin/templates/${template.id}${confirmOnly ? '?confirm_only_version=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete template')
      }
      
      await fetchTemplates()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleMakeCurrent = async (template: DocumentTemplate) => {
    setSettingCurrentId(template.id)
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update template')
      }
      
      await fetchTemplates()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSettingCurrentId(null)
    }
  }

  if (authLoading || (!session && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  // Group templates by doc_key
  const grouped = templates.reduce((acc, curr) => {
    if (!acc[curr.doc_key]) acc[curr.doc_key] = []
    acc[curr.doc_key].push(curr)
    return acc
  }, {} as Record<string, DocumentTemplate[]>)

  return (
    <div className="min-h-screen bg-blue-50 font-sans p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <Link href={backLink} className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {moduleName}
        </Link>
        
        <h1 className="text-3xl font-black text-slate-800 mb-2">Manage {moduleName} Templates</h1>
        <p className="text-slate-500 mb-8 font-medium">Upload new versions of document templates. Existing versions are kept in history.</p>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            No templates found. Please run the initial migration script.
          </div>
        ) : (
          <div className="grid gap-6">
            {Object.entries(grouped).map(([key, versions]) => {
              // Sort by is_current true first, then created_at desc
              versions.sort((a, b) => {
                if (a.is_current && !b.is_current) return -1
                if (!a.is_current && b.is_current) return 1
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })

              const current = versions.find(v => v.is_current)
              const history = versions.filter(v => !v.is_current)

              return (
                <div key={key} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        {current?.doc_label || versions[0]?.doc_label}
                      </h2>
                      <p className="text-sm text-slate-500 font-mono mt-1 text-xs bg-slate-100 px-2 py-1 rounded inline-block">Key: {key}</p>
                    </div>
                    <div>
                      <label className="relative overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-sm rounded-xl border border-indigo-200 hover:border-indigo-600 transition-colors cursor-pointer disabled:opacity-50">
                        {uploading === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload New Version
                        <input type="file" accept=".docx,.pdf" className="absolute inset-0 opacity-0 cursor-pointer hidden" onChange={(e) => handleUpload(key, current?.doc_label || versions[0]?.doc_label, e)} disabled={uploading === key} />
                      </label>
                    </div>
                  </div>

                  {current && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-800">Current Version: {current.version_label}</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-medium">Uploaded {new Date(current.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleDelete(current, versions)}
                          disabled={deletingId === current.id}
                          className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {deletingId === current.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                        </button>
                        <a href={current.file_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2">Download File</a>
                      </div>
                    </div>
                  )}

                  {history.length > 0 && (
                    <details className="mt-4 group">
                      <summary className="text-sm font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1.5 outline-none select-none">
                        <History className="w-4 h-4" /> View History ({history.length})
                      </summary>
                      <div className="mt-3 space-y-2 border-l-2 border-slate-100 pl-4">
                        {history.map(h => (
                          <div key={h.id} className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
                            <div>
                              <p className="font-bold text-slate-700 text-sm">{h.version_label}</p>
                              <p className="text-xs text-slate-400 font-medium">{new Date(h.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => handleMakeCurrent(h)}
                                disabled={settingCurrentId === h.id}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                {settingCurrentId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />} Make Current
                              </button>
                              <button 
                                onClick={() => handleDelete(h, versions)}
                                disabled={deletingId === h.id}
                                className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                {deletingId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                              </button>
                              <a href={h.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">Download</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
