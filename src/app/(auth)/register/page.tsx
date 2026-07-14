'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Binary, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signUp } from '@/lib/auth/actions'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    if (formData.get('password') !== formData.get('confirm_password')) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Binary className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">สมัครสมาชิกสำเร็จ</CardTitle>
            <CardDescription>
              กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันการสมัคร
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/login">ไปที่หน้าเข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Binary className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">สมัครสมาชิก</CardTitle>
          <CardDescription>สร้างบัญชีสำหรับระบบจองสนาม</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล</Label>
              <Input id="name" name="name" placeholder="สมชาย ใจดี" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" name="email" type="email" placeholder="you@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <Input id="phone" name="phone" type="tel" placeholder="081-234-5678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">ยืนยันรหัสผ่าน</Label>
              <Input id="confirm_password" name="confirm_password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              สมัครสมาชิก
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
