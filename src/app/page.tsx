import Link from "next/link"
import { CalendarClock, MapPin, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: CalendarClock,
    title: "จองง่าย ไม่ยุ่งยาก",
    description: "เลือกสนาม เลือกเวลา จองได้ทันที ไม่ต้องโทรหา",
  },
  {
    icon: MapPin,
    title: "หลากหลายสนาม",
    description: "รวมสนามแบดมินตันมากมายทั่วประเทศ ใกล้คุณที่สุด",
  },
  {
    icon: Settings,
    title: "จัดการสะดวก",
    description: "ดูประวัติ จัดการการจอง และยกเลิกได้ด้วยตัวเอง",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              B
            </div>
            <span className="text-lg font-bold">BadmintonBook</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">สมัครสมาชิก</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-green-50 to-background py-20 md:py-28">
          <div className="container mx-auto px-4 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
              จองสนามแบดมินตัน
              <br />
              <span className="text-primary">ง่ายกว่าเดิม</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              ค้นหาและจองสนามแบดมินตันใกล้คุณได้ทันที
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/courts">ค้นหาสนาม</Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/register">สำหรับเจ้าของสนาม</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">ทำไมต้อง BadmintonBook</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 bg-green-50/50 shadow-sm">
                  <CardContent className="flex flex-col items-center p-8 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BadmintonBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
