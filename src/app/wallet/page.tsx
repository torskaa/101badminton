'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  Plus,
  Minus,
  Loader2,
  ArrowUp,
  Upload,
  CreditCard,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Transaction {
  id: string
  type: 'credit' | 'debit'
  amount: number
  reason: string
  date: string
}

interface Topup {
  id: string
  amount: number
  status: 'pending' | 'confirmed' | 'rejected'
  date: string
}

interface WalletData {
  balance: number
  transactions: Transaction[]
  topups: Topup[]
}

const DEMO_WALLET: WalletData = {
  balance: 500,
  transactions: [
    { id: '1', type: 'credit', amount: 500, reason: 'เติมเงิน', date: '2026-07-10 14:30' },
    { id: '2', type: 'debit', amount: 120, reason: 'จองคอร์ท A (10:00-12:00)', date: '2026-07-09 09:15' },
    { id: '3', type: 'credit', amount: 300, reason: 'เติมเงิน', date: '2026-07-08 16:45' },
    { id: '4', type: 'debit', amount: 60, reason: 'จองคอร์ท B (14:00-15:00)', date: '2026-07-07 11:00' },
  ],
  topups: [
    { id: '1', amount: 500, status: 'confirmed', date: '2026-07-10 14:30' },
    { id: '2', amount: 300, status: 'confirmed', date: '2026-07-08 16:45' },
    { id: '3', amount: 200, status: 'pending', date: '2026-07-12 10:00' },
  ],
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WalletPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WalletData | null>(null)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/wallet')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load wallet')
        return res.json()
      })
      .then((json) => {
        setData({
          balance: json.balance ?? 0,
          transactions: (json.transactions || []).map((t: any) => ({
            id: t.id, type: t.type, amount: t.amount,
            reason: t.reason, date: t.created_at || t.date,
          })),
          topups: (json.topups || []).map((tp: any) => ({
            id: tp.id, amount: tp.amount, status: tp.status,
            date: tp.created_at || tp.date,
          })),
        })
        setLoading(false)
      })
      .catch(() => {
        setData(DEMO_WALLET)
        setLoading(false)
      })
  }, [])

  async function handleTopUp() {
    if (!topUpAmount || parseInt(topUpAmount) <= 0) return
    setSubmitting(true)
    try {
      await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(topUpAmount) }),
      })
      setTopUpOpen(false)
      setTopUpAmount('')
      const res2 = await fetch('/api/wallet')
      const json2 = await res2.json()
      setData({
        balance: json2.balance ?? 0,
        transactions: (json2.transactions || []).map((tx: any) => ({
          id: tx.id, type: tx.type, amount: tx.amount,
          reason: tx.reason, date: tx.created_at || tx.date,
        })),
        topups: (json2.topups || []).map((tp: any) => ({
          id: tp.id, amount: tp.amount, status: tp.status,
          date: tp.created_at || tp.date,
        })),
      })
    } catch {
      // demo fallback
      setTopUpOpen(false)
      setTopUpAmount('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">กำลังโหลดกระเป๋าเงิน...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-destructive">ไม่สามารถโหลดข้อมูลได้</p>
        <Button variant="outline" onClick={() => router.refresh()}>
          ลองอีกครั้ง
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Wallet</h1>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Balance Card */}
        <Card className="border-primary/20">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <Wallet className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">ยอดเงินคงเหลือ</p>
            <p className="text-4xl font-bold text-primary">
              {data.balance.toLocaleString()} ฿
            </p>
            <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
              <DialogTrigger asChild>
                <Button className="mt-2 gap-2">
                  <Plus className="h-4 w-4" />
                  เติมเงิน
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>เติมเงิน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">จำนวนเงิน (THB)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="เช่น 500"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                    />
                  </div>

                  {/* QR PromptPay Placeholder */}
                  <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6">
                    <CreditCard className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-medium">PromptPay QR Code</p>
                    <p className="text-xs text-muted-foreground text-center">
                      สแกน QR Code เพื่อชำระเงินผ่าน PromptPay
                    </p>
                    <div className="mt-2 flex h-40 w-40 items-center justify-center rounded-lg bg-muted">
                      <CreditCard className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  </div>

                  {/* Upload Slip */}
                  <div className="grid gap-2">
                    <Label>อัปโหลดสลิป</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="gap-2" asChild>
                        <label>
                          <Upload className="h-4 w-4" />
                          เลือกไฟล์
                          <input type="file" accept="image/*" className="hidden" />
                        </label>
                      </Button>
                      <span className="text-xs text-muted-foreground">รูปสลิปโอนเงิน</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    * แจ้งชำระเงินแล้ว รอแอดมินยืนยัน (ปกติภายใน 24 ชม.)
                  </p>

                  <Button
                    className="w-full gap-2"
                    onClick={handleTopUp}
                    disabled={submitting || !topUpAmount}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                    แจ้งชำระเงิน
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Transactions / Topup History */}
        <Tabs defaultValue="transactions">
          <TabsList className="w-full">
            <TabsTrigger value="transactions" className="flex-1">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="topups" className="flex-1">
              Top Up History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-2">
            {data.transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Wallet className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">ไม่มีรายการเดินบัญชี</p>
              </div>
            ) : (
              data.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      tx.type === 'credit'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {tx.type === 'credit' ? (
                      <Plus className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{tx.reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'credit' ? '+' : '-'}
                    {tx.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="topups" className="space-y-2">
            {data.topups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <ArrowUp className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">ไม่พบประวัติการเติมเงิน</p>
              </div>
            ) : (
              data.topups.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      +{t.amount.toLocaleString()} ฿
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                  </div>
                  <Badge
                    variant={
                      t.status === 'confirmed'
                        ? 'default'
                        : t.status === 'rejected'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {t.status === 'confirmed'
                      ? 'ยืนยันแล้ว'
                      : t.status === 'rejected'
                        ? 'ปฏิเสธ'
                        : 'รอยืนยัน'}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[padding-bottom]:pb-[env(safe-area-inset-bottom,12px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">คงเหลือ</span>
            <span className="text-lg font-bold text-primary">
              {data.balance.toLocaleString()} ฿
            </span>
          </div>
          <Button size="sm" onClick={() => setTopUpOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            เติมเงิน
          </Button>
        </div>
      </div>
    </div>
  )
}
