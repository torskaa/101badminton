'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Binary, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

function SetupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'venue' | 'done'>('venue')

  const prefillName = searchParams.get('name') || ''
  const prefillPhone = searchParams.get('phone') || ''

  async function handleCreateVenue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const venueName = formData.get('venue_name') as string
    const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({ name: venueName, slug })
      .select('id')
      .single()

    if (tenantErr) {
      setError(tenantErr.message)
      setLoading(false)
      return
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        tenant_id: tenant.id,
        role: 'owner',
        display_name: formData.get('display_name') as string || user.email?.split('@')[0] || 'Owner',
      })

    if (profileErr) {
      setError(profileErr.message)
      setLoading(false)
      return
    }

    setStep('done')
    setLoading(false)
    setTimeout(() => router.push('/admin'), 1500)
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">🎉 พร้อมใช้งานแล้ว!</CardTitle>
            <CardDescription>กำลังนำคุณไปยังหน้า Admin...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Binary className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">ตั้งค่าระบบครั้งแรก</CardTitle>
          <CardDescription>สร้างสนามของคุณเพื่อเริ่มต้นใช้งาน</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateVenue} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="venue_name">ชื่อสนาม / Venue</Label>
              <Input id="venue_name" name="venue_name" placeholder="เช่น สนามแบดมินตัน ABC" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">ชื่อผู้ดูแลระบบ</Label>
              <Input id="display_name" name="display_name" placeholder="เช่น สมชาย ใจดี" defaultValue={prefillName} />
            </div>
            {prefillPhone && (
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input id="phone" name="phone" type="tel" placeholder="081-234-5678" defaultValue={prefillPhone} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              เริ่มต้นใช้งาน
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  )
}
