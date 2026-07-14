'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin, Clock, Loader2, ChevronLeft, Check, Plus, X, Wallet, AlertTriangle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface CartItem {
  courtId: string
  courtName: string
  startTime: string
  endTime: string
  hours: number
  cost: number
}

function parseTime(t: string) { return parseInt(t.split(':')[0]) }

export default function VenueBookingPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [cart, setCart] = useState<CartItem[]>([])
  const [confirming, setConfirming] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
  const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
  const isToday = (d: string) => d === new Date().toISOString().split('T')[0]

  useEffect(() => { setSelectedDate(dates[0]) }, [])
  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setVenue({
        name: params.slug === '101-badminton' ? '101 Badminton' : `สนาม${params.slug}`,
        location: 'กรุงเทพฯ',
        courts: [
          { id: '1', name: 'คอร์ท A', hourly_rate: 100 },
          { id: '2', name: 'คอร์ท B', hourly_rate: 100 },
          { id: '3', name: 'คอร์ท C', hourly_rate: 120 },
          { id: '4', name: 'คอร์ท D', hourly_rate: 120 },
        ],
      })
      setLoading(false)
    }, 500)
  }, [params.slug])

  useEffect(() => {
    if (!selectedDate) return
    const bs = new Set<string>()
    const demo = [
      { c: '1', t: '10:00' }, { c: '1', t: '11:00' },
      { c: '2', t: '14:00' }, { c: '3', t: '09:00' }, { c: '3', t: '18:00' },
      { c: '4', t: '12:00' }, { c: '4', t: '13:00' },
    ]
    demo.forEach(s => bs.add(`${s.c}-${s.t}`))
    setBookedSlots(bs)
    setCart([])
  }, [selectedDate])

  useEffect(() => {
    fetch('/api/wallet').then(r => r.json())
      .then(d => { setBalance(d.balance ?? 500); setBalanceLoading(false) })
      .catch(() => { setBalance(500); setBalanceLoading(false) })
  }, [])

  // Cart summary
  const totalCost = cart.reduce((sum, item) => sum + item.cost, 0)
  const totalHours = cart.reduce((sum, item) => sum + item.hours, 0)
  const insufficient = balance !== null && totalCost > balance

  function slotKey(courtId: string, time: string) { return `${courtId}-${time}` }

  function isBooked(courtId: string, time: string) {
    return bookedSlots.has(slotKey(courtId, time))
  }

  function isPast(time: string) {
    if (!isToday(selectedDate)) return false
    return parseTime(time) <= new Date().getHours()
  }

  function isInCart(courtId: string, time: string) {
    return cart.some(item =>
      item.courtId === courtId &&
      parseTime(time) >= parseTime(item.startTime) &&
      parseTime(time) < parseTime(item.endTime)
    )
  }

  /** Toggle: add/remove a single court + start time, default 1 hour */
  function handleCellClick(courtId: string, time: string) {
    if (isBooked(courtId, time) || isPast(time)) return

    const court = venue?.courts.find(c => c.id === courtId)
    if (!court) return

    // Check if already in cart → remove it
    const existing = cart.find(c =>
      c.courtId === courtId && c.startTime === time
    )
    if (existing) {
      setCart(prev => prev.filter(c => !(c.courtId === courtId && c.startTime === time)))
      return
    }

    const hour = parseTime(time)
    const endHour = Math.min(hour + 1, 22)
    const startTime = time
    const endTime = `${String(endHour).padStart(2, '0')}:00`

    // Check overlap with existing cart items for same court
    const overlaps = cart.some(c =>
      c.courtId === courtId &&
      parseTime(c.startTime) < endHour &&
      parseTime(c.endTime) > hour
    )
    if (overlaps) return

    setCart(prev => [...prev, {
      courtId,
      courtName: court.name,
      startTime,
      endTime,
      hours: 1,
      cost: court.hourly_rate,
    }])
  }

  /** Adjust hours for a cart item */
  function adjustHours(courtId: string, startTime: string, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.courtId !== courtId || item.startTime !== startTime) return item
      const newHours = Math.max(1, Math.min(4, item.hours + delta))
      const startHour = parseTime(item.startTime)
      if (startHour + newHours > 22) return item
      const courtRate = venue?.courts.find(c => c.id === courtId)?.hourly_rate ?? 100
      const endTime = `${String(startHour + newHours).padStart(2, '0')}:00`
      return { ...item, hours: newHours, endTime, cost: courtRate * newHours }
    }))
  }

  function removeCartItem(courtId: string, startTime: string) {
    setCart(prev => prev.filter(c => !(c.courtId === courtId && c.startTime === startTime)))
  }

  async function handleConfirm() {
    if (cart.length === 0) return
    setConfirming(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookings: cart.map(item => ({
            court_id: item.courtId,
            start_time: `${selectedDate}T${item.startTime}:00+07:00`,
            end_time: `${selectedDate}T${item.endTime}:00+07:00`,
          })),
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

  // ----- RENDER -----

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
        <Button variant="outline" onClick={() => router.back()}>กลับ</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{venue.name}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> <span>{venue.location}</span>
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
              const sel = date === selectedDate
              return (
                <button key={date}
                  onClick={() => { setSelectedDate(date); setCart([]) }}
                  className={`flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm transition-colors ${
                    sel ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="text-xs">{dayNames[d.getDay()]}</span>
                  <span className="text-lg font-bold">{d.getDate()}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Availability Grid */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            คลิกเลือกคอร์ทและเวลา (จองหลายคอร์ทพร้อมกันได้)
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {venue.courts.map(c => (
              <Badge key={c.id} variant="outline" className="shrink-0">
                {c.name}: {c.hourly_rate} ฿/ชม.
              </Badge>
            ))}
          </div>
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#22c55e]" />ว่าง</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#d1d5db]" />ไม่ว่าง</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-[#f97316]" />เลือกแล้ว</span>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[500px] text-center text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 px-2 py-2 text-left text-xs font-medium text-muted-foreground">คอร์ท</th>
                  {TIME_SLOTS.map(t => (
                    <th key={t} className="px-1 py-2 text-xs font-medium text-muted-foreground">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {venue.courts.map(court => (
                  <tr key={court.id} className="border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-background px-2 py-1 text-left text-sm font-medium">{court.name}</td>
                    {TIME_SLOTS.map(time => {
                      const booked = isBooked(court.id, time) || isPast(time)
                      const inCart = isInCart(court.id, time)
                      return (
                        <td key={time} className="p-0.5">
                          <button
                            disabled={booked}
                            onClick={() => handleCellClick(court.id, time)}
                            className={`h-7 w-full rounded-sm text-[10px] transition-colors ${
                              inCart
                                ? 'bg-[#f97316] text-white font-bold'
                                : booked
                                  ? 'bg-[#d1d5db] cursor-not-allowed'
                                  : 'bg-[#22c55e] text-white hover:brightness-110'
                            }`}
                          >
                            {inCart ? '✓' : ''}
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

        {/* Cart — Selected Items */}
        {cart.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              รายการที่เลือก ({cart.length} รายการ)
            </h2>
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <Card key={`${item.courtId}-${item.startTime}`} className="border-primary/20">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.courtName}</span>
                        <Badge variant="secondary" className="text-xs">{item.hours} ชม.</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.startTime} - {item.endTime}
                        <span className="ml-2 font-medium text-primary">{item.cost} ฿</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => adjustHours(item.courtId, item.startTime, -1)}
                        disabled={item.hours <= 1}
                        className="flex h-6 w-6 items-center justify-center rounded-md border text-xs hover:bg-muted disabled:opacity-30"
                      >−</button>
                      <button
                        onClick={() => adjustHours(item.courtId, item.startTime, 1)}
                        disabled={item.hours >= 4 || parseTime(item.startTime) + item.hours >= 22}
                        className="flex h-6 w-6 items-center justify-center rounded-md border text-xs hover:bg-muted disabled:opacity-30"
                      >+</button>
                      <button
                        onClick={() => removeCartItem(item.courtId, item.startTime)}
                        className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <Card className="mt-3 border-primary">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">รวมทั้งหมด</span>
                  <span className="font-bold text-primary">{totalHours} ชม. · {totalCost.toLocaleString()} ฿</span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Balance */}
        <Card className={insufficient ? 'border-destructive/50' : 'border-muted'}>
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ยอดเงินคงเหลือ</span>
            </div>
            {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <span className={`text-sm font-semibold ${insufficient ? 'text-destructive' : 'text-primary'}`}>
                {balance?.toLocaleString()} ฿
              </span>
            )}
          </CardContent>
        </Card>

        {insufficient && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>ยอดเงินคงเหลือไม่เพียงพอ กรุณาเติมเงินก่อนจอง</span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[padding-bottom]:pb-[env(safe-area-inset-bottom,12px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {cart.length > 0 ? (
              <div className="text-sm">
                <span className="font-medium">{cart.length} คอร์ท</span>
                <span className="text-muted-foreground"> · {totalHours} ชม.</span>
                <span className="ml-2 font-semibold text-primary">{totalCost.toLocaleString()} ฿</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">คลิกเลือกคอร์ทและเวลาในตาราง</span>
            )}
          </div>
          {cart.length > 0 && (
            <Button
              className="shrink-0 gap-2"
              size="lg"
              onClick={insufficient ? () => router.push('/wallet') : handleConfirm}
              disabled={confirming}
              variant={insufficient ? 'outline' : 'default'}
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : insufficient ? 'เติมเงิน' : <><Check className="h-4 w-4" />ยืนยัน {cart.length} รายการ</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
