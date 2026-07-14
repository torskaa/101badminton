"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Binary,
  LayoutDashboard,
  Grid3x3,
  CalendarCheck,
  Users,
  Settings,
  Award,
  Gift,
  ShoppingCart,
  LogIn,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courts", label: "Courts", icon: Grid3x3 },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/members", label: "Members", icon: Award },
  { href: "/admin/pos", label: "Mini Bar", icon: ShoppingCart },
  { href: "/admin/check-in", label: "Check-in", icon: LogIn },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/crm", label: "CRM", icon: Gift },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isDashboard = item.href === "/admin"
        const active = isDashboard
          ? pathname === "/admin"
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminSidebar() {
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Grid3x3 className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        <SidebarContent />
      </aside>
    </>
  )
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5">
        <Binary className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">
          Badminton Admin
        </span>
      </div>

      <Separator />

      <div className="flex-1 overflow-auto px-3 py-4">
        <NavLinks />
      </div>

      <Separator />

      <div className="flex items-center gap-3 px-6 py-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/avatars/admin.png" alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Admin User</span>
          <span className="text-xs text-muted-foreground">admin@court.com</span>
        </div>
      </div>
    </div>
  )
}
