import { AdminHeader } from "@/components/layout/admin-header"
import { AdminSidebar } from "@/components/layout/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />

      <div className="lg:pl-64">
        <AdminHeader />

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
