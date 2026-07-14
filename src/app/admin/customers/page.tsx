"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Phone, Mail, Calendar } from "lucide-react"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Customer {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  total_bookings?: number
  totalBookings?: number
  last_visit?: string
  lastVisit?: string
  status?: string
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Customer | null>(null)

  useEffect(() => {
    apiFetch('/api/members')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.members || [])
        setCustomers(list)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const customerName = (c: Customer) => c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "—"
  const customerPhone = (c: Customer) => c.phone || "—"
  const customerEmail = (c: Customer) => c.email || "—"
  const customerBookings = (c: Customer) => c.total_bookings ?? c.totalBookings ?? 0
  const customerLastVisit = (c: Customer) => c.last_visit ?? c.lastVisit ?? "—"
  const customerStatus = (c: Customer) => c.status || "active"

  const filtered = customers.filter(
    (c) =>
      customerName(c).toLowerCase().includes(search.toLowerCase()) ||
      customerPhone(c).includes(search) ||
      customerEmail(c).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ลูกค้าทั้งหมด ({filtered.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>การจองทั้งหมด</TableHead>
                  <TableHead>ล่าสุด</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customerName(customer)}</TableCell>
                    <TableCell>{customerPhone(customer)}</TableCell>
                    <TableCell>{customerEmail(customer)}</TableCell>
                    <TableCell>{customerBookings(customer)}</TableCell>
                    <TableCell>{customerLastVisit(customer)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={customerStatus(customer) === "active" ? "default" : "secondary"}
                      >
                        {customerStatus(customer) === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelected(customer)}
                          >
                            ดูรายละเอียด
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{selected ? customerName(selected) : ""}</DialogTitle>
                          </DialogHeader>
                          {selected && (
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {customerPhone(selected)}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {customerEmail(selected)}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                จองทั้งหมด {customerBookings(selected)} ครั้ง
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                ล่าสุด {customerLastVisit(selected)}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                      ไม่พบลูกค้า
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
