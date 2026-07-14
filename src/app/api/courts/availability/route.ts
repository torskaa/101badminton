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

const DEMO_COURTS = [
  { id: '1', name: 'คอร์ท A', hourly_rate: 120 },
  { id: '2', name: 'คอร์ท B', hourly_rate: 120 },
  { id: '3', name: 'คอร์ท C', hourly_rate: 150 },
]

function generateDemoBookings(date: string) {
  const slots = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '18:00', '19:00', '20:00']
  return DEMO_COURTS.map((court) => {
    const count = Math.floor(Math.random() * 3) + 1
    const bookings: { start_time: string; end_time: string }[] = []
    const used = new Set<number>()
    for (let i = 0; i < count; i++) {
      let idx: number
      do { idx = Math.floor(Math.random() * slots.length) } while (used.has(idx))
      used.add(idx)
      const start = slots[idx]
      const [h] = start.split(':').map(Number)
      const endH = h + 1
      const end = `${String(endH).padStart(2, '0')}:00`
      bookings.push({ start_time: `${date}T${start}:00Z`, end_time: `${date}T${end}:00Z` })
    }
    return { id: court.id, name: court.name, hourly_rate: court.hourly_rate, bookings }
  })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const tenant_id = searchParams.get('tenant_id')

  if (!date) {
    return NextResponse.json({ error: 'Missing required query param: date (YYYY-MM-DD)' }, { status: 400, headers: corsHeaders() })
  }

  if (!isConfigured()) {
    const courts = generateDemoBookings(date)
    return NextResponse.json({ date, courts, tenant_id: tenant_id || null }, { headers: corsHeaders() })
  }

  const supabase = await getSupabase()

  let courtQuery = supabase.from('courts').select('id, name, hourly_rate').order('name', { ascending: true })
  if (tenant_id) {
    courtQuery = courtQuery.eq('tenant_id', tenant_id)
  }

  const { data: courts, error: courtsError } = await courtQuery
  if (courtsError) {
    return NextResponse.json({ error: courtsError.message }, { status: 500, headers: corsHeaders() })
  }

  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  const courtIds = courts?.map((c: { id: string }) => c.id) || []

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('court_id, start_time, end_time')
    .in('court_id', courtIds)
    .in('status', ['confirmed', 'pending'])
    .gte('start_time', startOfDay)
    .lte('end_time', endOfDay)

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500, headers: corsHeaders() })
  }

  const bookingsByCourt: Record<string, { start_time: string; end_time: string }[]> = {}
  for (const b of bookings || []) {
    if (!bookingsByCourt[b.court_id]) bookingsByCourt[b.court_id] = []
    bookingsByCourt[b.court_id].push({ start_time: b.start_time, end_time: b.end_time })
  }

  const result = (courts || []).map((court: { id: string; name: string; hourly_rate: number }) => ({
    id: court.id,
    name: court.name,
    hourly_rate: court.hourly_rate,
    bookings: bookingsByCourt[court.id] || [],
  }))

  return NextResponse.json({ date, courts: result }, { headers: corsHeaders() })
}
