'use client'

import { createContext, useContext } from 'react'
import type { FacultyProfile } from '@/lib/types'

interface FacultyContextValue {
  faculty: FacultyProfile
}

export const FacultyContext = createContext<FacultyContextValue | null>(null)

export function useFaculty(): FacultyProfile {
  const ctx = useContext(FacultyContext)
  if (!ctx) throw new Error('useFaculty must be used inside the portal layout')
  return ctx.faculty
}
