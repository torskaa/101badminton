"use client"

import { useState, useEffect } from "react"
import { CalendarCheck, CalendarX, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CourtInfo {
  name: string
}

interface Booking {
  id: string
  court_id: string
  start_time: string
  end_time: string
  status: string
  note: string | null
  created_by: string
  courts: CourtInfo | null
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear() + 543
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")
  return { date: `${day}/${month}/${year}`, time: `${hours}:${minutes}` }
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed: { label: "ยืนยันแล้ว", variant: "default" },
  pending: { label: "รอยืนยัน", variant: "secondary" },
  completed: { label: "เสร็จสิ้น", variant: "outline" },
  cancelled: { label: "ยกเลิก", variant: "destructive" },
}

function BookingCard({
  booking,
  showCancel,
  onCancel,
  cancelling,
}: {
  booking: Booking
  showCancel?: boolean
  onCancel?: (id: string) => void
  cancelling?: boolean
}) {
  const start = formatDateTime(booking.start_time)
  const end = formatDateTime(booking.end_time)
  const config = statusConfig[booking.status] ?? { label: booking.status, variant: "secondary" as const }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{booking.courts?.name ?? "ไม่พบข้อมูลสนาม"}</h3>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                {start.date}
              </div>
              <div className="flex items-center gap-2">
                <CalendarX className="h-4 w-4 text-muted-foreground" />
                {start.time} - {end.time}
              </div>
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
        {showCancel && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={cancelling}
            onClick={() => onCancel?.(booking.id)}
          >
            {cancelling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            ยกเลิก
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <CalendarCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState("upcoming")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data: Booking[] = await apiFetch('/api/bookings')
        setBookings(Array.isArray(data) ? data : [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const userBookings = bookings.filter((b) => !userId || b.created_by === userId)

  const upcoming = userBookings.filter((b) => b.status === "confirmed" || b.status === "pending")
  const history = userBookings.filter((b) => b.status === "completed" || b.status === "cancelled")

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' })
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
      )
    } catch {
      // ignore
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">การจองของฉัน</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="font-medium text-destructive">ไม่สามารถโหลดข้อมูลได้</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="upcoming" className="flex-1">กำลังจะมาถึง</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">ประวัติ</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcoming.length > 0 ? (
                upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    showCancel={b.status === "confirmed"}
                    onCancel={handleCancel}
                    cancelling={cancellingId === b.id}
                  />
                ))
              ) : (
                <EmptyState message="ยังไม่มีการจองที่กำลังจะมาถึง" />
              )}
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-3">
              {history.length > 0 ? (
                history.map((b) => <BookingCard key={b.id} booking={b} />)
              ) : (
                <EmptyState message="ยังไม่มีประวัติการจอง" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
