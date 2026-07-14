'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WalletBalance() {
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wallet')
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.balance ?? 0)
        setLoading(false)
      })
      .catch(() => {
        setBalance(0)
        setLoading(false)
      })
  }, [])

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 rounded-full border-primary/20 text-xs font-medium text-primary"
      onClick={() => router.push('/wallet')}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <Wallet className="h-3.5 w-3.5" />
          <span>{balance} pts</span>
        </>
      )}
    </Button>
  )
}
