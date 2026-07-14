'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Binary, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LineLoginButton } from '@/components/layout/line-login-button'
import { signIn } from '@/lib/auth/actions'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Binary className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">เข้าสู่ระบบ</CardTitle>
          <CardDescription>Badminton Booking System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" name="email" type="email" placeholder="you@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              เข้าสู่ระบบ
            </Button>
          </form>

          <Separator className="my-4" />

          <LineLoginButton />

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
