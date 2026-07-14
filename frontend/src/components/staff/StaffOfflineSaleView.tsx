"use client"

import { useState, useEffect } from "react"
import { CreditCard, Printer, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card"
import { fetchEventTickets, sellOfflineTicket, type TicketType, type OfflineSaleResult } from "@/lib/staff-api"

export function StaffOfflineSaleView({ eventId }: { eventId: string }) {
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [selectedTicketId, setSelectedTicketId] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  
  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OfflineSaleResult | null>(null)

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await fetchEventTickets(eventId)
        setTickets(data)
        if (data.length > 0) {
          setSelectedTicketId(data[0]._id)
        }
      } catch (err: any) {
        setError(err.message || "Không thể tải danh sách vé")
      } finally {
        setLoading(false)
      }
    }
    loadTickets()
  }, [eventId])

  const selectedTicket = tickets.find(t => t._id === selectedTicketId)
  
  const handleQuantityChange = (val: number) => {
    if (!selectedTicket) return
    const newQ = Math.max(selectedTicket.minPerOrder, Math.min(selectedTicket.maxPerOrder, val))
    setQuantity(newQ)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !fullName || !email) return
    
    setSubmitting(true)
    setError(null)
    try {
      const res = await sellOfflineTicket(eventId, {
        ticketId: selectedTicketId,
        quantity,
        participantInfo: { fullName, email, phone }
      })
      setResult(res)
    } catch (err: any) {
      setError(err.message || "Lỗi khi bán vé")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setQuantity(1)
    setFullName("")
    setEmail("")
    setPhone("")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (error && !tickets.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-destructive">
        <AlertCircle size={32} className="mb-2" />
        <p>{error}</p>
      </div>
    )
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-lg border-emerald-500/30 shadow-emerald-500/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
            Bán vé thành công!
          </CardTitle>
          <CardDescription>
            Đã thanh toán và ghi nhận mã vé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Mã vé (QR Code):</span>
              <span className="font-mono font-bold text-foreground">{result.ticketCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Khách hàng:</span>
              <span className="font-medium text-foreground">{fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Loại vé:</span>
              <span className="font-medium text-foreground">{selectedTicket?.ticketName}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Tổng thu:</span>
              <span className="font-bold text-primary">
                {((selectedTicket?.price ?? 0) * quantity).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Bán vé mới
          </Button>
          <Button className="flex-1 gap-2">
            <Printer size={16} />
            In biên lai
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="text-primary" size={22} />
          Bán vé trực tiếp (Offline)
        </CardTitle>
        <CardDescription>
          Thực hiện bán vé và thu tiền mặt tại quầy check-in.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Loại vé</label>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Không có vé nào đang mở bán.</p>
            ) : (
              <select
                value={selectedTicketId}
                onChange={e => setSelectedTicketId(e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {tickets.map(t => (
                  <option key={t._id} value={t._id} disabled={t.soldQuantity >= t.quantity}>
                    {t.ticketName} — {t.price.toLocaleString('vi-VN')} đ{t.soldQuantity >= t.quantity ? " (Hết vé)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium text-foreground">Số lượng</label>
              <input
                id="quantity"
                type="number"
                min={selectedTicket?.minPerOrder ?? 1}
                max={selectedTicket?.maxPerOrder ?? 10}
                value={quantity}
                onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                disabled={!selectedTicket}
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Thành tiền</label>
              <div className="flex h-10 w-full items-center justify-end rounded-md border border-border bg-muted px-3 py-2 text-sm font-bold text-primary">
                {((selectedTicket?.price ?? 0) * quantity).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold">Thông tin khách hàng</h3>
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">Họ và tên <span className="text-destructive">*</span></label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email <span className="text-destructive">*</span></label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nguyenvana@example.com"
                required
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">Số điện thoại (tùy chọn)</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0912345678"
                className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!selectedTicketId || !fullName || !email || submitting || tickets.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              `Xác nhận thu ${((selectedTicket?.price ?? 0) * quantity).toLocaleString('vi-VN')} đ`
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
