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
  const range = searchParams.get('range') || 'monthly'
  const month = searchParams.get('month')
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  const now = new Date()
  const targetYear = parseInt(year)
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1

  let startDate: string
  let endDate: string

  if (range === 'daily') {
    startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const lastDay = new Date(targetYear, targetMonth, 0).getDate()
    endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  } else if (range === 'yearly') {
    startDate = `${targetYear}-01-01`
    endDate = `${targetYear}-12-31`
  } else {
    startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const lastDay = new Date(targetYear, targetMonth, 0).getDate()
    endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }

  const [
    { data: posOrders, error: posError },
    { data: bookingsData, error: bookingsError },
    { data: topCourtsData, error: topCourtsError },
    { data: revenueByDateData, error: revenueDateError },
  ] = await Promise.all([
    supabase
      .from('pos_orders')
      .select('total, created_at')
      .eq('tenant_id', profile.tenant_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59'),
    supabase
      .from('bookings')
      .select('id, start_time, status')
      .eq('tenant_id', profile.tenant_id)
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59'),
    supabase
      .from('bookings')
      .select('court_id, courts(name)')
      .eq('tenant_id', profile.tenant_id)
      .eq('status', 'confirmed')
      .gte('start_time', startDate)
      .lte('start_time', endDate + 'T23:59:59'),
    supabase
      .from('pos_orders')
      .select('total, created_at')
      .eq('tenant_id', profile.tenant_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: true }),
  ])

  if (posError || bookingsError || topCourtsError || revenueDateError) {
    return NextResponse.json({
      error: posError?.message || bookingsError?.message || topCourtsError?.message || revenueDateError?.message,
    }, { status: 500, headers: corsHeaders() })
  }

  const totalRevenue = (posOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)
  const totalBookings = (bookingsData || []).length
  const confirmedBookings = (bookingsData || []).filter(b => b.status === 'confirmed').length

  const courtCountMap: Record<string, { name: string; count: number }> = {}
  for (const b of topCourtsData || []) {
    const court = b.courts as unknown as { name: string } | null
    const courtName = court?.name || 'Unknown'
    if (!courtCountMap[b.court_id]) {
      courtCountMap[b.court_id] = { name: courtName, count: 0 }
    }
    courtCountMap[b.court_id].count++
  }
  const topCourts = Object.values(courtCountMap).sort((a, b) => b.count - a.count)

  const revenueByDateMap: Record<string, number> = {}
  for (const o of revenueByDateData || []) {
    const dateKey = o.created_at?.split('T')[0] || 'unknown'
    revenueByDateMap[dateKey] = (revenueByDateMap[dateKey] || 0) + (o.total || 0)
  }
  const revenueByDate = Object.entries(revenueByDateMap).map(([date, revenue]) => ({
    date,
    revenue,
  }))

  const report = {
    summary: {
      total_revenue: totalRevenue,
      court_revenue: totalRevenue,
      minibar_revenue: 0,
      total_bookings: totalBookings,
      confirmed_bookings: confirmedBookings,
      total_hours: confirmedBookings * 1,
    },
    top_courts: topCourts,
    revenue_by_date: revenueByDate,
    period: {
      range,
      start_date: startDate,
      end_date: endDate,
    },
  }

  return NextResponse.json(report, { headers: corsHeaders() })
}
