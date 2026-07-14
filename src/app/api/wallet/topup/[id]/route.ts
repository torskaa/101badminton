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
    const { action, note } = body
    if (!action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "confirm" or "reject"' }, { status: 400, headers: corsHeaders() })
    }
    return NextResponse.json({
      id,
      action,
      status: action === 'confirm' ? 'confirmed' : 'rejected',
      note: note || null,
    }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()
  const { error, user } = await getAuth(supabase)
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { action, note } = body

  if (!action || !['confirm', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be "confirm" or "reject"' }, { status: 400, headers: corsHeaders() })
  }

  const { data: topup, error: fetchError } = await supabase
    .from('topup_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !topup) {
    return NextResponse.json({ error: 'Topup request not found' }, { status: 404, headers: corsHeaders() })
  }

  if (topup.status !== 'pending') {
    return NextResponse.json({ error: 'Topup request is already processed' }, { status: 400, headers: corsHeaders() })
  }

  if (action === 'confirm') {
    const { error: updateError } = await supabase
      .from('topup_requests')
      .update({ status: 'confirmed', note: note || null, processed_by: user.id, processed_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: corsHeaders() })
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', topup.user_id)
      .single()

    const currentBalance = wallet?.balance ?? 0

    const { error: walletError } = await supabase
      .from('wallets')
      .upsert({ user_id: topup.user_id, balance: currentBalance + topup.amount }, { onConflict: 'user_id' })

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500, headers: corsHeaders() })
    }

    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: topup.user_id,
        type: 'credit',
        amount: topup.amount,
        reason: 'topup',
        reference_id: id,
      })

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500, headers: corsHeaders() })
    }

    return NextResponse.json({ id, status: 'confirmed', note: note || null }, { headers: corsHeaders() })
  }

  const { error: rejectError } = await supabase
    .from('topup_requests')
    .update({ status: 'rejected', note: note || null, processed_by: user.id, processed_at: new Date().toISOString() })
    .eq('id', id)

  if (rejectError) {
    return NextResponse.json({ error: rejectError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json({ id, status: 'rejected', note: note || null }, { headers: corsHeaders() })
}
