"use client"

import { useEffect, useState, useCallback } from "react"
import { CircleDollarSign, User, Mail, Phone, Ticket, Loader2, CheckCircle2, ShoppingBag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { clientApi } from "@/lib/client-api"
import { sellOffline } from "@/lib/staff-api"

interface StaffOfflineSalesViewProps {
  eventId: string
}

export function StaffOfflineSalesView({ eventId }: StaffOfflineSalesViewProps) {
  const [event, setEvent] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successResult, setSuccessResult] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    clientApi.get<any>(`/events/${eventId}/detail`)
      .then((res) => {
        const detail = res.data
        setEvent(detail.event)
        setTickets(detail.tickets || [])
        if (detail.tickets && detail.tickets.length > 0) {
          setSelectedTicketId(detail.tickets[0]._id || detail.tickets[0].id)
        }
      })
      .catch((err) => setError(err.message ?? "Không thể tải thông tin vé sự kiện"))
      .finally(() => setLoading(false))
  }, [eventId])

  const selectedTicket = tickets.find(t => (t._id || t.id) === selectedTicketId)
  const ticketPrice = selectedTicket ? selectedTicket.price : 0
  const totalAmount = ticketPrice * quantity

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim() || !selectedTicketId) return

    setSubmitting(true)
    setError("")
    try {
      const result = await sellOffline(eventId, {
        ticketId: selectedTicketId,
        quantity,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      })
      setSuccessResult(result)
      // Reset inputs
      setCustomerName("")
      setCustomerEmail("")
      setCustomerPhone("")
      setQuantity(1)
    } catch (err: any) {
      setError(err.message ?? "Không thể bán vé offline. Vui lòng kiểm tra lại stock vé.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"

  if (successResult) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-500/25 bg-gradient-to-b from-card to-emerald-500/5 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle2 size={28} />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Bán vé &amp; Check-in thành công!</CardTitle>
          <CardDescription>
            Đơn vé đã được thanh toán và người tham gia đã được check-in vào sự kiện.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Người tham dự:</span>
              <span className="font-semibold text-foreground">{successResult.attendeeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sự kiện:</span>
              <span className="font-semibold text-foreground">{event?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loại vé:</span>
              <span className="font-semibold text-foreground">{successResult.ticketType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số lượng:</span>
              <span className="font-semibold text-foreground">{successResult.registration?.quantity ?? quantity} vé</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-3">
              <span className="font-semibold text-foreground">Tổng tiền thu:</span>
              <span className="font-extrabold text-primary text-base">
                {(successResult.registration?.totalAmount ?? totalAmount).toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => setSuccessResult(null)}
              className="h-11 px-6 rounded-xl font-semibold cursor-pointer"
            >
              Tiếp tục bán vé
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 px-6 rounded-xl font-semibold cursor-pointer"
            >
              <a href={`/staff/check-in/${eventId}`}>
                Về trạm check-in
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] max-w-5xl mx-auto">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CircleDollarSign className="text-primary" size={22} />
            Bán vé quầy (Offline)
          </CardTitle>
          <CardDescription>
            Bán vé trực tiếp cho khách vãng lai tại quầy soát vé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ticket-type" className="text-sm font-semibold text-foreground">
                Hạng vé <span className="text-destructive">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {tickets.map((t) => {
                  const id = t._id || t.id
                  const active = selectedTicketId === id
                  const remaining = t.quantity - (t.soldQuantity || 0)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedTicketId(id)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between h-24",
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <div>
                        <span className="block font-bold text-foreground text-sm truncate">{t.ticketName}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Còn lại: {remaining > 0 ? remaining : 0} vé
                        </span>
                      </div>
                      <span className="font-extrabold text-primary text-sm mt-1">
                        {t.price.toLocaleString("vi-VN")}đ
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ticket-qty" className="text-sm font-semibold text-foreground">
                Số lượng vé <span className="text-destructive">*</span>
              </label>
              <select
                id="ticket-qty"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none cursor-pointer focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} vé
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cust-name" className="text-sm font-semibold text-foreground">
                Tên khách hàng <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                <input
                  id="cust-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Họ và tên khách hàng"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="cust-email" className="text-sm font-semibold text-foreground">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <input
                    id="cust-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="khachhang@example.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cust-phone" className="text-sm font-semibold text-foreground">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                  <input
                    id="cust-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!customerName.trim() || submitting}
              className="h-12 w-full gap-2 rounded-xl font-bold text-base cursor-pointer"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ShoppingBag size={18} />
              )}
              Xác nhận &amp; Thanh toán trực tiếp
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Bill preview */}
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-card to-muted/20 border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Ticket size={17} className="text-primary" />
              Chi tiết hóa đơn quầy
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Hạng vé:</span>
                <span className="font-semibold text-foreground">{selectedTicket?.ticketName || "Chưa chọn"}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Đơn giá:</span>
                <span className="font-semibold text-foreground">{ticketPrice.toLocaleString("vi-VN")}đ</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Số lượng:</span>
                <span className="font-semibold text-foreground">{quantity}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Phương thức thanh toán:</span>
                <span className="font-semibold text-foreground">Tiền mặt / POS tại quầy</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex justify-between items-end">
              <div>
                <span className="block text-xs text-muted-foreground font-semibold">TỔNG THANH TOÁN</span>
                <span className="text-2xl font-extrabold text-primary mt-1 block">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
