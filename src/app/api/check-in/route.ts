import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(_request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('check_ins')
    .select('*, courts(name), members(name, phone)')
    .eq('tenant_id', profile.tenant_id)
    .is('check_out_at', null)
    .order('check_in_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { court_id, member_id, booking_id, customer_name } = body

  if (!court_id) {
    return NextResponse.json({ error: 'Missing required field: court_id' }, { status: 400, headers: corsHeaders() })
  }

  const { data: court } = await supabase
    .from('courts')
    .select('id, tenant_id')
    .eq('id', court_id)
    .single()

  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404, headers: corsHeaders() })
  }

  if (court.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('check_ins')
    .insert({
      tenant_id: profile.tenant_id,
      court_id,
      member_id: member_id || null,
      booking_id: booking_id || null,
      customer_name: customer_name || null,
      check_in_at: new Date().toISOString(),
    })
    .select('*, courts(name), members(name, phone)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  await supabase
    .from('light_control_logs')
    .insert({
      tenant_id: profile.tenant_id,
      court_id,
      action: 'on',
      performed_by: user.id,
    })

  return NextResponse.json(data, { status: 201, headers: corsHeaders() })
}
