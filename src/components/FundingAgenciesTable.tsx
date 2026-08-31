'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ExternalLink, X, MapPin, Mail, Phone, Hash, Plus, Edit2, Trash2 } from 'lucide-react'

// Define the type to match the database table
export type FundingAgency = {
  id: string;
  s_no: number;
  section: 'National' | 'International';
  agency_name: string;
  website: string | null;
  contact_details: string;
}

export default function FundingAgenciesTable({ isAdmin = false }: { isAdmin?: boolean }) {
  const [agencies, setAgencies] = useState<FundingAgency[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'National' | 'International'>('National')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgency, setEditingAgency] = useState<FundingAgency | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    section: 'National' as 'National' | 'International',
    agency_name: '',
    website: '',
    contact_details: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAgencies = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/funding-agencies')
      if (!res.ok) throw new Error('Failed to fetch agencies')
      const data = await res.json()
      setAgencies(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load agencies. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAgencies()
  }, [])

  // Filter agencies by search query and active tab
  const filteredAgencies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return agencies.filter((agency) => {
      // Filter by tab
      if (agency.section !== activeTab) return false
      // Filter by search query
      if (!q) return true
      return agency.agency_name.toLowerCase().includes(q)
    })
  }, [searchQuery, activeTab, agencies])

  const renderContactDetails = (details: string) => {
    if (!details) return <span className="text-slate-400 italic">No contact details</span>;
    return (
      <div className="space-y-1">
        {details.split('\n').map((line, i) => (
          <div key={i} className="text-xs text-slate-600 leading-relaxed">
            {line.trim()}
          </div>
        ))}
      </div>
    )
  }

  const openAddModal = () => {
    setEditingAgency(null)
    setFormData({
      section: activeTab,
      agency_name: '',
      website: '',
      contact_details: ''
    })
    setError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (agency: FundingAgency) => {
    setEditingAgency(agency)
    setFormData({
      section: agency.section,
      agency_name: agency.agency_name,
      website: agency.website || '',
      contact_details: agency.contact_details
    })
    setError(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this agency? This action cannot be undone.')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/funding-agencies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!res.ok) throw new Error('Failed to delete agency')
      
      // Update state without refetching
      setAgencies(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      alert('Error deleting agency: ' + err.message)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('adminToken')
      
      // Basic URL validation if provided
      if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
        throw new Error('Website must be a valid URL starting with http:// or https://')
      }

      const url = editingAgency 
        ? `/api/admin/funding-agencies/${editingAgency.id}` 
        : '/api/admin/funding-agencies'
        
      const method = editingAgency ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save agency')
      }
      
      setIsModalOpen(false)
      await fetchAgencies()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Header and Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex bg-slate-100/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('National')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'National' ? 'bg-white text-[#0A3D8F] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            National
          </button>
          <button
            onClick={() => setActiveTab('International')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'International' ? 'bg-white text-[#0A3D8F] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            International
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search agencies by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3D8F]/20 focus:border-[#0A3D8F] bg-white text-slate-800 placeholder-slate-400 transition-all shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A3D8F] hover:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Agency
            </button>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-gradient-to-r from-[#0A3D8F]/5 to-transparent px-6 py-3 border-b border-slate-100 flex items-center justify-between">
         <span className="text-sm font-semibold text-slate-700">
           {activeTab} Funding Agencies
         </span>
         <span className="text-xs font-bold bg-white text-[#0A3D8F] border border-blue-100 px-3 py-1 rounded-full shadow-sm">
           {isLoading ? 'Loading...' : `${filteredAgencies.length} ${filteredAgencies.length === 1 ? 'Agency' : 'Agencies'} Found`}
         </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="px-5 py-4 font-bold text-slate-700 text-sm whitespace-nowrap w-20 border-r border-slate-100">
                <div className="flex items-center gap-1.5 justify-center">
                  <Hash className="w-4 h-4 text-slate-400" /> S.No
                </div>
              </th>
              <th className="px-5 py-4 font-bold text-slate-700 text-sm border-r border-slate-100 w-[35%]">
                Funding Agency
              </th>
              <th className="px-5 py-4 font-bold text-slate-700 text-sm border-r border-slate-100 w-[25%]">
                Website
              </th>
              <th className="px-5 py-4 font-bold text-slate-700 text-sm min-w-[250px]">
                Contact Details
              </th>
              {isAdmin && (
                <th className="px-5 py-4 font-bold text-slate-700 text-sm w-24 text-center">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-16 text-center">
                   <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-200 border-t-[#0A3D8F] rounded-full"></div>
                   <p className="mt-4 text-slate-500 font-medium">Loading agencies...</p>
                </td>
              </tr>
            ) : filteredAgencies.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No agencies found matching your search.</p>
                </td>
              </tr>
            ) : (
              filteredAgencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-5 py-4 border-r border-slate-100 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {agency.s_no}
                    </span>
                  </td>
                  <td className="px-5 py-4 border-r border-slate-100">
                    <span className="font-bold text-[#0A3D8F] text-sm leading-snug block">
                      {agency.agency_name}
                    </span>
                  </td>
                  <td className="px-5 py-4 border-r border-slate-100">
                    {agency.website ? (
                      <a
                        href={agency.website.startsWith('http') ? agency.website : `http://${agency.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm group/link transition-colors break-all"
                      >
                        {agency.website}
                        <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-sm">Not available</span>
                    )}
                  </td>
                  <td className="px-5 py-4 border-r border-slate-100">
                    {renderContactDetails(agency.contact_details)}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(agency)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Agency"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(agency.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Agency"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAgency ? 'Edit Agency' : 'Add New Agency'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Section</label>
                <select 
                  value={formData.section}
                  onChange={e => setFormData({...formData, section: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A3D8F]/20 focus:border-[#0A3D8F] outline-none transition-all text-sm"
                  required
                >
                  <option value="National">National</option>
                  <option value="International">International</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Agency Name</label>
                <input 
                  type="text"
                  value={formData.agency_name}
                  onChange={e => setFormData({...formData, agency_name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A3D8F]/20 focus:border-[#0A3D8F] outline-none transition-all text-sm"
                  placeholder="e.g. Science and Engineering Research Board"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Website <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input 
                  type="url"
                  value={formData.website}
                  onChange={e => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A3D8F]/20 focus:border-[#0A3D8F] outline-none transition-all text-sm"
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Contact Details</label>
                <textarea 
                  value={formData.contact_details}
                  onChange={e => setFormData({...formData, contact_details: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0A3D8F]/20 focus:border-[#0A3D8F] outline-none transition-all text-sm min-h-[120px] resize-y"
                  placeholder="Address, Phone, Email..."
                  required
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#0A3D8F] text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    'Save Agency'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
