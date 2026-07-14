'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useLiff } from '@/lib/liff/provider'
import { signInWithLINE } from '@/lib/auth/actions'

export function LineLoginButton() {
  const { initialized, isInLine, loginWithLINE, error: liffError } = useLiff()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      if (initialized && isInLine) {
        await loginWithLINE()
      } else {
        const result = await signInWithLINE()
        if (result?.error) {
          setError(result.error)
          setLoading(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LINE login failed')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleClick}
        disabled={loading || (!initialized && !!process.env.NEXT_PUBLIC_LIFF_ID)}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#06C755]">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 11.5c0 1.38-1.12 2.5-2.5 2.5h-6c-1.38 0-2.5-1.12-2.5-2.5v-3c0-1.38 1.12-2.5 2.5-2.5h6c1.38 0 2.5 1.12 2.5 2.5v3z"/>
          </svg>
        )}
        {isInLine ? 'เข้าสู่ระบบด้วย LINE' : 'เข้าสู่ระบบด้วย LINE'}
      </Button>
      {(error || liffError) && (
        <p className="text-xs text-destructive text-center">{error || liffError}</p>
      )}
      {isInLine && (
        <p className="text-xs text-muted-foreground text-center">
          กำลังใช้งานใน LINE
        </p>
      )}
    </div>
  )
}
