import { NextResponse } from 'next/server'

export async function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${origin}/liff-callback`)
}
