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

const DEMO_REQUESTS = [
  { id: '1', amount: 500, status: 'pending', slip_url: null, note: null, created_at: new Date().toISOString() },
  { id: '2', amount: 200, status: 'pending', slip_url: '/images/slip-placeholder.png', note: null, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', amount: 1000, status: 'confirmed', slip_url: null, note: null, created_at: new Date(Date.now() - 172800000).toISOString() },
]

async function getAuth(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() }) }
  return { user }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    let result = DEMO_REQUESTS
    if (status) {
      result = result.filter((r) => r.status === status)
    }
    return NextResponse.json(result, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('topup_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error: dbError } = await query

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data || [], { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    const body = await request.json()
    const { amount, slip_url } = body
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders() })
    }
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      amount,
      slip_url: slip_url || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { status: 201, headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const body = await request.json()
  const { amount, slip_url } = body

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('topup_requests')
    .insert({
      user_id: user.id,
      amount,
      slip_url: slip_url || null,
      status: 'pending',
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { status: 201, headers: corsHeaders() })
}
