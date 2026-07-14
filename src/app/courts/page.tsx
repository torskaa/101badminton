"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MapPin, Search, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface Court {
  id: string
  name: string
  description: string | null
  hourly_rate: number
  is_active: boolean
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function CourtsPage() {
  const [search, setSearch] = useState("")
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/courts')
      .then((data) => setCourts(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = courts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">ค้นหาสนาม</h1>
        </div>
      </header>

      <div className="container mx-auto space-y-4 px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสนามแบดมินตัน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[140px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="จังหวัด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bkk">กรุงเทพฯ</SelectItem>
                <SelectItem value="nont">นนทบุรี</SelectItem>
                <SelectItem value="cm">เชียงใหม่</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="วันที่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="tomorrow">พรุ่งนี้</SelectItem>
                <SelectItem value="this-week">สัปดาห์นี้</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="ช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">เช้า (08:00-12:00)</SelectItem>
                <SelectItem value="afternoon">บ่าย (12:00-18:00)</SelectItem>
                <SelectItem value="evening">เย็น (18:00-22:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
            <p className="text-destructive font-medium">ไม่สามารถโหลดข้อมูลได้</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">ไม่พบสนามที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((court) => (
              <Card key={court.id} className="overflow-hidden">
                <div className="flex h-40 items-center justify-center bg-gradient-to-br from-green-400 to-green-600">
                  <svg
                    className="h-12 w-12 text-white/60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12" />
                  </svg>
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-1 text-lg font-semibold">{court.name}</h3>
                  {court.description && (
                    <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {court.description}
                    </div>
                  )}
                  {!court.is_active && (
                    <span className="inline-block rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      ปิดให้บริการ
                    </span>
                  )}
                  <p className="mt-2 text-lg font-bold text-primary">
                    ฿{court.hourly_rate}
                    <span className="text-sm font-normal text-muted-foreground"> / ชม.</span>
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full" asChild disabled={!court.is_active}>
                    <Link href={`/courts/${court.id}/book`}>จองเลย</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
