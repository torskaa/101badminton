"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogFooter,
} from "@/components/ui/dialog"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface Court {
  id: number
  name: string
  description: string | null
  is_active: boolean
  hourly_rate: number
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")

  useEffect(() => {
    apiFetch('/api/courts')
      .then((data) => setCourts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setName("")
    setDescription("")
    setHourlyRate("")
    setEditing(null)
  }

  function openEdit(court: Court) {
    setEditing(court)
    setName(court.name)
    setDescription(court.description || "")
    setHourlyRate(String(court.hourly_rate))
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { name, description, hourly_rate: Number(hourlyRate) }
      if (editing) {
        const updated = await apiFetch(`/api/courts/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        setCourts((prev) => prev.map((c) => (c.id === editing.id ? updated : c)))
      } else {
        const created = await apiFetch('/api/courts', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        setCourts((prev) => [...prev, created])
      }
      setOpen(false)
      resetForm()
    } catch (e) {
      console.error('Failed to save court', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleteId === null) return
    try {
      await apiFetch(`/api/courts/${deleteId}`, { method: 'DELETE' })
      setCourts((prev) => prev.map((c) => (c.id === deleteId ? { ...c, is_active: false } : c)))
      setDeleteId(null)
    } catch (e) {
      console.error('Failed to delete court', e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Court Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Court
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Court" : "Add Court"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Court Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Court A1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the court"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rate">Hourly Rate (THB)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="320"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Courts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courts.map((court) => (
                  <TableRow key={court.id}>
                    <TableCell className="font-medium">{court.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {court.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={court.is_active ? "default" : "secondary"}>
                        {court.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>฿{court.hourly_rate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(court)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Dialog
                          open={deleteId === court.id}
                          onOpenChange={(open) => {
                            if (!open) setDeleteId(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteId(court.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Court</DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to delete <strong>{court.name}</strong>? This
                              action cannot be undone.
                            </p>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeleteId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDelete}
                              >
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {courts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      No courts found.
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
