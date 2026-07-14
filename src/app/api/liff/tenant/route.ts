import { NextResponse } from 'next/server'
import { getTenantSlugFromLiffId } from '@/lib/liff/config'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const liffId = searchParams.get('liffId') || process.env.NEXT_PUBLIC_LIFF_ID || ''

  const slug = getTenantSlugFromLiffId(liffId)

  return NextResponse.json({ slug, liffId })
}
