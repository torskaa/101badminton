"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Grid3x3, CalendarCheck, User } from "lucide-react"

const navItems = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/courts", label: "สนาม", icon: Grid3x3 },
  { href: "/my-bookings", label: "การจอง", icon: CalendarCheck },
  { href: "/profile", label: "โปรไฟล์", icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${
                  isActive ? "text-primary" : ""
                }`}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="mt-0.5 h-1 w-6 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
