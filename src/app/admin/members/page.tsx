"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Plus,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Clock,
  DollarSign,
  Award,
} from "lucide-react"
import { Input } from "@/components/ui/input"
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

interface Member {
  id: string | number
  name?: string
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  total_hours?: number
  totalHours?: number
  total_spent?: number
  totalSpent?: number
  status?: string
  line_user_id?: string
  lineUserId?: string
}

interface PackageHistory {
  name?: string
  package?: string
  hours?: number
  total_hours?: number
  used?: number
  hours_used?: number
  expiry?: string
  status?: string
}

interface BookingHistory {
  date?: string
  court?: string
  court_name?: string
  time?: string
  start_time?: string
  end_time?: string
  amount?: number
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newLine, setNewLine] = useState("")

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers(query?: string) {
    setLoading(true)
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : ""
      const data = await apiFetch(`/api/members${params}`)
      setMembers(Array.isArray(data) ? data : (data.members || []))
    } catch (e) {
      console.error('Failed to load members', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = members.filter(
    (m) => {
      const q = search.toLowerCase()
      const name = m.name || `${m.first_name || ""} ${m.last_name || ""}`
      return name.toLowerCase().includes(q) || (m.phone || "").includes(q)
    }
  )

  async function handleAddMember() {
    setSaving(true)
    try {
      const created = await apiFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail, line_user_id: newLine }),
      })
      setMembers((prev) => [...prev, created])
      setAddOpen(false)
      setNewName("")
      setNewPhone("")
      setNewEmail("")
      setNewLine("")
    } catch (e) {
      console.error('Failed to add member', e)
    } finally {
      setSaving(false)
    }
  }

  const nameOf = (m: Member) => m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "—"
  const phoneOf = (m: Member) => m.phone || "—"
  const emailOf = (m: Member) => m.email || "—"
  const hoursOf = (m: Member) => m.total_hours ?? m.totalHours ?? 0
  const spentOf = (m: Member) => m.total_spent ?? m.totalSpent ?? 0
  const statusOf = (m: Member) => m.status || "active"
  const lineOf = (m: Member) => m.line_user_id || m.lineUserId || "—"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
              <DialogDescription>
                Add a new member to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="Phone number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="line">Line User ID</Label>
                <Input id="line" placeholder="Line User ID" value={newLine} onChange={(e) => setNewLine(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">No members found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{nameOf(member)}</TableCell>
                    <TableCell>{phoneOf(member)}</TableCell>
                    <TableCell>{emailOf(member)}</TableCell>
                    <TableCell>{hoursOf(member)}h</TableCell>
                    <TableCell>฿{spentOf(member).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={statusOf(member) === "active" ? "default" : "secondary"}>
                        {statusOf(member) === "active" ? (
                          <UserCheck className="mr-1 h-3 w-3" />
                        ) : (
                          <UserX className="mr-1 h-3 w-3" />
                        )}
                        {statusOf(member).charAt(0).toUpperCase() + statusOf(member).slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(member)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>{nameOf(member)}</DialogTitle>
                            <DialogDescription>Member details and history</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{phoneOf(member)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{emailOf(member)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{hoursOf(member)} total hours</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">฿{spentOf(member).toLocaleString()} total spent</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Line: {lineOf(member)}</span>
                              </div>
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-semibold">Package History</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Used</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                                      Fetching package data...
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            <div>
                              <h4 className="mb-2 text-sm font-semibold">Booking History</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Court</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                                      Fetching booking data...
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
