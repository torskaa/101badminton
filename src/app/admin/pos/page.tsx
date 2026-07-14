"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface MenuItem {
  id: string | number
  name: string
  price: number
  category: string
}

interface CartItem {
  item: MenuItem
  qty: number
}

type Category = "all" | "drinks" | "snacks" | "equipment"
type PaymentMethod = "cash" | "qr" | "card" | "membership"

const categories: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "drinks", label: "Drinks" },
  { value: "snacks", label: "Snacks" },
  { value: "equipment", label: "Equipment" },
]

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [category, setCategory] = useState<Category>("all")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [customerName, setCustomerName] = useState("")
  const [charging, setCharging] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    apiFetch('/api/pos/items')
      .then((data) => setMenuItems(Array.isArray(data) ? data : (data.items || [])))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredItems =
    category === "all"
      ? menuItems
      : menuItems.filter((item) => item.category === category)

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c
        )
      }
      return [...prev, { item, qty: 1 }]
    })
  }

  const removeFromCart = (itemId: string | number) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId))
  }

  const updateQty = (itemId: string | number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === itemId ? { ...c, qty: Math.max(0, c.qty + delta) } : c
        )
        .filter((c) => c.qty > 0)
    )
  }

  const total = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)

  const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="h-4 w-4" />,
    qr: <QrCode className="h-4 w-4" />,
    card: <CreditCard className="h-4 w-4" />,
    membership: <Award className="h-4 w-4" />,
  }

  async function handleCharge() {
    if (total === 0) return
    setCharging(true)
    setError("")
    try {
      await apiFetch('/api/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((c) => ({ item_id: c.item.id, qty: c.qty, price: c.item.price })),
          total,
          payment_method: paymentMethod,
          customer_name: customerName || undefined,
        }),
      })
      setCart([])
      setCustomerName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create order')
    } finally {
      setCharging(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mini Bar POS</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
            <TabsList className="w-full">
              {categories.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="flex-1">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading menu...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredItems.map((item) => (
                <Card key={item.id} className="cursor-pointer transition-colors hover:border-primary">
                  <CardContent className="p-4">
                    <div className="mb-2 text-lg font-medium">{item.name}</div>
                    <div className="mb-3 text-sm text-muted-foreground">
                      ฿{item.price}
                    </div>
                    <Button size="sm" className="w-full" onClick={() => addToCart(item)}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order
                {cart.length > 0 && (
                  <Badge className="ml-auto">{cart.reduce((s, c) => s + c.qty, 0)}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cart is empty
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((entry) => (
                    <div
                      key={entry.item.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entry.item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ฿{entry.item.price} × {entry.qty} = ฿{entry.item.price * entry.qty}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(entry.item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{entry.qty}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQty(entry.item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(entry.item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <div className="flex w-full items-center gap-2">
                <Label htmlFor="customer" className="shrink-0 text-sm">
                  Customer
                </Label>
                <Input
                  id="customer"
                  placeholder="Optional"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-8"
                />
              </div>

              <div className="grid w-full grid-cols-4 gap-1">
                {(["cash", "qr", "card", "membership"] as PaymentMethod[]).map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? "default" : "outline"}
                    size="sm"
                    className="flex-col gap-1 py-2 text-[10px]"
                    onClick={() => setPaymentMethod(method)}
                  >
                    {paymentIcons[method]}
                    {method === "qr" ? "PromptPay" : method.charAt(0).toUpperCase() + method.slice(1)}
                  </Button>
                ))}
              </div>

              <div className="flex w-full items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold">฿{total.toLocaleString()}</span>
              </div>

              {error && (
                <p className="w-full text-xs text-destructive">{error}</p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={total === 0 || charging}
                onClick={handleCharge}
              >
                <Banknote className="mr-2 h-5 w-5" />
                {charging ? "Processing..." : `Charge ฿${total.toLocaleString()}`}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
