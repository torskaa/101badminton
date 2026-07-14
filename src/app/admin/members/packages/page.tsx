"use client"

import { useState, useEffect } from "react"
import { Gift, Clock, CheckCircle, XCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  DialogFooter,
} from "@/components/ui/dialog"
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

interface PackageTier {
  id: string | number
  name?: string
  hours?: number
  price?: number
  popularity?: string
}

interface AssignedPackage {
  id?: string | number
  member_name?: string
  member?: string
  package_name?: string
  pkg?: string
  hours_used?: number
  hoursUsed?: number
  hours_total?: number
  hoursTotal?: number
  expiry?: string
  status?: string
}

interface Member {
  id: string | number
  name?: string
  first_name?: string
  last_name?: string
}

export default function PackagesPage() {
  const [tiers, setTiers] = useState<PackageTier[]>([])
  const [assignedPackages, setAssignedPackages] = useState<AssignedPackage[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<PackageTier | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [tiersData, assignedData, membersData] = await Promise.all([
          apiFetch('/api/members/packages').catch(() => []),
          apiFetch('/api/members/packages?assigned=true').catch(() => []),
          apiFetch('/api/members').catch(() => []),
        ])
        setTiers(Array.isArray(tiersData) ? tiersData : (tiersData.tiers || []))
        setAssignedPackages(Array.isArray(assignedData) ? assignedData : (assignedData.assigned || []))
        setMembers(Array.isArray(membersData) ? membersData : (membersData.members || []))
      } catch (e) {
        console.error('Failed to load packages', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const memberNameOf = (m: Member) => m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Unnamed"

  const filteredMembers = members.filter((m) => m.name || m.first_name)

  async function handleAssign() {
    if (!selectedTier || !selectedMemberId) return
    setSaving(true)
    try {
      const created = await apiFetch('/api/members/packages', {
        method: 'POST',
        body: JSON.stringify({
          member_id: selectedMemberId,
          package_id: selectedTier.id,
        }),
      })
      setAssignedPackages((prev) => [...prev, created])
      setAssignOpen(false)
      setSelectedMemberId("")
    } catch (e) {
      console.error('Failed to assign package', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Hour Packages</h1>
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hour Packages</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => {
          const hours = tier.hours ?? 0
          const price = tier.price ?? 0
          const discount = price > 0 && hours > 0
            ? price / hours < 30 ? "Best Value" : price / hours < 45 ? "Most Popular" : ""
            : ""
          return (
            <Card key={tier.id} className="relative overflow-hidden">
              {tier.popularity && (
                <div className="absolute right-0 top-0">
                  <Badge className="rounded-none rounded-bl-lg rounded-tr-lg">
                    {tier.popularity}
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{hours} Hours</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-primary">฿{price.toLocaleString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discount && (
                  <Badge variant="secondary" className="mb-2">
                    <Gift className="mr-1 h-3 w-3" />
                    {discount}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground">
                  ฿{hours > 0 ? Math.round(price / hours) : 0} per hour
                </p>
              </CardContent>
              <CardFooter>
                <Dialog open={assignOpen} onOpenChange={(open) => {
                  setAssignOpen(open)
                  if (open) setSelectedTier(tier)
                }}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Gift className="mr-2 h-4 w-4" />
                      Assign to Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Package</DialogTitle>
                      <DialogDescription>
                        Assign {selectedTier?.hours || 0} Hours Package to a member
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search member..." className="pl-10" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Select Member</Label>
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a member" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredMembers.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {memberNameOf(m)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-sm font-medium">{selectedTier?.hours || 0} Hours Package</p>
                        <p className="text-sm text-muted-foreground">฿{(selectedTier?.price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                      <Button onClick={handleAssign} disabled={saving || !selectedMemberId}>
                        {saving ? "Assigning..." : "Confirm Assign"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Packages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Hours Used / Total</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedPackages.map((ap, i) => {
                const hoursUsed = ap.hours_used ?? ap.hoursUsed ?? 0
                const hoursTotal = ap.hours_total ?? ap.hoursTotal ?? 0
                const remaining = hoursTotal - hoursUsed
                const pct = hoursTotal > 0 ? Math.round((hoursUsed / hoursTotal) * 100) : 0
                const status = ap.status || "active"
                return (
                  <TableRow key={ap.id ?? i}>
                    <TableCell className="font-medium">{ap.member_name || ap.member || "—"}</TableCell>
                    <TableCell>{ap.package_name || ap.pkg || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs">{hoursUsed}/{hoursTotal}h</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{remaining}h</span>
                    </TableCell>
                    <TableCell>{ap.expiry || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status === "active" ? "default" : "secondary"}>
                        {status === "active" ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {assignedPackages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                    No packages assigned yet.
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
