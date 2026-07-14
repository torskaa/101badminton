'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isConfigured() {
  return !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder')
}

export function createClient() {
  if (!isConfigured()) {
    throw new Error(
      'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!)
}
