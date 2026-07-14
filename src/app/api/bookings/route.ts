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

const DEMO_BOOKINGS = [
  { id: '1', court_id: '1', start_time: '2026-07-15T08:00:00Z', end_time: '2026-07-15T09:00:00Z', status: 'confirmed', note: null, created_by: 'demo-user', tenant_id: 'demo-tenant', created_at: new Date().toISOString(), courts: { name: 'คอร์ท A' } },
  { id: '2', court_id: '2', start_time: '2026-07-15T10:00:00Z', end_time: '2026-07-15T11:00:00Z', status: 'confirmed', note: null, created_by: 'demo-user', tenant_id: 'demo-tenant', created_at: new Date().toISOString(), courts: { name: 'คอร์ท B' } },
]

async function getAuth(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() }) }
  return { user }
}

async function getProfile(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()
  return profile
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ data: DEMO_BOOKINGS, wallet_balance: 500 }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const profile = await getProfile(supabase, user.id)
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const courtId = searchParams.get('court_id')

  let query = supabase
    .from('bookings')
    .select('*, courts(name)')
    .eq('tenant_id', profile.tenant_id)

  if (status) {
    query = query.eq('status', status)
  }
  if (dateFrom) {
    query = query.gte('start_time', dateFrom)
  }
  if (dateTo) {
    query = query.lte('end_time', dateTo)
  }
  if (courtId) {
    query = query.eq('court_id', courtId)
  }

  const { data, error: dbError } = await query.order('start_time', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ data, wallet_balance: wallet?.balance ?? 0 }, { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    const body = await request.json()
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      ...body,
      status: 'confirmed',
      created_by: 'demo-user',
      tenant_id: 'demo-tenant',
      created_at: new Date().toISOString(),
      courts: { name: 'คอร์ท A' },
      wallet_balance: 500,
      cost: 120,
    }, { status: 201, headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const profile = await getProfile(supabase, user.id)
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { court_id, start_time, end_time, note } = body

  if (!court_id || !start_time || !end_time) {
    return NextResponse.json({ error: 'Missing required fields: court_id, start_time, end_time' }, { status: 400, headers: corsHeaders() })
  }

  const { data: court } = await supabase
    .from('courts')
    .select('id, name, hourly_rate, is_active, tenant_id')
    .eq('id', court_id)
    .single()

  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404, headers: corsHeaders() })
  }

  if (court.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  if (!court.is_active) {
    return NextResponse.json({ error: 'Court is not active' }, { status: 400, headers: corsHeaders() })
  }

  const startDate = new Date(start_time)
  const endDate = new Date(end_time)
  const hours = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 3600000))
  const cost = court.hourly_rate * hours

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  const balance = wallet?.balance ?? 0
  if (balance < cost) {
    return NextResponse.json({ error: 'Insufficient points', balance, cost }, { status: 402, headers: corsHeaders() })
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from('bookings')
    .select('id, start_time, end_time')
    .eq('court_id', court_id)
    .eq('tenant_id', profile.tenant_id)
    .in('status', ['confirmed', 'pending'])
    .lt('start_time', end_time)
    .gt('end_time', start_time)
    .limit(1)

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500, headers: corsHeaders() })
  }

  if (overlapping && overlapping.length > 0) {
    return NextResponse.json({ error: 'Time slot overlaps with an existing booking', conflict: overlapping[0] }, { status: 409, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('bookings')
    .insert({
      tenant_id: profile.tenant_id,
      court_id,
      start_time,
      end_time,
      note,
      status: 'confirmed',
      created_by: user.id,
    })
    .select('*, courts(name)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  const { error: walletError } = await supabase
    .from('wallets')
    .upsert({ user_id: user.id, balance: balance - cost }, { onConflict: 'user_id' })

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 500, headers: corsHeaders() })
  }

  const { error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: user.id,
      type: 'debit',
      amount: cost,
      reason: 'booking',
      reference_id: data.id,
    })

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json({ ...data, wallet_balance: balance - cost }, { status: 201, headers: corsHeaders() })
}
