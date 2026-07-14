import { NextRequest, NextResponse } from 'next/server'

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const amount = searchParams.get('amount')

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid or missing amount query param' }, { status: 400, headers: corsHeaders() })
  }

  const ref = `mock-ref-${Date.now()}`
  const qr_image_url = '/images/promptpay-placeholder.png'

  return NextResponse.json({ qr_image_url, ref, amount: Number(amount) }, { headers: corsHeaders() })
}
