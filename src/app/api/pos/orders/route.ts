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

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  let query = supabase
    .from('pos_orders')
    .select('*, order_items(*, pos_items(name))')
    .eq('tenant_id', profile.tenant_id)

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data, error: dbError } = await query.order('created_at', { ascending: false })

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
  const { customer_name, items, payment_method, member_id } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Missing required field: items (non-empty array)' }, { status: 400, headers: corsHeaders() })
  }

  if (!payment_method) {
    return NextResponse.json({ error: 'Missing required field: payment_method' }, { status: 400, headers: corsHeaders() })
  }

  let total = 0
  for (const item of items) {
    total += item.quantity * item.unit_price
  }

  const { data: order, error: orderError } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id: profile.tenant_id,
      customer_name: customer_name || null,
      total,
      payment_method,
      member_id: member_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500, headers: corsHeaders() })
  }

  const orderItems = items.map((item: { item_id: string; quantity: number; unit_price: number }) => ({
    order_id: order.id,
    item_id: item.item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) {
    await supabase.from('pos_orders').delete().eq('id', order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500, headers: corsHeaders() })
  }

  if (member_id) {
    const pointsToAward = Math.floor(total / 10)

    if (pointsToAward > 0) {
      await supabase
        .from('points_transactions')
        .insert({
          tenant_id: profile.tenant_id,
          member_id,
          points: pointsToAward,
          type: 'earn',
          reference_type: 'order',
          reference_id: order.id,
        })

      await supabase
        .from('members')
        .update({ total_spent: supabase.rpc('increment', { x: total }) })
        .eq('id', member_id)
    }
  }

  const { data: fullOrder } = await supabase
    .from('pos_orders')
    .select('*, order_items(*, pos_items(name))')
    .eq('id', order.id)
    .single()

  return NextResponse.json(fullOrder, { status: 201, headers: corsHeaders() })
}
