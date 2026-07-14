"use client"

import { useState, useEffect } from "react"
import {
  DollarSign,
  Banknote,
  Martini,
  CalendarCheck,
  Clock,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

type Tab = "daily" | "monthly" | "yearly"

interface ReportData {
  totalRevenue?: number
  courtRevenue?: number
  minibarRevenue?: number
  totalBookings?: number
  totalHours?: number
  revenueData?: { date?: string; court?: number; minibar?: number; total?: number }[]
  topCourts?: { name?: string; bookings?: number; hours?: number }[]
  topMembers?: { name?: string; hours?: number; spent?: number }[]
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("daily")
  const currentYear = new Date().getFullYear()
  const [month, setMonth] = useState("7")
  const [year, setYear] = useState(String(currentYear))
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await apiFetch(`/api/reports?range=${tab}&month=${month}&year=${year}`)
        setReport(data)
      } catch (e) {
        console.error('Failed to load reports', e)
        setReport(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab, month, year])

  const kpis = report
    ? [
        { label: "Total Revenue", value: report.totalRevenue != null ? `฿${report.totalRevenue.toLocaleString()}` : "—", icon: DollarSign, color: "text-emerald-600" },
        { label: "Court Revenue", value: report.courtRevenue != null ? `฿${report.courtRevenue.toLocaleString()}` : "—", icon: Banknote, color: "text-blue-600" },
        { label: "Mini Bar Revenue", value: report.minibarRevenue != null ? `฿${report.minibarRevenue.toLocaleString()}` : "—", icon: Martini, color: "text-amber-600" },
        { label: "Total Bookings", value: report.totalBookings != null ? String(report.totalBookings) : "—", icon: CalendarCheck, color: "text-violet-600" },
        { label: "Total Hours", value: report.totalHours != null ? `${report.totalHours}h` : "—", icon: Clock, color: "text-rose-600" },
      ]
    : [
        { label: "Total Revenue", value: "—", icon: DollarSign, color: "text-emerald-600" },
        { label: "Court Revenue", value: "—", icon: Banknote, color: "text-blue-600" },
        { label: "Mini Bar Revenue", value: "—", icon: Martini, color: "text-amber-600" },
        { label: "Total Bookings", value: "—", icon: CalendarCheck, color: "text-violet-600" },
        { label: "Total Hours", value: "—", icon: Clock, color: "text-rose-600" },
      ]

  const revenueRows = report?.revenueData || []
  const topCourts = report?.topCourts || []
  const topMembers = report?.topMembers || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {new Date(0, i).toLocaleString("en", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map((kpi) => {
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Chart Area</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50">
                  <div className="text-center">
                    <CalendarCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Chart Area</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Court Revenue</TableHead>
                    <TableHead>Mini Bar Revenue</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.date || "—"}</TableCell>
                      <TableCell>฿{(row.court ?? 0).toLocaleString()}</TableCell>
                      <TableCell>฿{(row.minibar ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">฿{(row.total ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {revenueRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        No revenue data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Courts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Court</TableHead>
                      <TableHead>Bookings</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCourts.map((court, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{court.name || "—"}</TableCell>
                        <TableCell>{court.bookings ?? 0}</TableCell>
                        <TableCell>{court.hours ?? 0}h</TableCell>
                      </TableRow>
                    ))}
                    {topCourts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No data.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Top Members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topMembers.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{m.name || "—"}</TableCell>
                        <TableCell>{m.hours ?? 0}h</TableCell>
                        <TableCell>฿{(m.spent ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {topMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No data.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
