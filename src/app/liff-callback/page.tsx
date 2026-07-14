'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LiffCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      try {
        const liffModule = await import('@line/liff')
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          setError('LIFF not configured')
          return
        }

        await liffModule.default.init({ liffId })

        if (!liffModule.default.isLoggedIn()) {
          setError('LINE login failed')
          return
        }

        const token = liffModule.default.getAccessToken()
        if (!token) {
          setError('No access token')
          return
        }

        const res = await fetch('/api/auth/line-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to create session')
          return
        }

        router.push('/')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Callback failed')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">กำลังเข้าสู่ระบบ...</p>
    </div>
  )
}
