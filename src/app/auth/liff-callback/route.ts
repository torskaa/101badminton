import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const origin = requestUrl.origin

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=line_auth_failed`)
  }

  // Check if profile exists, if not redirect to setup
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Try to extract display name from user metadata
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'LINE User'
    const phone = user.user_metadata?.phone || ''

    // Check if they belong to a tenant already (via invite, etc.)
    // If not, redirect to setup to create one
    return NextResponse.redirect(`${origin}/setup?name=${encodeURIComponent(displayName)}&phone=${encodeURIComponent(phone)}`)
  }

  return NextResponse.redirect(`${origin}/admin`)
}
