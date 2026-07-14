'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Liff } from '@line/liff'
import { createClient } from '@/lib/supabase/client'

interface LiffContextValue {
  liff: Liff | null
  initialized: boolean
  isInLine: boolean
  profile: { userId: string; displayName: string; pictureUrl?: string } | null
  error: string | null
  loginWithLINE: () => Promise<void>
  logout: () => Promise<void>
}

const LiffContext = createContext<LiffContextValue>({
  liff: null,
  initialized: false,
  isInLine: false,
  profile: null,
  error: null,
  loginWithLINE: async () => {},
  logout: async () => {},
})

export function useLiff() {
  return useContext(LiffContext)
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [liff, setLiff] = useState<Liff | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isInLine, setIsInLine] = useState(false)
  const [profile, setProfile] = useState<LiffContextValue['profile']>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID

    if (!LIFF_ID) {
      setInitialized(true)
      return
    }

    let cancelled = false

    async function initLiff() {
      try {
        const liffModule = await import('@line/liff')
        await liffModule.default.init({ liffId: LIFF_ID as string })
        if (cancelled) return

        setLiff(liffModule.default)
        setIsInLine(liffModule.default.isInClient())

        if (liffModule.default.isLoggedIn()) {
          const userProfile = await liffModule.default.getProfile()
          if (!cancelled) {
            setProfile({
              userId: userProfile.userId,
              displayName: userProfile.displayName,
              pictureUrl: userProfile.pictureUrl,
            })
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'LIFF init failed')
        }
      } finally {
        if (!cancelled) {
          setInitialized(true)
        }
      }
    }

    initLiff()

    return () => { cancelled = true }
  }, [])

  const loginWithLINE = useCallback(async () => {
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID

    if (liff && LIFF_ID) {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.origin + '/liff-callback' })
      } else {
        const token = liff.getAccessToken()
        if (token) {
          const res = await fetch('/api/auth/line-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: token }),
          })
          if (res.ok) {
            window.location.reload()
          }
        }
      }
      return
    }

    const supabase = createClient()
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'line' as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError(oauthError.message)
    }
  }, [liff])

  const logout = useCallback(async () => {
    if (liff?.isLoggedIn()) {
      liff.logout()
    }
    setProfile(null)
    const supabase = createClient()
    await supabase.auth.signOut()
  }, [liff])

  return (
    <LiffContext.Provider
      value={{
        liff,
        initialized,
        isInLine,
        profile,
        error,
        loginWithLINE,
        logout,
      }}
    >
      {children}
    </LiffContext.Provider>
  )
}
