"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Wand2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function CreateCouponPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [discountType, setDiscountType] = useState("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [minSpend, setMinSpend] = useState("")
  const [pointsCost, setPointsCost] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [startDate, setStartDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCode(result)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      await apiFetch('/api/crm/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.toUpperCase(),
          description,
          discount_type: discountType,
          discount_value: Number(discountValue) || 0,
          min_spend: Number(minSpend) || 0,
          points_cost: Number(pointsCost) || 0,
          max_uses: Number(maxUses) || 100,
          start_date: startDate || undefined,
          expiry: expiryDate || undefined,
          is_active: active,
        }),
      })
      setSaved(true)
      setTimeout(() => router.push("/admin/crm"), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create coupon')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/crm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Coupon</h1>
          <p className="text-sm text-muted-foreground mt-1">สร้างคูปองส่วนลดใหม่</p>
        </div>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Coupon created successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Coupon Details</CardTitle>
          <CardDescription>กรอกข้อมูลคูปองส่วนลด</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="code">Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="e.g. SUMMER50"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button variant="outline" type="button" onClick={generateCode}>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="รายละเอียดคูปอง (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="discountType">Discount Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger id="discountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (THB)</SelectItem>
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
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {discountType === "percentage" ? "%" : "THB"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="minSpend">Min Spend (THB)</Label>
              <Input
                id="minSpend"
                type="number"
                placeholder="0"
                value={minSpend}
                onChange={(e) => setMinSpend(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pointsCost">Points Cost</Label>
              <Input
                id="pointsCost"
                type="number"
                placeholder="0"
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">จำนวนแต้มที่สมาชิกต้องใช้เพื่อแลก</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="maxUses">Max Uses</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="100"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
            <Badge variant={active ? "default" : "secondary"} className="ml-auto">
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Coupon"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/crm">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
