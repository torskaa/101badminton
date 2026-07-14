"use client"

import { useState, useEffect } from "react"
import {
  Grid3x3,
  CalendarCheck,
  Banknote,
  Users,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface DashboardReport {
  totalRevenue?: number
  courtRevenue?: number
  minibarRevenue?: number
  totalBookings?: number
  totalHours?: number
  totalCourts?: number
  todayBookings?: number
  activePlayers?: number
}

interface Booking {
  id: number
  customer_name?: string
  court_name?: string
  date?: string
  start_time?: string
  end_time?: string
  status: string
  amount?: number
  customer?: string
  court?: string
  time?: string
}

const statusVariant: Record<string, "default" | "destructive" | "secondary"> = {
  confirmed: "default",
  cancelled: "destructive",
  completed: "secondary",
}

export default function AdminDashboardPage() {
  const [report, setReport] = useState<DashboardReport | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [reportData, bookingsData] = await Promise.all([
          apiFetch('/api/reports?range=daily').catch(() => null),
          apiFetch('/api/bookings').catch(() => null),
        ])
        if (reportData) setReport(reportData)
        if (bookingsData) {
          setBookings(Array.isArray(bookingsData) ? bookingsData : (bookingsData.bookings || []))
        }
      } catch (e) {
        console.error('Failed to load dashboard data', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpiData = report
    ? [
        { label: "Total Courts", value: String(report.totalCourts ?? "—"), icon: Grid3x3, color: "text-emerald-600" },
        { label: "Today Bookings", value: String(report.todayBookings ?? "—"), icon: CalendarCheck, color: "text-blue-600" },
        { label: "Revenue (THB)", value: report.totalRevenue != null ? `฿${report.totalRevenue.toLocaleString()}` : "—", icon: Banknote, color: "text-amber-600" },
        { label: "Active Players", value: String(report.activePlayers ?? "—"), icon: Users, color: "text-violet-600" },
      ]
    : [
        { label: "Total Courts", value: "—", icon: Grid3x3, color: "text-emerald-600" },
        { label: "Today Bookings", value: "—", icon: CalendarCheck, color: "text-blue-600" },
        { label: "Revenue (THB)", value: "—", icon: Banknote, color: "text-amber-600" },
        { label: "Active Players", value: "—", icon: Users, color: "text-violet-600" },
      ]

  const displayBookings = bookings.slice(0, 7)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-sm text-muted-foreground text-center">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Court</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayBookings.map((booking, i) => {
                  const time = booking.time || (booking.start_time && booking.end_time ? `${booking.start_time} - ${booking.end_time}` : "—")
                  return (
                    <TableRow key={booking.id ?? i}>
                      <TableCell className="font-medium">{booking.court_name || booking.court || "—"}</TableCell>
                      <TableCell>{booking.customer_name || booking.customer || "—"}</TableCell>
                      <TableCell>{time}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[booking.status]}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.amount != null ? `฿${booking.amount.toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {displayBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      No bookings yet.
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
