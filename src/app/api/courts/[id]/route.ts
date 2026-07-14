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

  const { data: court } = await supabase
    .from('courts')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404, headers: corsHeaders() })
  }

  if (court.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { name, description, hourly_rate, is_active } = body

  const { data, error: dbError } = await supabase
    .from('courts')
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(hourly_rate !== undefined && { hourly_rate }),
      ...(is_active !== undefined && { is_active }),
    })
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: court } = await supabase
    .from('courts')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404, headers: corsHeaders() })
  }

  if (court.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const { data: activeBookings, error: bookingsCheckError } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', id)
    .eq('status', 'confirmed')
    .limit(1)

  if (bookingsCheckError) {
    return NextResponse.json({ error: bookingsCheckError.message }, { status: 500, headers: corsHeaders() })
  }

  if (activeBookings && activeBookings.length > 0) {
    return NextResponse.json({ error: 'Cannot deactivate court: active bookings exist' }, { status: 409, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('courts')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}
