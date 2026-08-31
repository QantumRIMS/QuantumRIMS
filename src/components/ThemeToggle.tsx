'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  /** 'nav' = white/translucent (for use inside dark navbars)
   *  'page' = adapts to current theme (for login pages / standalone use) */
  variant?: 'nav' | 'page'
}

export function ThemeToggle({ variant = 'nav' }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-full animate-pulse ${variant === 'nav' ? 'bg-white/10 border border-white/25' : 'bg-slate-200 dark:bg-slate-700'}`} />
    )
  }

  const isDark = resolvedTheme === 'dark'

  if (variant === 'page') {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className="p-2 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-500 shadow-md transition-all flex items-center justify-center w-9 h-9"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 transition-transform duration-300 hover:-rotate-12" />
        )}
      </button>
    )
  }

  // variant === 'nav' — original white/glass style for dark navbars
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white flex items-center justify-center w-9 h-9"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-[#FDB813] transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-blue-100 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  )
}
