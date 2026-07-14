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

  const { data: coupon } = await supabase
    .from('coupons')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404, headers: corsHeaders() })
  }

  if (coupon.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const body = await request.json()
  const { code, description, discount_type, discount_value, min_spend, max_uses, points_cost, starts_at, expires_at } = body

  const updateData: Record<string, unknown> = {}
  if (code !== undefined) updateData.code = code.toUpperCase()
  if (description !== undefined) updateData.description = description
  if (discount_type !== undefined) updateData.discount_type = discount_type
  if (discount_value !== undefined) updateData.discount_value = discount_value
  if (min_spend !== undefined) updateData.min_spend = min_spend
  if (max_uses !== undefined) updateData.max_uses = max_uses
  if (points_cost !== undefined) updateData.points_cost = points_cost
  if (starts_at !== undefined) updateData.starts_at = starts_at
  if (expires_at !== undefined) updateData.expires_at = expires_at

  const { data, error: dbError } = await supabase
    .from('coupons')
    .update(updateData)
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

  const { data: coupon } = await supabase
    .from('coupons')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404, headers: corsHeaders() })
  }

  if (coupon.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() })
  }

  const { error: dbError } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json({ message: 'Coupon deleted' }, { headers: corsHeaders() })
}
