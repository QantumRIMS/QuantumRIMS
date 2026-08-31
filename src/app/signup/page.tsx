'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

import { LoginStatsPanel } from '@/components/LoginStatsPanel'

export default function SignupPage() {
  const router = useRouter()
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emp_id: empId.trim(), password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Signup failed. Please try again.'); return }
      router.push('/login?registered=1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [empId, password, confirmPassword, router])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0F172A] dark:to-[#1E293B]">
      
      {/* Left Column - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 shadow-[10px_0_40px_rgba(0,0,0,0.1)] z-10">
        <LoginStatsPanel />
      </div>

      {/* Right Column - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-[2rem] border border-white shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden ring-1 ring-slate-900/5">
            <div className="px-10 pt-12 pb-6 text-center">
              <div className="flex justify-center mb-8">
                <Image src="/images/quantumrims-logo.svg" alt="QuantumRIMS logo" width={373} height={85} className="object-contain h-14 w-auto" priority />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
              <p className="text-slate-500 text-sm mt-1">Register with your Employee ID to access the portal</p>
            </div>

            <div className="px-10 pb-12 space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium flex items-center">{error}</div>
              )}

              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Employee ID</label>
                  <input id="signup-emp-id" type="text" required value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                    placeholder="e.g. EMP001" autoComplete="username" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <input id="signup-password" type={showPass ? 'text' : 'password'} required
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                      placeholder="Min. 8 characters" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input id="signup-confirm-password" type={showConfirm ? 'text' : 'password'} required
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-5 py-4 pr-12 rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                      placeholder="Re-enter password" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <button id="signup-submit" type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#0A3D8F] to-[#1e3a8a] hover:from-[#082f6e] hover:to-[#172d6b] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-lg transition-all duration-300 mt-6 shadow-[0_4px_14px_0_rgb(10,61,143,0.39)] hover:shadow-[0_6px_20px_rgba(10,61,143,0.23)] hover:-translate-y-0.5">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</> : 'Create Account'}
                </button>
              </form>

              <div className="pt-8 text-center border-t border-slate-100 space-y-3 mt-8">
                <p className="text-sm text-slate-500 font-medium">
                  Already registered?{' '}
                  <Link href="/login" className="text-[#0A3D8F] font-bold hover:text-blue-700 hover:underline transition-colors">Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
