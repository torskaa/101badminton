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

        // Get LINE profile
        if (!liffModule.default.isLoggedIn()) {
          setStatus('กำลังเข้าสู่ระบบ LINE...')
          liffModule.default.login()
          return
        }

        const profile = await liffModule.default.getProfile()
        setStatus(`ยินดีต้อนรับ ${profile.displayName}`)

        // มองหา tenant จาก context
        // ถ้า LIFF ถูกเปิดจาก venue-specific URL เราจะมี slug อยู่แล้ว
        // ปกติ LIFF จะเปิดที่ endpoint URL → เรา redirect ไปหน้าสนาม
        // โดยใช้ LIFF_TENANT_MAP

        // Fetch tenant mapping จาก LIFF ID
        const res = await fetch(`/api/liff/tenant?liffId=${LIFF_ID}`)
        if (res.ok) {
          const { slug } = await res.json()
          if (slug) {
            router.replace(`/${slug}/book`)
            return
          }
        }

        // Fallback: ถ้าไม่เจอ slug → ไปหน้าเลือกสนาม
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
