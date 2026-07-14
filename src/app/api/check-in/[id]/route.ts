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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() })
  }

  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const { data: checkIn } = await supabase
    .from('check_ins')
    .select('*, courts(tenant_id)')
    .eq('id', id)
    .single()

  if (!checkIn) {
    return NextResponse.json({ error: 'Check-in not found' }, { status: 404, headers: corsHeaders() })
  }

  if (checkIn.courts?.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  if (checkIn.check_out_at) {
    return NextResponse.json({ error: 'Already checked out' }, { status: 400, headers: corsHeaders() })
  }

  const checkOutAt = new Date().toISOString()
  const checkInAt = new Date(checkIn.check_in_at).getTime()
  const durationMin = Math.round((new Date().getTime() - checkInAt) / 60000)

  const { data, error: dbError } = await supabase
    .from('check_ins')
    .update({
      check_out_at: checkOutAt,
      duration_min: durationMin,
    })
    .eq('id', id)
    .select('*, courts(name), members(name, phone)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  const body = await request.json()
  if (body.light_off === true) {
    await supabase
      .from('light_control_logs')
      .insert({
        tenant_id: profile.tenant_id,
        court_id: checkIn.court_id,
        action: 'off',
        performed_by: user.id,
      })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}
