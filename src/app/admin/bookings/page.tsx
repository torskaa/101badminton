"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Booking {
  id: number
  customer_name?: string
  customer?: string
  court_name?: string
  court?: string
  date?: string
  start_time?: string
  end_time?: string
  time?: string
  status: string
  amount?: number
  email?: string
  phone?: string
}

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("this-week")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== "all") params.set("status", statusFilter)
        const data = await apiFetch(`/api/bookings?${params.toString()}`)
        setBookings(Array.isArray(data) ? data : (data.bookings || []))
      } catch (e) {
        console.error('Failed to load bookings', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const time = booking.time || (booking.start_time && booking.end_time ? `${booking.start_time} - ${booking.end_time}` : "—")
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.customer_name || booking.customer || "—"}</TableCell>
                      <TableCell>{booking.court_name || booking.court || "—"}</TableCell>
                      <TableCell>{booking.date || "—"}</TableCell>
                      <TableCell>{time}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[booking.status] || "secondary"}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.amount != null ? `฿${booking.amount.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Booking Details</DialogTitle>
                              <DialogDescription>
                                Full details for this booking.
                              </DialogDescription>
                            </DialogHeader>
                            {selectedBooking && (
                              <div className="grid gap-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Customer</span>
                                  <span className="font-medium">{selectedBooking.customer_name || selectedBooking.customer || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Court</span>
                                  <span className="font-medium">{selectedBooking.court_name || selectedBooking.court || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date</span>
                                  <span className="font-medium">{selectedBooking.date || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Time</span>
                                  <span className="font-medium">{selectedBooking.time || (selectedBooking.start_time && selectedBooking.end_time ? `${selectedBooking.start_time} - ${selectedBooking.end_time}` : "—")}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status</span>
                                  <Badge variant={statusVariant[selectedBooking.status] || "secondary"}>
                                    {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Amount</span>
                                  <span className="font-medium">{selectedBooking.amount != null ? `฿${selectedBooking.amount.toLocaleString()}` : "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Email</span>
                                  <span className="font-medium">{selectedBooking.email || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Phone</span>
                                  <span className="font-medium">{selectedBooking.phone || "—"}</span>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {bookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
