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

async function getAuthUser(supabase: ReturnType<typeof createServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getTenantId(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()
  return profile?.tenant_id ?? null
}

async function withAuthAndTenant(supabase: ReturnType<typeof createServerClient>) {
  const user = await getAuthUser(supabase)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() }), user: null, tenantId: null }
  const tenantId = await getTenantId(supabase, user.id)
  if (!tenantId) return { error: NextResponse.json({ error: 'Tenant not found' }, { status: 403, headers: corsHeaders() }), user, tenantId: null }
  return { error: null, user, tenantId }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(_request: NextRequest) {
  const supabase = await getSupabase()
  const { error, tenantId } = await withAuthAndTenant(supabase)
  if (error) return error

  const { data, error: dbError } = await supabase
    .from('courts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { error, tenantId } = await withAuthAndTenant(supabase)
  if (error) return error

  const body = await request.json()
  const { name, description, hourly_rate, is_active } = body

  if (!name || hourly_rate === undefined) {
    return NextResponse.json({ error: 'Missing required fields: name, hourly_rate' }, { status: 400, headers: corsHeaders() })
  }

  const { data, error: dbError } = await supabase
    .from('courts')
    .insert({ tenant_id: tenantId, name, description, hourly_rate, is_active: is_active ?? true })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders() })
  }

  return NextResponse.json(data, { status: 201, headers: corsHeaders() })
}
