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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({
      data: [
        { id: '1', court_id: '1', start_time: '2026-07-15T08:00:00Z', end_time: '2026-07-15T09:00:00Z', status: 'confirmed', created_by: 'demo-user', created_at: new Date().toISOString(), courts: { name: 'คอร์ท A' } },
        { id: '2', court_id: '2', start_time: '2026-07-15T10:00:00Z', end_time: '2026-07-15T11:00:00Z', status: 'confirmed', created_by: 'demo-user', created_at: new Date().toISOString(), courts: { name: 'คอร์ท B' } },
      ],
      wallet_balance: 500,
    }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() })

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const courtId = searchParams.get('court_id')

  let query = supabase.from('bookings').select('*, courts(name)').eq('tenant_id', profile.tenant_id)
  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('start_time', dateFrom)
  if (courtId) query = query.eq('court_id', courtId)

  const { data, error: dbError } = await query.order('start_time', { ascending: false })
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })

  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()
  return NextResponse.json({ data, wallet_balance: wallet?.balance ?? 0 }, { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    const body = await request.json()
    return NextResponse.json({
      data: (body.bookings || []).map((b: any, i: number) => ({
        id: `mock-${Date.now()}-${i}`, ...b, status: 'confirmed', created_by: 'demo-user',
      })),
      wallet_balance: 500, cost: body.total_cost || 0,
    }, { status: 201, headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() })

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })

  const body = await request.json()
  const bookings = body.bookings || [body] // support array or single object

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return NextResponse.json({ error: 'Missing bookings array' }, { status: 400, headers: corsHeaders() })
  }

  // Validate all courts & calculate total cost
  let totalCost = 0
  const courtCache = new Map<string, any>()

  for (const b of bookings) {
    if (!b.court_id || !b.start_time || !b.end_time) {
      return NextResponse.json({ error: 'Missing court_id, start_time, or end_time in booking' }, { status: 400, headers: corsHeaders() })
    }

    let court = courtCache.get(b.court_id)
    if (!court) {
      const { data } = await supabase.from('courts').select('id, name, hourly_rate, is_active, tenant_id').eq('id', b.court_id).single()
      if (!data) return NextResponse.json({ error: `Court ${b.court_id} not found` }, { status: 404, headers: corsHeaders() })
      if (data.tenant_id !== profile.tenant_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
      if (!data.is_active) return NextResponse.json({ error: `Court ${data.name} is not active` }, { status: 400, headers: corsHeaders() })
      court = data
      courtCache.set(b.court_id, court)
    }

    const hours = Math.max(1, Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3600000))
    totalCost += court.hourly_rate * hours
  }

  // Check wallet balance
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()
  const balance = wallet?.balance ?? 0
  if (balance < totalCost) {
    return NextResponse.json({ error: 'Insufficient points', balance, cost: totalCost }, { status: 402, headers: corsHeaders() })
  }

  // Check overlap for each booking
  for (const b of bookings) {
    const { data: overlap } = await supabase
      .from('bookings').select('id').eq('court_id', b.court_id).eq('tenant_id', profile.tenant_id)
      .in('status', ['confirmed', 'pending'])
      .lt('start_time', b.end_time).gt('end_time', b.start_time).limit(1)
    if (overlap && overlap.length > 0) {
      return NextResponse.json({ error: `Time slot overlaps for court ${b.court_id}`, conflict: overlap[0] }, { status: 409, headers: corsHeaders() })
    }
  }

  // Create all bookings
  const created: any[] = []
  for (const b of bookings) {
    const { data, error } = await supabase.from('bookings').insert({
      tenant_id: profile.tenant_id, court_id: b.court_id,
      start_time: b.start_time, end_time: b.end_time,
      note: b.note, status: 'confirmed', created_by: user.id,
    }).select('*, courts(name)').single()

    if (error) {
      // Rollback: cancel what we already created
      for (const c of created) {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', c.id)
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() })
    }
    created.push(data)
  }

  // Deduct wallet once for total
  const { error: walletError } = await supabase
    .from('wallets').update({ balance: balance - totalCost }).eq('user_id', user.id)

  if (walletError) {
    for (const c of created) {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', c.id)
    }
    return NextResponse.json({ error: walletError.message }, { status: 500, headers: corsHeaders() })
  }

  // Create single wallet transaction for the combined booking
  await supabase.from('wallet_transactions').insert({
    user_id: user.id, type: 'debit', amount: totalCost,
    reason: 'booking_multiple', reference_id: created[0]?.id,
  })

  return NextResponse.json({ data: created, wallet_balance: balance - totalCost }, { status: 201, headers: corsHeaders() })
}
