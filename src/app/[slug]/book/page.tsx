'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin,
  Clock,
  Loader2,
  ChevronLeft,
  Check,
  Minus,
  Plus,
  Wallet,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

interface Court {
  id: string
  name: string
  hourly_rate: number
}

interface VenueData {
  name: string
  location: string
  courts: Court[]
}

interface Slot {
  courtId: string
  time: string
  available: boolean
}

function parseTime(time: string): number {
  return parseInt(time.split(':')[0])
}

export default function VenueBookingPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [duration, setDuration] = useState(1)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  useEffect(() => {
    setSelectedDate(dates[0])
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      setVenue({
        name: params.slug === '101-badminton' ? '101 Badminton' : `สนาม${params.slug}`,
        location: 'กรุงเทพฯ',
        courts: [
          { id: '1', name: 'คอร์ท A', hourly_rate: 100 },
          { id: '2', name: 'คอร์ท B', hourly_rate: 100 },
          { id: '3', name: 'คอร์ท C', hourly_rate: 120 },
        ],
      })
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [params.slug])

  useEffect(() => {
    if (!selectedDate) return
    const booked = new Set<string>()
    const demo: { courtId: string; time: string }[] = [
      { courtId: '1', time: '10:00' },
      { courtId: '1', time: '11:00' },
      { courtId: '2', time: '14:00' },
      { courtId: '3', time: '09:00' },
      { courtId: '3', time: '18:00' },
    ]
    demo.forEach((s) => booked.add(`${s.courtId}-${s.time}`))
    setBookedSlots(booked)
  }, [selectedDate])

  useEffect(() => {
    if (!balanceLoading) return
    fetch('/api/wallet')
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.balance ?? 0)
        setBalanceLoading(false)
      })
      .catch(() => {
        setBalance(500)
        setBalanceLoading(false)
      })
  }, [])

  const selectedCourtRate = venue?.courts.find((c) => c.id === selectedCourt)?.hourly_rate ?? 0
  const totalCost = duration * selectedCourtRate
  const insufficient = balance !== null && totalCost > balance

  const resetSelection = useCallback(() => {
    setSelectedCourt(null)
    setStartTime(null)
    setEndTime(null)
    setDuration(1)
  }, [])

  function isSlotBooked(courtId: string, time: string) {
    return bookedSlots.has(`${courtId}-${time}`)
  }

  function isSlotPast(time: string) {
    if (!isToday(selectedDate)) return false
    const now = new Date()
    const currentHour = now.getHours()
    return parseTime(time) <= currentHour
  }

  function getSlotStatus(courtId: string, time: string) {
    if (isSlotBooked(courtId, time)) return 'booked'
    if (isSlotPast(time)) return 'booked'
    if (selectedCourt === courtId && startTime && endTime) {
      const t = parseTime(time)
      const s = parseTime(startTime)
      const e = parseTime(endTime)
      if (t >= s && t < e) return 'selected'
    }
    return 'available'
  }

  function handleCellClick(courtId: string, time: string) {
    const status = getSlotStatus(courtId, time)
    if (status === 'booked') return

    if (!selectedCourt || selectedCourt !== courtId) {
      setSelectedCourt(courtId)
      setStartTime(time)
      setEndTime(null)
      setDuration(1)
      return
    }

    if (!startTime) {
      setStartTime(time)
      setEndTime(null)
      setDuration(1)
      return
    }

    const clickedHour = parseTime(time)
    const startHour = parseTime(startTime)

    if (clickedHour < startHour) {
      setStartTime(time)
      setEndTime(null)
      setDuration(1)
      return
    }

    const newEnd = `${String(clickedHour + 1).padStart(2, '0')}:00`
    setEndTime(newEnd)
    setDuration(clickedHour - startHour + 1)
  }

  function adjustDuration(delta: number) {
    const newDur = Math.max(1, Math.min(4, duration + delta))
    if (startTime) {
      const startHour = parseTime(startTime)
      const endHour = startHour + newDur
      if (endHour > 22) return
      setEndTime(`${String(endHour).padStart(2, '0')}:00`)
    }
    setDuration(newDur)
  }

  async function handleConfirm() {
    if (!selectedCourt || !selectedDate || !startTime || !endTime) return
    setConfirming(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court_id: selectedCourt,
          start_time: `${selectedDate}T${startTime}:00+07:00`,
          end_time: `${selectedDate}T${endTime}:00+07:00`,
          note,
          total_cost: totalCost,
        }),
      })
      if (res.ok) {
        router.push('/my-bookings')
      } else {
        const err = await res.text()
        alert('จองไม่สำเร็จ: ' + err)
      }
    } catch {
      alert('จองไม่สำเร็จ')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลสนาม...</p>
      </div>
    )
  }

  if (error || !venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p className="text-sm text-destructive">{error || 'ไม่พบข้อมูลสนาม'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          กลับ
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{venue.name}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{venue.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Date Selector */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">เลือกวันที่</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((date, i) => {
              const d = new Date(date)
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date)
                    resetSelection()
                  }}
                  className={`flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="text-xs">{dayNames[d.getDay()]}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Court × Time Grid */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            เลือกคอร์ทและเวลา
          </h2>

          {/* Price Info */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {venue.courts.map((court) => (
              <Badge
                key={court.id}
                variant="outline"
                className={`shrink-0 ${
                  selectedCourt === court.id ? 'border-primary text-primary' : ''
                }`}
              >
                {court.name}: {court.hourly_rate} ฿/ชม.
              </Badge>
            ))}
          </div>

          {/* Legend */}
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />
              ว่าง
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#d1d5db]" />
              ไม่ว่าง
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-[#f97316]" />
              เลือกแล้ว
            </span>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[500px] text-center text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 px-2 py-2 text-left text-xs font-medium text-muted-foreground">
                    คอร์ท
                  </th>
                  {TIME_SLOTS.map((time) => (
                    <th
                      key={time}
                      className="px-1 py-2 text-xs font-medium text-muted-foreground"
                    >
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {venue.courts.map((court) => (
                  <tr key={court.id} className="border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1 text-left text-sm font-medium">
                      {court.name}
                    </td>
                    {TIME_SLOTS.map((time) => {
                      const status = getSlotStatus(court.id, time)
                      return (
                        <td key={time} className="p-0.5">
                          <button
                            disabled={status === 'booked'}
                            onClick={() => handleCellClick(court.id, time)}
                            className={`h-7 w-full rounded-sm text-[10px] transition-colors ${
                              status === 'available'
                                ? 'bg-[#22c55e] text-white hover:brightness-110'
                                : status === 'selected'
                                  ? 'bg-[#f97316] text-white font-medium'
                                  : 'bg-[#d1d5db] cursor-not-allowed'
                            }`}
                          >
                            {status === 'available' ? '' : status === 'selected' ? '✓' : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Selected Info & Duration Control */}
        {selectedCourt && startTime && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="mb-3 space-y-1">
                <p className="text-sm font-medium">
                  {venue.courts.find((c) => c.id === selectedCourt)?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedDate}{' '}
                  {startTime}
                  {endTime ? ` - ${endTime}` : ''}
                  {' · '}
                  <span className="font-medium text-primary">
                    {duration} ชม. = {totalCost} ฿
                  </span>
                </p>
              </div>

              {endTime ? null : (
                <p className="mb-2 text-xs text-muted-foreground">
                  คลิกเวลาสิ้นสุด หรือใช้ปุ่ม +/- เพื่อเลือกจำนวนชั่วโมง
                </p>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => adjustDuration(-1)}
                    disabled={duration <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{duration}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => adjustDuration(1)}
                    disabled={duration >= 4 || (startTime !== null && parseTime(startTime) + duration >= 22)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">ชั่วโมง (สูงสุด 4 ชม.)</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation */}
        {selectedCourt && endTime && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">ยืนยันการจอง</h2>

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">คอร์ท</span>
                  <span className="font-medium">
                    {venue.courts.find((c) => c.id === selectedCourt)?.name}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">วันที่</span>
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">เวลา</span>
                  <span className="font-medium">
                    {startTime} - {endTime}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ระยะเวลา</span>
                  <span className="font-medium">{duration} ชั่วโมง</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ค่าใช้จ่าย</span>
                  <span className="text-lg font-bold text-primary">
                    {totalCost.toLocaleString()} ฿
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Balance Check */}
            <Card className={insufficient ? 'border-destructive/50' : 'border-muted'}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">ยอดเงินคงเหลือ</span>
                </div>
                {balanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span
                    className={`text-sm font-semibold ${
                      insufficient ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {balance?.toLocaleString()} ฿
                  </span>
                )}
              </CardContent>
            </Card>

            {insufficient && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  ยอดเงินคงเหลือไม่เพียงพอ กรุณาเติมเงินก่อนจอง
                </span>
              </div>
            )}

            {/* Note */}
            <div>
              <p className="mb-2 text-sm text-muted-foreground">หมายเหตุ (ไม่บังคับ)</p>
              <Textarea
                placeholder="เช่น ต้องการคอร์ทใกล้ประตูทางออก..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </section>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[padding-bottom]:pb-[env(safe-area-inset-bottom,12px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {selectedCourt && startTime ? (
              <div className="truncate text-sm">
                <span className="font-medium">
                  {venue.courts.find((c) => c.id === selectedCourt)?.name}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  {startTime}
                  {endTime ? `-${endTime}` : ''}
                </span>
                <span className="ml-2 font-semibold text-primary">
                  {totalCost} ฿
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">เลือกคอร์ทและเวลาเพื่อจอง</span>
            )}
          </div>
          {endTime ? (
            <Button
              className="shrink-0 gap-2"
              size="lg"
              onClick={insufficient ? () => router.push('/wallet') : handleConfirm}
              disabled={confirming}
              variant={insufficient ? 'outline' : 'default'}
            >
              {confirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : insufficient ? (
                'เติมเงิน'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  ยืนยันการจอง
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
