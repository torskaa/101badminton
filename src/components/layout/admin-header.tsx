"use client"

import { usePathname } from "next/navigation"
import { Bell, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { WalletBalance } from "@/components/layout/wallet-balance"
import { useLiff } from "@/lib/liff/provider"
import { signOut } from "@/lib/auth/actions"

const titleMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/courts": "Courts Management",
  "/admin/bookings": "Bookings Management",
  "/admin/customers": "Customers",
  "/admin/members": "Members",
  "/admin/members/packages": "Membership Packages",
  "/admin/pos": "Mini Bar",
  "/admin/check-in": "Check-in",
  "/admin/reports": "Reports",
  "/admin/crm": "CRM",
  "/admin/crm/members": "CRM Members",
  "/admin/crm/coupons/new": "New Coupon",
  "/admin/settings": "Settings",
}

export function AdminHeader() {
  const pathname = usePathname()
  const { logout: liffLogout, isInLine } = useLiff()
  const title = Object.entries(titleMap).find(([path]) =>
    path === "/admin" ? pathname === "/admin" : pathname.startsWith(path)
  )?.[1] ?? "Admin"

  async function handleSignOut() {
    if (isInLine) {
      await liffLogout()
    } else {
      await signOut()
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <div className="flex items-center gap-2 lg:hidden">
        <AdminSidebar />
      </div>

      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <WalletBalance />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px]">
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/admin.png" alt="Admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline-flex">
                Admin
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
