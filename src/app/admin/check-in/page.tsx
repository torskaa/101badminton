"use client"

import { useState, useEffect } from "react"
import {
  LogIn,
  LogOut,
  Clock,
  Sun,
  Moon,
  User,
  Phone,
  MapPin,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface ActiveSession {
  id: string | number
  court_name?: string
  court?: string
  customer_name?: string
  customer?: string
  check_in_time?: string
  checkInTime?: string
  elapsed?: string
  light_on?: boolean
  lightOn?: boolean
  phone?: string
}

interface Court {
  id: number
  name: string
}

export default function CheckInPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [courtOptions, setCourtOptions] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [checkOutId, setCheckOutId] = useState<string | number | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [sessionsData, courtsData] = await Promise.all([
          apiFetch('/api/check-in').catch(() => []),
          apiFetch('/api/courts').catch(() => []),
        ])
        setSessions(Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || []))
        setCourtOptions(Array.isArray(courtsData) ? courtsData : [])
      } catch (e) {
        console.error('Failed to load data', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCheckIn = async () => {
    if (!selectedCourt || !customerName) return
    setCheckingIn(true)
    try {
      const newSession = await apiFetch('/api/check-in', {
        method: 'POST',
        body: JSON.stringify({ court_id: selectedCourt, customer_name: customerName, phone }),
      })
      setSessions((prev) => [...prev, newSession])
      setSelectedCourt("")
      setCustomerName("")
      setPhone("")
    } catch (e) {
      console.error('Failed to check in', e)
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    if (checkOutId === null) return
    try {
      await apiFetch(`/api/check-in/${checkOutId}`, { method: 'PUT' })
      setSessions((prev) => prev.filter((s) => s.id !== checkOutId))
      setCheckOutId(null)
    } catch (e) {
      console.error('Failed to check out', e)
    }
  }

  const toggleLight = async (id: string | number, current: boolean | undefined) => {
    try {
      const updated = await apiFetch(`/api/check-in/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ light_on: !current }),
      })
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, light_on: !current, lightOn: !current } : s)))
    } catch (e) {
      console.error('Failed to toggle light', e)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Check-in / Check-out</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <LogIn className="h-5 w-5 text-primary" />
            Active Sessions
          </h2>

          {loading ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <LogOut className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No active sessions
                </p>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => {
              const isLightOn = session.light_on ?? session.lightOn ?? true
              return (
                <Card key={session.id} className={isLightOn ? "" : "opacity-70"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{session.court_name || session.court || "—"}</span>
                          <Badge variant={isLightOn ? "default" : "secondary"}>
                            {isLightOn ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <User className="mr-1 inline h-3 w-3" />
                          {session.customer_name || session.customer || "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <Phone className="mr-1 inline h-3 w-3" />
                          {session.phone || "—"}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>In: {session.check_in_time || session.checkInTime || "—"}</span>
                          <Badge variant="outline" className="text-xs">
                            {session.elapsed || "0h 0m"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleLight(session.id, isLightOn)}
                          title={isLightOn ? "Turn off light" : "Turn on light"}
                        >
                          {isLightOn ? (
                            <Sun className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Moon className="h-4 w-4 text-blue-500" />
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCheckOutId(session.id)}
                            >
                              <LogOut className="mr-1 h-4 w-4" />
                              Check Out
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Check-out</DialogTitle>
                              <DialogDescription>
                                Check out {session.customer_name || session.customer} from {session.court_name || session.court}?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-sm text-muted-foreground">
                              <p>Duration: {session.elapsed || "—"}</p>
                              <p>Session started at: {session.check_in_time || session.checkInTime || "—"}</p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setCheckOutId(null)}>
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleCheckOut}>
                                Confirm Check-out
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-primary" />
            New Check-in
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>New Session</CardTitle>
              <CardDescription>
                Start a new court session for a customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="court">Court</Label>
                <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                  <SelectTrigger id="court">
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {courtOptions.map((court) => (
                      <SelectItem key={court.id} value={String(court.id)}>
                        {court.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="customer">Customer Name</Label>
                <Input
                  id="customer"
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedCourt || !customerName || checkingIn}
                onClick={handleCheckIn}
              >
                <LogIn className="mr-2 h-5 w-5" />
                {checkingIn ? "Checking In..." : "Check In"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
