"use client"

import { useState } from "react"
import { Save, Building2, Clock, Sun, CreditCard, TableProperties } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

export default function SettingsPage() {
  const [venueName, setVenueName] = useState("Badminton Arena")
  const [venuePhone, setVenuePhone] = useState("02-123-4567")
  const [address, setAddress] = useState("123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110")
  const [defaultRate, setDefaultRate] = useState("320")
  const [peakRate, setPeakRate] = useState("400")
  const [peakStart, setPeakStart] = useState("17:00")
  const [peakEnd, setPeakEnd] = useState("22:00")
  const [autoLightOn, setAutoLightOn] = useState(true)
  const [autoLightOff, setAutoLightOff] = useState(true)
  const [qrEnabled, setQrEnabled] = useState(true)
  const [promptpayId, setPromptpayId] = useState("08X-XXX-XXXX")

  const [courtRates, setCourtRates] = useState([
    { id: '1', name: 'คอร์ท A', rate: '100' },
    { id: '2', name: 'คอร์ท B', rate: '100' },
    { id: '3', name: 'คอร์ท C', rate: '120' },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="venueName">Venue Name</Label>
              <Input id="venueName" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venuePhone">Venue Phone</Label>
              <Input id="venuePhone" value={venuePhone} onChange={(e) => setVenuePhone(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="defaultRate">Default Hourly Rate (THB)</Label>
              <Input id="defaultRate" type="number" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="peakRate">Peak Hour Rate (THB)</Label>
              <Input id="peakRate" type="number" value={peakRate} onChange={(e) => setPeakRate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="peakStart">Peak Hours Start</Label>
              <Input id="peakStart" type="time" value={peakStart} onChange={(e) => setPeakStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="peakEnd">Peak Hours End</Label>
              <Input id="peakEnd" type="time" value={peakEnd} onChange={(e) => setPeakEnd(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-muted-foreground" />
            Light Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Auto light on check-in</Label>
              <p className="text-sm text-muted-foreground">
                Automatically turn on court lights when checking in
              </p>
            </div>
            <Button
              variant={autoLightOn ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoLightOn(!autoLightOn)}
            >
              {autoLightOn ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Auto light off check-out</Label>
              <p className="text-sm text-muted-foreground">
                Automatically turn off court lights when checking out
              </p>
            </div>
            <Button
              variant={autoLightOff ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoLightOff(!autoLightOff)}
            >
              {autoLightOff ? "On" : "Off"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Enable QR Payment</Label>
              <p className="text-sm text-muted-foreground">
                Accept PromptPay QR code payments
              </p>
            </div>
            <Button
              variant={qrEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setQrEnabled(!qrEnabled)}
            >
              {qrEnabled ? "On" : "Off"}
            </Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="promptpay">PromptPay ID</Label>
            <Input id="promptpay" value={promptpayId} onChange={(e) => setPromptpayId(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-muted-foreground" />
            Court Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Court</TableHead>
                <TableHead>Hourly Rate (THB)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courtRates.map((court) => (
                <TableRow key={court.id}>
                  <TableCell className="font-medium">{court.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={court.rate}
                      onChange={(e) =>
                        setCourtRates((prev) =>
                          prev.map((c) =>
                            c.id === court.id ? { ...c, rate: e.target.value } : c
                          )
                        )
                      }
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg">
          <Save className="mr-2 h-5 w-5" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}
