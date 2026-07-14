'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, Eye, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'

interface TopupRequest {
  id: string
  user_name: string
  user_id: string
  amount: number
  slip_url?: string
  note?: string
  status: 'pending' | 'confirmed' | 'rejected'
  date: string
}

const DEMO_TOPUPS: TopupRequest[] = [
  {
    id: '1',
    user_name: 'สมชาย ใจดี',
    user_id: 'u001',
    amount: 500,
    slip_url: '/slips/001.jpg',
    status: 'pending',
    date: '2026-07-12T10:30:00',
  },
  {
    id: '2',
    user_name: 'วิภา รักแบด',
    user_id: 'u002',
    amount: 1000,
    slip_url: '/slips/002.jpg',
    status: 'pending',
    date: '2026-07-12T09:15:00',
  },
  {
    id: '3',
    user_name: 'อนุชา แสนดี',
    user_id: 'u003',
    amount: 300,
    status: 'confirmed',
    date: '2026-07-10T14:30:00',
  },
  {
    id: '4',
    user_name: 'มานี มีชัย',
    user_id: 'u004',
    amount: 200,
    status: 'rejected',
    date: '2026-07-09T16:45:00',
  },
  {
    id: '5',
    user_name: 'พิชัย เร็วแรง',
    user_id: 'u005',
    amount: 800,
    status: 'confirmed',
    date: '2026-07-08T11:00:00',
  },
]

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

export default function AdminWalletPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topups, setTopups] = useState<TopupRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedTopup, setSelectedTopup] = useState<TopupRequest | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [slipOpen, setSlipOpen] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch('/api/admin/topups')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setTopups)
      .catch(() => setTopups(DEMO_TOPUPS))
      .finally(() => setLoading(false))
  }, [])

  const pendingTopups = topups.filter((t) => t.status === 'pending')
  const filteredAll = topups.filter(
    (t) =>
      !searchQuery ||
      t.user_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleConfirm() {
    if (!selectedTopup) return
    setActing(true)
    try {
      await fetch(`/api/admin/topups/${selectedTopup.id}/confirm`, {
        method: 'POST',
      })
      setTopups((prev) =>
        prev.map((t) =>
          t.id === selectedTopup.id ? { ...t, status: 'confirmed' as const } : t
        )
      )
      setConfirmOpen(false)
      setSelectedTopup(null)
    } catch {
      // demo fallback
      setTopups((prev) =>
        prev.map((t) =>
          t.id === selectedTopup.id ? { ...t, status: 'confirmed' as const } : t
        )
      )
      setConfirmOpen(false)
      setSelectedTopup(null)
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!selectedTopup) return
    setActing(true)
    try {
      await fetch(`/api/admin/topups/${selectedTopup.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote }),
      })
      setTopups((prev) =>
        prev.map((t) =>
          t.id === selectedTopup.id ? { ...t, status: 'rejected' as const, note: rejectNote } : t
        )
      )
      setRejectOpen(false)
      setRejectNote('')
      setSelectedTopup(null)
    } catch {
      setTopups((prev) =>
        prev.map((t) =>
          t.id === selectedTopup.id ? { ...t, status: 'rejected' as const, note: rejectNote } : t
        )
      )
      setRejectOpen(false)
      setRejectNote('')
      setSelectedTopup(null)
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          ลองอีกครั้ง
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet Management</h1>
        <Badge variant="outline" className="text-primary">
          {pendingTopups.length} รออนุมัติ
        </Badge>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals
            {pendingTopups.length > 0 && (
              <Badge variant="default" className="ml-2 h-5 px-1.5 text-[10px]">
                {pendingTopups.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Topups</TabsTrigger>
        </TabsList>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending">
          {pendingTopups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Check className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium text-muted-foreground">
                ไม่มีรายการรออนุมัติ
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>สลิป</TableHead>
                    <TableHead className="text-right">ดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTopups.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.user_name}</TableCell>
                      <TableCell>{t.amount.toLocaleString()} ฿</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => {
                            setSelectedTopup(t)
                            setSlipOpen(true)
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          ดูสลิป
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelectedTopup(t)
                              setConfirmOpen(true)
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            ยืนยัน
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive"
                            onClick={() => {
                              setSelectedTopup(t)
                              setRejectOpen(true)
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                            ปฏิเสธ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* All Topups Tab */}
        <TabsContent value="all">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามชื่อผู้ใช้..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredAll.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? 'ไม่พบรายการที่ค้นหา' : 'ไม่มีประวัติการเติมเงิน'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ผู้ใช้</TableHead>
                    <TableHead>จำนวนเงิน</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAll.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.user_name}</TableCell>
                      <TableCell>{t.amount.toLocaleString()} ฿</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                        {t.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการเติมเงิน</DialogTitle>
            <DialogDescription>
              ยืนยันการเติมเงินจำนวน {selectedTopup?.amount.toLocaleString()} ฿
              ของ {selectedTopup?.user_name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfirm} disabled={acting}>
              {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธการเติมเงิน</DialogTitle>
            <DialogDescription>
              ปฏิเสธการเติมเงินจำนวน {selectedTopup?.amount.toLocaleString()} ฿
              ของ {selectedTopup?.user_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rejectNote">หมายเหตุ</Label>
            <Textarea
              id="rejectNote"
              placeholder="ระบุเหตุผลที่ปฏิเสธ..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={acting}
            >
              {acting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              ปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Slip Dialog */}
      <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สลิปการโอนเงิน</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-64 w-full items-center justify-center rounded-lg bg-muted">
              <Eye className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedTopup?.user_name} — {selectedTopup?.amount.toLocaleString()} ฿
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
