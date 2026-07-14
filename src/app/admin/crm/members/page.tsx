"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Eye,
  Pencil,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Member {
  id: string | number
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  points?: number
  tier?: string
  lifetime_spend?: number
  lifetimeSpend?: number
  total_spent?: number
  totalSpent?: number
}

interface PointsEntry {
  id?: string | number
  member_name?: string
  member?: string
  points: number
  reason: string
  ref?: string
  reference?: string
  date: string
}

interface PackageInfo {
  id?: string | number
  name?: string
  tier_name?: string
  min_points?: number
  minPoints?: number
  discount_rate?: number
  discountRate?: number
  member_count?: number
  memberCount?: number
}

const tierColors: Record<string, string> = {
  Bronze: "text-amber-800 bg-amber-100 border-amber-300",
  Silver: "text-slate-700 bg-slate-100 border-slate-300",
  Gold: "text-yellow-800 bg-yellow-100 border-yellow-400",
  Platinum: "text-sky-800 bg-sky-100 border-sky-300",
}

export default function CRMMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [pointsHistory, setPointsHistory] = useState<PointsEntry[]>([])
  const [tiers, setTiers] = useState<PackageInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [editTier, setEditTier] = useState<{ index: number; name: string; minPoints: string; discountRate: string } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [membersData, pointsData, packagesData] = await Promise.all([
          apiFetch('/api/members').catch(() => []),
          apiFetch('/api/crm/points').catch(() => ({ points: [] })),
          apiFetch('/api/members/packages').catch(() => []),
        ])
        setMembers(Array.isArray(membersData) ? membersData : (membersData.members || []))
        setPointsHistory(Array.isArray(pointsData) ? pointsData : (pointsData.points || []))
        setTiers(Array.isArray(packagesData) ? packagesData : (packagesData.tiers || []))
      } catch (e) {
        console.error('Failed to load CRM members data', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const memberNameOf = (m: Member) => m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—"
  const phoneOf = (m: Member) => m.phone || "—"
  const pointsOf = (m: Member) => m.points ?? 0
  const tierOf = (m: Member) => m.tier || "Bronze"
  const spentOf = (m: Member) => m.lifetime_spend ?? m.lifetimeSpend ?? m.total_spent ?? m.totalSpent ?? 0

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase()
    const name = memberNameOf(m).toLowerCase()
    const phone = phoneOf(m)
    const matchesSearch = name.includes(q) || phone.includes(q)
    const matchesTier = tierFilter === "all" || tierOf(m).toLowerCase() === tierFilter.toLowerCase()
    return matchesSearch && matchesTier
  })

  function openEditDialog(index: number) {
    const t = tiers[index]
    if (!t) return
    setEditTier({
      index,
      name: t.name || t.tier_name || "",
      minPoints: String(t.min_points ?? t.minPoints ?? 0),
      discountRate: String(t.discount_rate ?? t.discountRate ?? 0),
    })
    setEditDialogOpen(true)
  }

  function saveTierEdit() {
    if (!editTier) return
    const updated = [...tiers]
    updated[editTier.index] = {
      ...updated[editTier.index],
      name: editTier.name,
      min_points: Number(editTier.minPoints),
      minPoints: Number(editTier.minPoints),
      discount_rate: Number(editTier.discountRate),
      discountRate: Number(editTier.discountRate),
    }
    setTiers(updated)
    setEditDialogOpen(false)
    setEditTier(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Member Points &amp; Tiers</h1>
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Member Points &amp; Tiers</h1>
        <p className="text-sm text-muted-foreground mt-1">จัดการแต้มสมาชิกและระดับสมาชิก</p>
      </div>

      <Tabs defaultValue="all-members">
        <TabsList>
          <TabsTrigger value="all-members">All Members</TabsTrigger>
          <TabsTrigger value="points-history">Points History</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="all-members" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Lifetime Spend</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{memberNameOf(m)}</TableCell>
                      <TableCell className="text-sm">{phoneOf(m)}</TableCell>
                      <TableCell className="font-semibold">{pointsOf(m).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={tierColors[tierOf(m)] || ""}
                        >
                          {tierOf(m)}
                        </Badge>
                      </TableCell>
                      <TableCell>฿{spentOf(m).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Eye className="h-4 w-4" />
                          View Points
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points-history" className="mt-4">
          <Card>
            <CardContent className="p-0">
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
                  {pointsHistory.map((h, i) => (
                    <TableRow key={h.id ?? i}>
                      <TableCell className="font-medium">{h.member_name || h.member || "—"}</TableCell>
                      <TableCell>
                        <span className={h.points > 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                          {h.points > 0 ? `+${h.points}` : h.points}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{h.reason || "—"}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{h.ref || h.reference || "—"}</TableCell>
                      <TableCell className="text-sm">{h.date || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {pointsHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No points history.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiers.map((tier, i) => {
              const name = tier.name || tier.tier_name || "Tier"
              const minPts = tier.min_points ?? tier.minPoints ?? 0
              const discount = tier.discount_rate ?? tier.discountRate ?? 0
              const count = tier.member_count ?? tier.memberCount ?? 0
              const tierColor = name === "Bronze" ? "bg-amber-800" : name === "Silver" ? "bg-slate-400" : name === "Gold" ? "bg-yellow-500" : name === "Platinum" ? "bg-sky-500" : "bg-gray-400"
              return (
                <Card key={tier.id ?? i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${tierColor}`} />
                        <CardTitle className="text-lg">{name}</CardTitle>
                      </div>
                      <Badge>{count} members</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Min Points</span>
                      <span className="font-semibold">{minPts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount Rate</span>
                      <span className="font-semibold text-emerald-600">{discount}%</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => openEditDialog(i)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Tier</DialogTitle>
            <DialogDescription>แก้ไขระดับสมาชิกและสิทธิพิเศษ</DialogDescription>
          </DialogHeader>
          {editTier && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tierName">Tier Name</Label>
                <Input
                  id="tierName"
                  value={editTier.name}
                  onChange={(e) => setEditTier({ ...editTier, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minPoints">Min Points</Label>
                <Input
                  id="minPoints"
                  type="number"
                  value={editTier.minPoints}
                  onChange={(e) => setEditTier({ ...editTier, minPoints: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discountRate">Discount Rate (%)</Label>
                <Input
                  id="discountRate"
                  type="number"
                  value={editTier.discountRate}
                  onChange={(e) => setEditTier({ ...editTier, discountRate: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTierEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
