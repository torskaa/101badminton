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

async function getAuth(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() }) }
  return { user }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) {
    const { id } = await params
    const body = await request.json()
    return NextResponse.json({
      id,
      ...body,
      updated: true,
      refunded: body.status === 'cancelled' ? 120 : undefined,
    }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, courts(tenant_id, hourly_rate)')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404, headers: corsHeaders() })
  }

  if (booking.courts?.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const isOwner = booking.created_by === user.id
  const isAdmin = profile.role === 'admin'
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Only the booking owner or an admin can update this booking' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { status, start_time, end_time, note, court_id } = body

  const isCancelling = status === 'cancelled' && booking.status !== 'cancelled'

  const updateData: Record<string, string | null> = {}
  if (status !== undefined) updateData.status = status
  if (start_time !== undefined) updateData.start_time = start_time
  if (end_time !== undefined) updateData.end_time = end_time
  if (note !== undefined) updateData.note = note
  if (court_id !== undefined) updateData.court_id = court_id

  const { data, error: dbError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select('*, courts(name)')
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  if (isCancelling) {
    const hourlyRate = (booking.courts as { hourly_rate?: number })?.hourly_rate || 0
    const startDate = new Date(booking.start_time)
    const endDate = new Date(booking.end_time)
    const hours = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 3600000))
    const refund = hourlyRate * hours

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', booking.created_by)
      .single()

    const currentBalance = wallet?.balance ?? 0

    const { error: walletError } = await supabase
      .from('wallets')
      .upsert({ user_id: booking.created_by, balance: currentBalance + refund }, { onConflict: 'user_id' })

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500, headers: corsHeaders() })
    }

    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: booking.created_by,
        type: 'credit',
        amount: refund,
        reason: 'booking_cancel',
        reference_id: id,
      })

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500, headers: corsHeaders() })
    }

    return NextResponse.json({ ...data, refund }, { headers: corsHeaders() })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) {
    const { id } = await params
    return NextResponse.json({ id, status: 'cancelled', refund: 120 }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() })
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, courts(tenant_id, hourly_rate)')
    .eq('id', id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404, headers: corsHeaders() })
  }

  if (booking.courts?.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  const hourlyRate = (booking.courts as { hourly_rate?: number })?.hourly_rate || 0
  const startDate = new Date(booking.start_time)
  const endDate = new Date(booking.end_time)
  const hours = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 3600000))
  const refund = hourlyRate * hours

  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', booking.created_by)
    .single()

  const currentBalance = wallet?.balance ?? 0

  const { error: walletError } = await supabase
    .from('wallets')
    .upsert({ user_id: booking.created_by, balance: currentBalance + refund }, { onConflict: 'user_id' })

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 500, headers: corsHeaders() })
  }

  const { error: txError } = await supabase
    .from('wallet_transactions')
    .insert({
      user_id: booking.created_by,
      type: 'credit',
      amount: refund,
      reason: 'booking_cancel',
      reference_id: id,
    })

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json({ ...data, refund }, { headers: corsHeaders() })
}
