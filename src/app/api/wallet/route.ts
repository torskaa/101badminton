import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isConfigured() {
  return !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes('placeholder')
}

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })
}

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
}

const DEMO = {
  balance: 500,
  transactions: [
    { id: '1', type: 'credit', amount: 500, reason: 'topup', reference_id: null, created_at: new Date().toISOString() },
    { id: '2', type: 'debit', amount: 120, reason: 'booking', reference_id: 'booking-1', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'credit', amount: 200, reason: 'topup', reference_id: null, created_at: new Date(Date.now() - 172800000).toISOString() },
  ],
  topups: [
    { id: '1', amount: 500, status: 'confirmed', created_at: new Date().toISOString() },
    { id: '2', amount: 300, status: 'confirmed', created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: '3', amount: 200, status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString() },
  ],
}

async function getAuth(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() }) }
  return { user }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(_request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(DEMO, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  const balance = wallet?.balance ?? 0

  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('id, type, amount, reason, created_at, reference_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: topups } = await supabase
    .from('topup_requests')
    .select('id, amount, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ balance, transactions: transactions || [], topups: topups || [] }, { headers: corsHeaders() })
}
