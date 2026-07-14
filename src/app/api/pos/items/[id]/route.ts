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

  const { data: item } = await supabase
    .from('pos_items')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404, headers: corsHeaders() })
  }

  if (item.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { name, price, cost, stock, category } = body

  const { data, error: dbError } = await supabase
    .from('pos_items')
    .update({
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(cost !== undefined && { cost }),
      ...(stock !== undefined && { stock }),
      ...(category !== undefined && { category }),
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

  const { data: item } = await supabase
    .from('pos_items')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404, headers: corsHeaders() })
  }

  if (item.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const { data: referencingOrders } = await supabase
    .from('order_items')
    .select('id')
    .eq('item_id', id)
    .limit(1)

  if (referencingOrders && referencingOrders.length > 0) {
    return NextResponse.json({ error: 'Cannot delete item: it is referenced by existing orders' }, { status: 409, headers: corsHeaders() })
  }

  const { error: dbError } = await supabase
    .from('pos_items')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json({ message: 'Item deleted' }, { headers: corsHeaders() })
}
