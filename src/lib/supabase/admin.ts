import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isAdminConfigured() {
  return !!supabaseUrl && !!supabaseServiceRole
}

export function createAdminClient() {
  if (!isAdminConfigured()) {
    throw new Error('Supabase service role key not configured')
  }
  return createClient(supabaseUrl!, supabaseServiceRole!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
