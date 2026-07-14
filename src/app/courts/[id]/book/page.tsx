"use client"

import { useState, useEffect, use, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8
  return `${hour.toString().padStart(2, "0")}:00`
})

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  return days
}

const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
]

interface Court {
  id: string
  name: string
  description: string | null
  hourly_rate: number
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function toSlotKey(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`
}

export default function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const today = new Date()

  const [court, setCourt] = useState<Court | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate())
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [remark, setRemark] = useState("")
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const days = getMonthDays(currentYear, currentMonth)

  const fetchBookingsForDate = useCallback(async (year: number, month: number, day: number) => {
    if (!id) return
    setLoadingBookings(true)
    const dateStr = toDateStr(year, month, day)
    try {
      const data: Booking[] = await apiFetch(
        `/api/bookings?court_id=${id}&date_from=${dateStr}T00:00:00&date_to=${dateStr}T23:59:59`
      )
      const booked: string[] = []
      for (const b of data) {
        const start = new Date(b.start_time)
        const end = new Date(b.end_time)
        for (let h = start.getHours(); h < end.getHours(); h++) {
          booked.push(toSlotKey(h))
        }
      }
      setBookedSlots(booked)
    } catch {
      setBookedSlots([])
    } finally {
      setLoadingBookings(false)
    }
  }, [id])

  useEffect(() => {
    apiFetch('/api/courts')
      .then((data: Court[]) => {
        const found = data.find((c) => c.id === id)
        if (found) {
          setCourt(found)
        } else {
          setPageError("ไม่พบสนาม")
        }
      })
      .catch((err) => setPageError(err.message))
      .finally(() => setPageLoading(false))
  }, [id])

  useEffect(() => {
    if (selectedDate && court) {
      fetchBookingsForDate(currentYear, currentMonth, selectedDate)
    }
  }, [selectedDate, currentYear, currentMonth, court, fetchBookingsForDate])

  useEffect(() => {
    setSelectedSlots([])
  }, [selectedDate, currentMonth, currentYear])

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const isBooked = (slot: string) => bookedSlots.includes(slot)
  const isSelected = (slot: string) => selectedSlots.includes(slot)

  const toggleSlot = (slot: string) => {
    if (isBooked(slot)) return
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    )
  }

  const isTodayPast = selectedDate !== null &&
    (currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth < today.getMonth()) ||
    (currentYear === today.getFullYear() && currentMonth === today.getMonth() && selectedDate < today.getDate()))

  const availableTodayPastSlot = (slot: string) => {
    if (!isTodayPast) return false
    const hour = parseInt(slot.split(':')[0])
    const now = new Date()
    return hour <= now.getHours()
  }

  async function handleConfirm() {
    if (!court || !selectedDate || selectedSlots.length === 0) return
    setSubmitting(true)
    setSubmitError(null)

    const sorted = [...selectedSlots].sort()
    const firstHour = parseInt(sorted[0].split(':')[0])
    const lastHour = parseInt(sorted[sorted.length - 1].split(':')[0])
    const dateStr = toDateStr(currentYear, currentMonth, selectedDate)

    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          court_id: id,
          start_time: `${dateStr}T${String(firstHour).padStart(2, "0")}:00:00`,
          end_time: `${dateStr}T${String(lastHour + 1).padStart(2, "0")}:00:00`,
          note: remark || undefined,
        }),
      })
      router.push('/my-bookings')
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pageError || !court) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="font-medium text-destructive">{pageError || "เกิดข้อผิดพลาด"}</p>
        <Button asChild variant="outline">
          <Link href="/courts">กลับไปหน้าก่อนหน้า</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/courts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">{court.name}</h1>
            {court.description && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {court.description}
              </div>
            )}
          </div>
          <Badge variant="secondary" className="ml-auto">
            ฿{court.hourly_rate}/ชม.
          </Badge>
        </div>
      </header>

      <div className="container mx-auto max-w-lg space-y-6 px-4 py-6">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prevMonth}>&lt;</Button>
              <h2 className="font-semibold">
                {THAI_MONTHS[currentMonth]} {currentYear}
              </h2>
              <Button variant="ghost" size="sm" onClick={nextMonth}>&gt;</Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {THAI_DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {days.map((day, i) =>
                day === null ? (
                  <div key={`empty-${i}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (selectedDate === day) return
                      setSelectedDate(day)
                    }}
                    className={`rounded-full py-1.5 text-sm transition-colors ${
                      selectedDate === day
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted"
                    }`}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Clock className="h-4 w-4 text-primary" />
            เลือกเวลา
          </h3>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => {
              const booked = isBooked(slot)
              const selected = isSelected(slot)
              const past = isTodayPast && availableTodayPastSlot(slot)

              return (
                <Button
                  key={slot}
                  variant={selected ? "default" : booked || past ? "secondary" : "outline"}
                  size="sm"
                  disabled={booked || past || submitting}
                  onClick={() => toggleSlot(slot)}
                  className={`min-w-[72px] ${
                    selected
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : booked || past
                      ? "bg-muted text-muted-foreground line-through opacity-60"
                      : "border-green-200 text-green-700 hover:bg-green-50"
                  }`}
                >
                  {slot}
                </Button>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded border border-green-200 bg-green-50" /> ว่าง
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-muted" /> จองแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-orange-500" /> เลือก
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="remark">หมายเหตุ (เพิ่มเติม)</label>
          <textarea
            id="remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="เช่น ต้องการสนามใกล้ประตูทางเข้า..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedDate} {THAI_MONTHS[currentMonth]} {currentYear}
                </p>
                <p className="text-sm font-medium">
                  {selectedSlots.length > 0
                    ? `${selectedSlots.length} ชั่วโมง`
                    : "ยังไม่ได้เลือกเวลา"}
                </p>
              </div>
              <p className="text-xl font-bold text-primary">
                ฿{selectedSlots.length * court.hourly_rate}
              </p>
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={selectedSlots.length === 0 || submitting}
          onClick={handleConfirm}
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          ยืนยันการจอง
        </Button>
      </div>
    </div>
  )
}
