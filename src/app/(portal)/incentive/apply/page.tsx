'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Loader2, IndianRupee, FileText, ChevronRight, AlertCircle, Info, CheckCircle
} from 'lucide-react'
import { calculateIncentive } from '@/lib/incentive'
import { incentiveRules } from '@/lib/incentiveRules'

const inputClass = 'w-full rounded-xl border-slate-200 bg-blue-50/50 px-4 py-3.5 text-slate-900 text-sm placeholder-slate-400 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all duration-200 font-medium border'

function FormField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 tracking-tight">
        {label}{required && <span className="text-blue-600 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 font-medium">{hint}</p>}
    </div>
  )
}

function IncentiveApplyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submission')

  const [loading, setLoading] = useState(true)
  const [submissionData, setSubmissionData] = useState<any>(null)
  
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [category, setCategory] = useState('sci_journal')
  const [authorCount, setAuthorCount] = useState<string>('')
  const [authorPosition, setAuthorPosition] = useState<string>('')
  const [impactFactor, setImpactFactor] = useState<string>('')
  const [journalQuartile, setJournalQuartile] = useState<string>('Q1')
  const [selfCitationCount, setSelfCitationCount] = useState<string>('0')
  const [hIndex, setHIndex] = useState<string>('')
  const [publisherTier, setPublisherTier] = useState<string>('springer_elsevier_acm')
  const [bookType, setBookType] = useState<string>('authored')
  const [patentType, setPatentType] = useState<string>('application')
  const [patentFormsConfirmed, setPatentFormsConfirmed] = useState<boolean>(false)
  const [citationCount, setCitationCount] = useState<string>('')

  useEffect(() => {
    async function loadData() {
      if (!submissionId) {
        router.replace('/profile')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single()

      if (error || !data || data.submitted_by !== session.user.id || data.status !== 'approved') {
        router.replace('/profile')
        return
      }

      const { data: existingApp } = await supabase
        .from('incentive_applications')
        .select('*')
        .eq('submission_id', submissionId)
        .single()

      if (existingApp && existingApp.status !== 'rejected') {
        router.replace('/profile')
        return
      }

      if (existingApp && existingApp.status === 'rejected') {
        setCategory(existingApp.category)
        if (existingApp.author_count) setAuthorCount(existingApp.author_count.toString())
        if (existingApp.author_position) setAuthorPosition(existingApp.author_position.toString())
        if (existingApp.impact_factor) setImpactFactor(existingApp.impact_factor.toString())
        if (existingApp.journal_quartile) setJournalQuartile(existingApp.journal_quartile)
        setSelfCitationCount(existingApp.self_citation_count.toString())
        if (existingApp.h_index) setHIndex(existingApp.h_index.toString())
        if (existingApp.publisher_tier) setPublisherTier(existingApp.publisher_tier)
        if (existingApp.book_type) setBookType(existingApp.book_type)
        if (existingApp.patent_type) setPatentType(existingApp.patent_type)
        setPatentFormsConfirmed(existingApp.patent_forms_confirmed)
        if (existingApp.citation_count) setCitationCount(existingApp.citation_count.toString())
      }

      setSubmissionData(data)
      setLoading(false)
    }
    loadData()
  }, [submissionId, router])

  const estimate = calculateIncentive(category, {
    authorCount: Number(authorCount) || 0,
    authorPosition: Number(authorPosition) || 0,
    impactFactor: Number(impactFactor) || 0,
    journalQuartile,
    hIndex: Number(hIndex) || 0,
    publisherTier,
    bookType,
    patentType,
    citationCount: Number(citationCount) || 0,
    selfCitationCount: Number(selfCitationCount) || 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    // Validate author position cannot exceed total author count
    const numCount = Number(authorCount)
    const numPos = Number(authorPosition)
    if (['sci_journal', 'esci_scopus_journal', 'conference', 'book_chapter'].includes(category)) {
      if (numPos > numCount) {
        setErrorMsg(`Your position (${numPos}) cannot exceed the total number of authors (${numCount}).`)
        setSubmitting(false)
        return
      }
      if (numPos < 1 || numCount < 1) {
        setErrorMsg('Author count and position must be at least 1.')
        setSubmitting(false)
        return
      }
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const payload: any = {
        submission_id: submissionId,
        category,
        self_citation_count: selfCitationCount
      }
      
      if (category === 'sci_journal') {
        payload.author_count = authorCount
        payload.author_position = authorPosition
        payload.impact_factor = impactFactor
        payload.journal_quartile = journalQuartile
      } else if (category === 'esci_scopus_journal') {
        payload.author_count = authorCount
        payload.author_position = authorPosition
        payload.journal_quartile = journalQuartile
      } else if (category === 'conference') {
        payload.author_count = authorCount
        payload.author_position = authorPosition
        payload.h_index = hIndex
      } else if (category === 'book_chapter') {
        payload.author_count = authorCount
        payload.author_position = authorPosition
        payload.publisher_tier = publisherTier
      } else if (category === 'book') {
        payload.book_type = bookType
        payload.publisher_tier = publisherTier
      } else if (category === 'patent') {
        payload.patent_type = patentType
        payload.patent_forms_confirmed = patentFormsConfirmed
      } else if (category === 'citations') {
        payload.citation_count = citationCount
      }

      const res = await fetch('/api/incentive/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload)
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit application')

      router.push('/profile')
    } catch (err: any) {
      setErrorMsg(err.message)
      setSubmitting(false)
    }
  }


  if (loading) {
    return <div className="min-h-screen bg-blue-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  const renderRulesTable = () => {
    if (!category || !incentiveRules[category]) return null

    if (category === 'citations') {
      return (
        <div className="bg-blue-50 border border-slate-200 rounded-xl overflow-hidden mt-6 mb-6 px-4 py-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            {incentiveRules[category]}
          </p>
        </div>
      )
    }

    if (category === 'book_chapter') {
      return (
        <div className="bg-blue-50 border border-slate-200 rounded-xl overflow-hidden mt-6 mb-6">
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> Incentive Tiers
            </h3>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-blue-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium text-slate-500">Tier</th>
                <th className="px-4 py-2 font-medium text-slate-500">Springer / Elsevier / ACM</th>
                <th className="px-4 py-2 font-medium text-slate-500">Wiley / IGI / Other</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incentiveRules.book_chapter.map((rule: any, idx: number) => {
                const isMatch1 = publisherTier === 'springer_elsevier_acm' && estimate.base === rule.tier1Amount;
                const isMatch2 = publisherTier === 'wiley_igi_other' && estimate.base === rule.tier2Amount;
                return (
                  <tr key={idx} className={(isMatch1 || isMatch2) ? 'bg-blue-50/80 border-l-4 border-blue-500' : 'hover:bg-blue-50 border-l-4 border-transparent'}>
                    <td className={`px-4 py-2 ${(isMatch1 || isMatch2) ? 'font-bold text-blue-900' : 'font-medium text-slate-700'}`}>{rule.label}</td>
                    <td className={`px-4 py-2 font-mono tracking-tight ${isMatch1 ? 'font-black text-blue-700' : 'font-medium text-slate-600'}`}>₹{rule.tier1Amount.toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-2 font-mono tracking-tight ${isMatch2 ? 'font-black text-blue-700' : 'font-medium text-slate-600'}`}>₹{rule.tier2Amount.toLocaleString('en-IN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="bg-blue-50 border border-slate-200 rounded-xl overflow-hidden mt-6 mb-6">
        <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Incentive Tiers
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {incentiveRules[category].map((rule: any, idx: number) => {
            const isMatch = estimate.base === rule.amount;
            return (
              <div 
                key={idx} 
                className={`px-4 py-3 flex items-center justify-between transition-colors ${
                  isMatch ? 'bg-blue-50/80 border-l-4 border-blue-500' : 'hover:bg-blue-50 border-l-4 border-transparent'
                }`}
              >
                <span className={`text-sm ${isMatch ? 'font-bold text-blue-900' : 'font-medium text-slate-700'}`}>
                  {rule.label}
                </span>
                <span className={`text-sm font-mono tracking-tight ${isMatch ? 'font-black text-blue-700' : 'font-bold text-slate-600'}`}>
                  ₹{rule.amount.toLocaleString('en-IN')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 min-h-screen pb-16">
      <div className="relative bg-blue-900 overflow-hidden pt-10 pb-16 px-6 sm:px-10">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-700 rounded-full blur-3xl opacity-40" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-800/60 border border-blue-400/30 text-blue-100 text-xs font-bold tracking-widest uppercase mb-4 backdrop-blur-sm">
            <IndianRupee className="w-3.5 h-3.5 text-blue-300" /> Incentive Module
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">Apply for Incentive</h1>
          <p className="text-blue-300 mt-2 font-medium text-sm">For &quot;{submissionData?.title}&quot;</p>
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 -mt-6">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border-l-4 border-l-red-500 shadow-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 border border-slate-100">
            
            <FormField label="Incentive Category" required>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="sci_journal">SCI Indexed Journals</option>
                <option value="esci_scopus_journal">ESCI / Scopus Journals</option>
                <option value="conference">Conferences</option>
                <option value="book_chapter">Book Chapters</option>
                <option value="book">Books</option>
                <option value="patent">Patents</option>
                <option value="citations">Citations</option>
              </select>
            </FormField>

            {renderRulesTable()}

            {['sci_journal', 'esci_scopus_journal', 'conference', 'book_chapter'].includes(category) && (() => {
              const count = Number(authorCount)
              const pos = Number(authorPosition)
              const positionError = authorPosition && authorCount && pos > count
                ? `Position ${pos} exceeds total authors (${count})`
                : null
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <FormField label="Total Number of Authors" required>
                    <input
                      type="number" min="1" required
                      value={authorCount}
                      onChange={e => {
                        setAuthorCount(e.target.value)
                        // Auto-clamp position if it now exceeds new count
                        const newCount = Number(e.target.value)
                        if (Number(authorPosition) > newCount) setAuthorPosition(e.target.value)
                      }}
                      className={inputClass}
                      placeholder="e.g. 3"
                    />
                  </FormField>
                  <FormField label="Your Position in Author List" required
                    hint={positionError ? undefined : undefined}>
                    <input
                      type="number" min="1"
                      max={authorCount || undefined}
                      required
                      value={authorPosition}
                      onChange={e => setAuthorPosition(e.target.value)}
                      className={`${inputClass} ${positionError ? 'border-red-400 focus:ring-red-400' : ''}`}
                      placeholder="e.g. 1"
                    />
                    {positionError && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                        <span>⚠</span> {positionError}
                      </p>
                    )}
                  </FormField>
                </div>
              )
            })()}


            {category === 'sci_journal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <FormField label="Journal Impact Factor" required>
                  <input type="number" step="0.001" min="0" required value={impactFactor} onChange={e => setImpactFactor(e.target.value)} className={inputClass} placeholder="e.g. 8.5" />
                </FormField>
                <FormField label="Journal Quartile" required>
                  <select required value={journalQuartile} onChange={e => setJournalQuartile(e.target.value)} className={inputClass}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </FormField>
              </div>
            )}

            {category === 'esci_scopus_journal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <FormField label="Journal Quartile" required>
                  <select required value={journalQuartile} onChange={e => setJournalQuartile(e.target.value)} className={inputClass}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                  </select>
                </FormField>
              </div>
            )}

            {category === 'conference' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <FormField label="H-Index" required>
                  <input type="number" min="0" required value={hIndex} onChange={e => setHIndex(e.target.value)} className={inputClass} placeholder="e.g. 25" />
                </FormField>
              </div>
            )}

            {(category === 'book_chapter' || category === 'book') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {category === 'book' && (
                  <FormField label="Book Type" required>
                    <select required value={bookType} onChange={e => setBookType(e.target.value)} className={inputClass}>
                      <option value="authored">Authored</option>
                      <option value="edited">Edited</option>
                    </select>
                  </FormField>
                )}
                <FormField label="Publisher Tier" required>
                  <select required value={publisherTier} onChange={e => setPublisherTier(e.target.value)} className={inputClass}>
                    <option value="springer_elsevier_acm">Springer / Elsevier / ACM</option>
                    <option value="wiley_igi_other">Wiley / IGI / Other</option>
                  </select>
                </FormField>
              </div>
            )}

            {category === 'patent' && (
              <div className="grid grid-cols-1 gap-6 pt-2">
                <FormField label="Patent Type" required>
                  <select required value={patentType} onChange={e => setPatentType(e.target.value)} className={inputClass}>
                    <option value="application">Application</option>
                    <option value="grant">Grant</option>
                    <option value="design">Design</option>
                  </select>
                </FormField>
                
                {(patentType === 'application' || patentType === 'grant') && (
                  <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-100/50 transition-colors">
                    <input 
                      type="checkbox" 
                      required
                      checked={patentFormsConfirmed}
                      onChange={e => setPatentFormsConfirmed(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-amber-300 text-blue-600 focus:ring-blue-600 shrink-0" 
                    />
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        I confirm {patentType === 'application' ? 'Form 9' : 'Form 9 and Form 18'} has been submitted with this application
                      </span>
                      <span className="text-xs text-slate-500 font-medium block mt-1">This is mandatory per policy.</span>
                    </div>
                  </label>
                )}
              </div>
            )}

            {category === 'citations' && (
              <div className="grid grid-cols-1 gap-6 pt-2">
                <FormField label="Number of Scopus/WoS Citations" required>
                  <input type="number" min="1" required value={citationCount} onChange={e => setCitationCount(e.target.value)} className={inputClass} placeholder="e.g. 25" />
                </FormField>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <FormField label="Citation Count" required hint="Papers from Sri Eshwar College cited in your references — this affects your incentive amount">
                <input type="number" min="0" required value={selfCitationCount} onChange={e => setSelfCitationCount(e.target.value)} className={inputClass} placeholder="0" />
              </FormField>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
              <h3 className="text-blue-900 font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" /> Estimated Incentive
              </h3>
              <p className="text-xs text-blue-700 mt-1 font-medium max-w-sm">
                Final amount confirmed after admin review.
              </p>
            </div>
            <div className="text-right">
              {estimate.discounted ? (
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 text-2xl font-black text-slate-400 line-through tracking-tight">
                    ₹{estimate.base.toLocaleString('en-IN')}
                  </div>
                  <div className="text-4xl font-black text-blue-700 tracking-tight">
                    ₹{estimate.finalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/50 px-2 py-1 rounded">
                    60% Base (citations &lt; 2)
                  </div>
                </div>
              ) : (
                <div className="text-4xl font-black text-blue-700 tracking-tight">
                  ₹{estimate.finalAmount.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full relative group overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 bg-[length:200%_auto] group-hover:animate-gradient" />
            <div className="relative flex items-center justify-center gap-2 py-4 px-6 text-white font-black text-lg shadow-xl transition-transform active:scale-[0.98]">
              {submitting ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Submitting...</>
              ) : (
                <>Submit Application <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  )
}

export default function IncentiveApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <IncentiveApplyContent />
    </Suspense>
  )
}
