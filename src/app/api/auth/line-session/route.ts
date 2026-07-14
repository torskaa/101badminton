import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

function derivePassword(lineUserId: string): string {
  const secret = process.env.LINE_CHANNEL_SECRET || 'line-default-secret'
  let hash = 0
  for (let i = 0; i < (lineUserId + secret).length; i++) {
    const char = (lineUserId + secret).charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'Lp' + Math.abs(hash).toString(36).slice(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()
    if (!access_token) {
      return NextResponse.json({ error: 'Missing access_token' }, { status: 400 })
    }

    const verifyRes = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${access_token}`)
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid LINE token' }, { status: 401 })
    }

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to get LINE profile' }, { status: 401 })
    }
    const lineProfile = await profileRes.json()
    const lineUserId = lineProfile.userId as string
    const displayName = lineProfile.displayName as string

    const tenantMap: Record<string, string> = JSON.parse(process.env.LIFF_TENANT_MAP || '{}')
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    const tenantSlug = tenantMap[liffId || '']
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant mapping not found' }, { status: 500 })
    }

    const readClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: tenant } = await readClient.from('tenants').select('id').eq('slug', tenantSlug).single()
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { data: existing } = await readClient
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    const email = `line-${lineUserId}@badminton.app`
    const password = derivePassword(lineUserId)

    if (!existing) {
      const admin = createAdminClient()

      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, line_user_id: lineUserId },
      })
      if (createError || !newUser?.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      const userId = newUser.user.id

      await readClient.from('profiles').insert({
        id: userId,
        tenant_id: tenant.id,
        role: 'user',
        display_name: displayName,
        line_user_id: lineUserId,
      })

      await readClient.from('wallets').insert({
        user_id: userId,
        tenant_id: tenant.id,
        balance: 0,
      })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: 'Sign in failed: ' + signInError.message }, { status: 500 })
    }

    return NextResponse.json({
      user: { display_name: displayName, role: 'user' },
    })
  } catch (err) {
    console.error('line-session error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
