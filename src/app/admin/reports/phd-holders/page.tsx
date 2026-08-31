'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Download, Upload, Loader2, Users, LogOut, Menu, X, BarChart3, FileText, IndianRupee, FlaskConical, ChevronDown, Megaphone, Briefcase, FolderKanban } from 'lucide-react'
import { useAdminAuth } from '@/context/AdminAuthContext'

export default function PhdHoldersReportPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { token } = useAdminAuth()
  const [phdHolders, setPhdHolders] = useState<any[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [activeDept, setActiveDept] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(50)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchRoster = useCallback(async (dept: string, tok: string) => {
    try {
      setPhdHolders([])
      setVisibleCount(50)
      const deptQuery = dept === 'all' ? '' : encodeURIComponent(dept)
      const res = await fetch(`/api/admin/reports/phd-holders?dept=${deptQuery}&_t=${Date.now()}`, { headers: { Authorization: `Bearer ${tok}` } })
      if (res.ok) {
        const { data, departments: deptList } = await res.json()
        setPhdHolders(data || [])
        
        // Populate filters if this is the initial 'all' fetch
        if (dept === 'all') {
          setDepartments(deptList || [])
        }
      } else {
        console.error('PhD Holders fetch failed', res.status)
      }
    } catch (err) {}
  }, [])


  useEffect(() => {
    if (!token) return
    let mounted = true
    const init = async () => {
      await fetchRoster(activeDept, token)
      if (mounted) setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, [token, activeDept, fetchRoster])

  const exportRoster = async () => {
    if (!token) return
    try {
      const deptQuery = activeDept === 'all' ? '' : encodeURIComponent(activeDept)
      
      const queryParams = new URLSearchParams()
      if (deptQuery) queryParams.set('dept', deptQuery)
      queryParams.set('token', token)
      
      const url = `/api/admin/reports/phd-holders/export?${queryParams.toString()}`
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const label = []
      if (deptQuery) label.push(deptQuery)
      a.download = `PhD_Holders_${label.length ? label.join('_') : 'All'}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      a.remove()
    } catch (err) {
      console.error(err)
      alert('Failed to export PhD holders roster')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!token) return

    if (!confirm(`This will replace the current roster of ${phdHolders.length} names — continue?`)) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/reports/phd-holders/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const result = await res.json()
      if (res.ok) {
        alert(`Import successful! Roster replaced with ${result.replaced} records.`)
        await fetchRoster(activeDept, token)
      } else {
        alert(result.error || 'Failed to import')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to import PhD holders roster')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">

      <div className="flex-1 p-6 w-full mx-auto space-y-6">
        <Link href="/admin/reports" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Reports Overview
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            Manage PhD Holders Roster
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportRoster} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-blue-700 dark:hover:border-blue-500 dark:hover:text-white transition-colors shadow-sm inline-flex items-center gap-2">
              <Download className="w-4 h-4 text-slate-400 dark:text-slate-300" /> Export Excel
            </button>
            
            <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Upload Excel'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <select 
                value={activeDept}
                onChange={e => setActiveDept(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div className="text-sm font-bold text-slate-500">
              {phdHolders.length} names found
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="p-4">S.No</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Name of the Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {phdHolders.slice(0, visibleCount).map((h, i) => (
                  <tr key={h.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{h.s_no}</td>
                    <td className="p-4 text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">{h.dept}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{h.name}</td>
                  </tr>
                ))}
                {phdHolders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-medium">
                      No PhD holders found in the roster. Upload an Excel file to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {visibleCount < phdHolders.length && (
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <button 
                onClick={() => setVisibleCount(v => v + 50)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                Load More ({phdHolders.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
