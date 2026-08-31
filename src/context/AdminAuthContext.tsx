'use client'

import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

interface AdminAuthContextValue {
  session: Session | null
  token: string | null
  loading: boolean
}

export const AdminAuthContext = createContext<AdminAuthContextValue>({
  session: null,
  token: null,
  loading: true,
})

export function useAdminAuth(): AdminAuthContextValue {
  return useContext(AdminAuthContext)
}
