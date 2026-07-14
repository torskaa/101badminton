"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Tag,
  Award,
  CheckCircle,
  Gift,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Coupon {
  code: string
  discount: string
  discount_type?: string
  discount_value?: number
  min_spend?: number
  minSpend?: number
  used?: number
  max_uses?: number
  max?: number
  points_cost?: number
  pointsCost?: number
  status: string
  expiry: string
}

interface PointsEntry {
  member: string
  member_name?: string
  points: number
  reason: string
  ref?: string
  reference?: string
  date: string
}

export default function CrmDashboardPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [pointsHistory, setPointsHistory] = useState<PointsEntry[]>([])
  const [memberCount, setMemberCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newCode, setNewCode] = useState("")
  const [newDiscountType, setNewDiscountType] = useState("percentage")
  const [newDiscountValue, setNewDiscountValue] = useState("")
  const [newMinSpend, setNewMinSpend] = useState("")
  const [newPointsCost, setNewPointsCost] = useState("")
  const [newMaxUses, setNewMaxUses] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newExpiry, setNewExpiry] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [couponsData, pointsData, membersData] = await Promise.all([
          apiFetch('/api/crm/coupons').catch(() => []),
          apiFetch('/api/crm/points').catch(() => ({ points: [] })),
          apiFetch('/api/members').catch(() => []),
        ])
        setCoupons(Array.isArray(couponsData) ? couponsData : (couponsData.coupons || []))
        setPointsHistory(Array.isArray(pointsData) ? pointsData : (pointsData.points || []))
        const m = Array.isArray(membersData) ? membersData : (membersData.members || [])
        setMemberCount(m.length)
      } catch (e) {
        console.error('Failed to load CRM data', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpiData = [
    { label: "Total Members", value: String(memberCount), icon: Users, color: "text-blue-600" },
    { label: "Active Coupons", value: String(coupons.filter((c) => c.status === "Active" || c.status === "active").length), icon: Tag, color: "text-emerald-600" },
    { label: "Points Issued Today", value: "—", icon: Award, color: "text-amber-600" },
    { label: "Coupons Redeemed Today", value: String(pointsHistory.filter((p) => p.points < 0).length), icon: CheckCircle, color: "text-violet-600" },
  ]

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(result)
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        code: newCode.toUpperCase(),
        discount_type: newDiscountType,
        discount_value: Number(newDiscountValue) || 0,
        min_spend: Number(newMinSpend) || 0,
        points_cost: Number(newPointsCost) || 0,
        max_uses: Number(newMaxUses) || 100,
        start_date: newStartDate || undefined,
        expiry: newExpiry || undefined,
        active: true,
      }
      const created = await apiFetch('/api/crm/coupons', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setCoupons((prev) => [created, ...prev])
      setDialogOpen(false)
      setNewCode("")
      setNewDiscountValue("")
      setNewMinSpend("")
      setNewPointsCost("")
      setNewMaxUses("")
      setNewStartDate("")
      setNewExpiry("")
    } catch (e) {
      console.error('Failed to create coupon', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(index: number, code: string) {
    try {
      await apiFetch(`/api/crm/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' })
      setCoupons((prev) => prev.filter((_, i) => i !== index))
    } catch (e) {
      console.error('Failed to delete coupon', e)
    }
  }

  const historyRows = pointsHistory.slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM &amp; Loyalty</h1>
        <p className="text-sm text-muted-foreground mt-1">จัดการแต้มสมาชิกและคูปอง</p>
      </div>

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Coupon Management</CardTitle>
            <CardDescription>สร้างและจัดการคูปองส่วนลด</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Coupon</DialogTitle>
                <DialogDescription>ตั้งค่าคูปองส่วนลดสำหรับสมาชิก</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g. SUMMER50"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="outline" type="button" onClick={generateCode}>
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={newDiscountType} onValueChange={setNewDiscountType}>
                    <SelectTrigger id="discountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="discountValue">Discount Value</Label>
                  <div className="relative">
                    <Input
                      id="discountValue"
                      type="number"
                      placeholder="0"
                      value={newDiscountValue}
                      onChange={(e) => setNewDiscountValue(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {newDiscountType === "percentage" ? "%" : "THB"}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minSpend">Min Spend (THB)</Label>
                  <Input
                    id="minSpend"
                    type="number"
                    placeholder="0"
                    value={newMinSpend}
                    onChange={(e) => setNewMinSpend(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pointsCost">Points Cost</Label>
                  <Input
                    id="pointsCost"
                    type="number"
                    placeholder="0"
                    value={newPointsCost}
                    onChange={(e) => setNewPointsCost(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">จำนวนแต้มที่สมาชิกต้องใช้เพื่อแลก</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxUses">Max Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    placeholder="100"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={newExpiry}
                      onChange={(e) => setNewExpiry(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Spend</TableHead>
                  <TableHead>Used / Max</TableHead>
                  <TableHead>Points Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c, i) => (
                  <TableRow key={c.code}>
                    <TableCell className="font-mono font-medium text-sm">{c.code}</TableCell>
                    <TableCell>{c.discount}</TableCell>
                    <TableCell>฿{(c.min_spend ?? c.minSpend ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{c.used ?? 0} / {c.max_uses ?? c.max ?? 0}</TableCell>
                    <TableCell>{(c.points_cost ?? c.pointsCost ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "Active" || c.status === "active" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.expiry}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(i, c.code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {coupons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No coupons yet. Click &quot;Create Coupon&quot; to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>ประวัติการใช้คูปองล่าสุด</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.member_name || r.member || "—"}</TableCell>
                  <TableCell>
                    <span className={r.points > 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                      {r.points > 0 ? `+${r.points}` : r.points}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{r.reason || "—"}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{r.ref || r.reference || "—"}</TableCell>
                  <TableCell className="text-sm">{r.date}</TableCell>
                </TableRow>
              ))}
              {historyRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No redemption history.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
