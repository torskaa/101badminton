'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LiffEntryPage() {
  const router = useRouter()
  const [status, setStatus] = useState('initializing...')

  useEffect(() => {
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID

    if (!LIFF_ID) {
      setStatus('LIFF not configured')
      return
    }

    async function init() {
      setStatus('กำลังเชื่อมต่อ LINE...')

      try {
        const liffModule = await import('@line/liff')
        await liffModule.default.init({ liffId: LIFF_ID as string })

        if (!liffModule.default.isLoggedIn()) {
          setStatus('กำลังเข้าสู่ระบบ LINE...')
          liffModule.default.login()
          return
        }

        const profile = await liffModule.default.getProfile()
        setStatus(`ยินดีต้อนรับ ${profile.displayName}`)

        const token = liffModule.default.getAccessToken()
        if (!token) {
          setStatus('ไม่สามารถรับ access token ได้')
          return
        }

        const sessionRes = await fetch('/api/auth/line-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token }),
        })

        if (!sessionRes.ok) {
          const data = await sessionRes.json()
          setStatus(data.error || 'เกิดข้อผิดพลาด')
          return
        }

        const tenantRes = await fetch(`/api/liff/tenant?liffId=${LIFF_ID}`)
        if (tenantRes.ok) {
          const { slug } = await tenantRes.json()
          if (slug) {
            router.replace(`/${slug}/book`)
            return
          }
        }

        router.replace('/courts')
      } catch (err) {
        setStatus(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    init()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  )
}
