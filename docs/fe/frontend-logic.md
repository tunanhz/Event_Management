# Frontend Logic — Event Management (EventBox)

> Cập nhật: 2026-07-20 · Branch: `develop`
> Mô tả **toàn bộ logic FE** (`frontend/src`), kiến trúc CSS và chiến lược responsive.
> Đọc kèm [`../system-architecture.md`](../system-architecture.md), [`../convention.md`](../convention.md),
> [`../frontend-api-contract.md`](../frontend-api-contract.md).

Stack: **Next.js 16 (App Router + RSC) · React 19 · TypeScript · Tailwind v4 + CSS Modules ·
lucide-react · recharts · @zxing/browser**.

Quy mô: 310 file trong `src/` — 173 `.tsx`, 65 `.module.css`, 25 file test.

---

## 1. Cấu trúc thư mục

```
frontend/
├── design-system/MASTER.md      # Nguồn chân lý về UI (tokens, style, a11y)
├── public/
│   ├── data/vietnam-provinces-wards.json   # Dropdown địa chỉ (wizard tạo sự kiện)
│   ├── terms/                   # PDF điều khoản cho organizer
│   └── *.svg                    # placeholder ảnh sự kiện / avatar
├── scripts/
│   ├── clean-turbopack-cache.js # chạy tự động qua `predev`
│   └── dev-mobile.mjs           # dev server HTTPS để test trên điện thoại thật
└── src/
    ├── app/                     # Routes (App Router)
    ├── components/              # UI theo domain
    ├── context/AuthContext.tsx  # Context DUY NHẤT của toàn app
    ├── lib/                     # API clients, hooks, helpers, mock data
    ├── types/index.ts           # Type dùng chung cho khu vực admin
    └── __tests__/               # Jest + Testing Library (mirror cấu trúc components/)
```

### 1.1 `src/app` — bản đồ route

```
app/
├── layout.tsx              # RootLayout: <html lang="vi"> + Be Vietnam Pro + AuthProvider + script anti-FOUC
├── globals.css             # Design tokens + Tailwind + animations
├── page.tsx                # Trang chủ (RSC)
│
│  ── Công khai (PARTICIPANT) ──
├── su-kien/                # Danh sách + tìm kiếm sự kiện
│   └── [id]/               # Chi tiết sự kiện
│       ├── dat-ve/         # Bước 1: chọn vé
│       └── thanh-toan/     # Bước 2: thanh toán
├── thanh-toan/vnpay-return/ # Trang trả về sau khi VNPAY xử lý
├── ve-cua-toi/             # Vé của tôi (QR)
├── su-kien-da-luu/         # Sự kiện đã lưu (localStorage)
├── thong-bao/              # Trung tâm thông báo (mock)
├── tai-khoan/              # Cài đặt tài khoản
│
│  ── Auth ──
├── login/  register/  forgot-password/  activate/
│
│  ── Admin (RoleGuard: ADMIN) ──
├── dashboard/
│   ├── layout.tsx          # Shell: Sidebar + Header + drawer mobile
│   ├── page.tsx            # Tổng quan KPI (MOCK)
│   ├── accounts/           # Quản lý tài khoản (API thật)
│   ├── events/             # Quản lý sự kiện (API thật)
│   ├── moderation/[id]/    # Kiểm duyệt (API thật)
│   ├── staff-assignment/   # Phân công nhân viên (API thật)
│   ├── ticket-sales/       # Bán vé, chỉ đọc (API thật)
│   ├── categories/ stars/ banners/   # CRUD qua ResourceManager (API thật)
│   ├── finance/ reports/ settings/   # MOCK / chưa nối backend
│   └── event-status/       # redirect → /dashboard/events (shim URL cũ)
│
│  ── Organizer (RoleGuard: ORGANIZER) ──
├── organizer/
│   ├── layout.tsx          # Shell: Topbar + Sidebar (đổi theo route)
│   ├── page.tsx            # Sự kiện của tôi
│   ├── create-event/       # Wizard 6 bước
│   ├── events/[id]/        # Workspace 1 sự kiện
│   │   ├── summary/ analytics/ orders/ check-in/ withdrawal/   (nhóm "Báo cáo")
│   │   └── schedule/ permits/ members/ edit/                   (nhóm "Cài đặt")
│   ├── reports/ profile/ terms/[slug]/
│
│  ── Staff (RoleGuard: STAFF | ADMIN) ──
└── staff/
    ├── layout.tsx          # Topbar riêng, KHÔNG dùng sidebar admin
    ├── page.tsx            # Ca trực được phân công
    ├── check-in/[eventId]/ # Trạm soát vé + attendees / history / summary
    ├── incidents/          # Báo cáo sự cố
    └── profile/
```

**Quy ước Server vs Client Component**

| Khu vực | Mẫu |
|---|---|
| Public (`/`, `/su-kien`, `/ve-cua-toi`…) | Server page `async` fetch dữ liệu → truyền xuống Client view |
| Staff | Server page mỏng (metadata + `await params`) → Client view "béo" |
| Organizer | **Gần như toàn bộ Client**. Chỉ `events/[id]/page.tsx` (redirect) và `profile/page.tsx` là Server |
| Admin | Hỗn hợp — `moderation/[id]`, `staff-assignment`, `ticket-sales`, `finance` là Server; còn lại Client trực tiếp (không có metadata) |

---

## 2. Tầng dữ liệu

### 2.1 Hai API client

| File | Dùng ở | Base URL | Đặc điểm |
|---|---|---|---|
| `lib/api.ts` | Server Component | `process.env.API_BASE_URL` (mặc định `localhost:5000`) | Hỗ trợ `next: {tags, revalidate}`. **Hiện không route nào dùng** |
| `lib/client-api.ts` | Client Component | `/api` (tương đối) | Luôn `credentials: "include"`; ném `Error(errorData.message)` khi non-2xx |

`next.config.ts:15-29` rewrite `/api/:path*` và `/uploads/:path*` → backend. Nhờ vậy mọi request là
same-origin, xác thực bằng **cookie httpOnly** — không có token trong JS.

> ⚠️ Tồn tại **2 biến env cho cùng một backend**: `NEXT_PUBLIC_API_URL` (dùng bởi `next.config.ts`
> và `discovery-api.ts`) vs `API_BASE_URL` (`lib/api.ts`, đang chết).

### 2.2 Các module API theo domain (`lib/` và cạnh component)

`discovery-api.ts` (public) · `booking-api.ts` · `staff-api.ts` · `admin-content-api.ts` ·
`admin-event-api.ts` · `admin-ticket-api.ts` · `moderation/moderation-api.ts` ·
`organizer/organizer-{my-events,event-detail,analytics,checkin,attendees,members,permits,schedule,inventory,withdrawal,reports}-api.ts`

Nhiệm vụ chung: gọi endpoint + **map shape API → type trình bày** mà component đã dùng, nên việc
nối backend là "đổi nguồn dữ liệu" chứ không phải viết lại component.

`discovery-api.ts:79-88` — `apiGet` dùng `cache:'no-store'` và **nuốt mọi lỗi, trả fallback**:
backend chết thì trang chủ hiện section rỗng, không bao giờ 500.

### 2.3 Thật vs Mock (trạng thái hiện tại)

**Đã nối API thật:** trang chủ, danh sách/chi tiết sự kiện, đặt vé + thanh toán, vé của tôi,
tài khoản, toàn bộ Organizer, toàn bộ Staff, và Admin (accounts, events, moderation,
staff-assignment, ticket-sales, categories/stars/banners).

**Còn mock / chưa nối:**

| Nơi | Trạng thái |
|---|---|
| `/dashboard` (tổng quan) | `mock-data.ts` — KPI + chart giả |
| `/dashboard/reports` | mock hoàn toàn |
| `/dashboard/finance` | mock hoàn toàn (`finance-data.ts`), không có network |
| `/dashboard/settings` | `save()` chỉ `console.log` |
| `/thong-bao` | `NOTIFICATIONS_SEED` 6 mục cố định |
| Analytics "traffic" panel | `NoDataBox` cố định — không có tracking pageview |

**`lib/mockData.ts` giờ chủ yếu là kho TYPE** (`EventItem`, `TicketType`, `ExploreEvent`,
`ContentBlock`…) mà `discovery-api.ts` map dữ liệu thật vào. Các mảng dữ liệu cứng bên trong
phần lớn đã chết — **trừ một chỗ vẫn còn được gọi và gây bug** (xem §8.1).

### 2.4 State phía client bằng localStorage

Hai hook cùng một khuôn mẫu (`lib/use-saved-events.ts`, `lib/use-notifications.ts`):

- Khởi tạo state **rỗng** để SSR và lần render client đầu tiên khớp nhau → tránh hydration mismatch,
  rồi mới hydrate trong `useEffect`.
- Đồng bộ qua **cả hai** sự kiện: `storage` (khác tab) và một CustomEvent riêng
  (`eventbox:*-change`) vì `storage` không bắn trong cùng tab.
- Mọi truy cập `localStorage` bọc `try/catch` (chế độ ẩn danh / hết quota).

---

## 3. Auth & phân quyền

### 3.1 `context/AuthContext.tsx` — context duy nhất

- `refreshUser()` → `GET /users/me` khi mount; lỗi thì im lặng `user = null`.
- `login` / `register` / `loginWithGoogle` / `logout`.
- `redirectBasedOnRole` (`:57-71`): `ORGANIZER→/organizer`, `STAFF→/staff`, `ADMIN→/dashboard`,
  `PARTICIPANT→/`. Áp dụng sau cả 3 luồng đăng nhập/đăng ký.
- `logout()` luôn `setUser(null)` + đẩy về `/login` kể cả khi request lỗi.

### 3.2 `components/auth/RoleGuard.tsx`

Ba trạng thái: `loading` → spinner (chặn nháy nội dung trước khi `/users/me` trả về) ·
không đủ quyền → màn hình từ chối + link về trang chủ · hợp lệ → render children.

| Khu vực | Guard |
|---|---|
| `/dashboard/**` | `allow={["ADMIN"]}` |
| `/organizer/**` | `allow={["ORGANIZER"]}` |
| `/staff/**` | `allow={["STAFF","ADMIN"]}` (ADMIN để giám sát) |

> 🔒 **Không có `middleware.ts` trong dự án.** Toàn bộ phân quyền là logic render phía client —
> bundle của `/dashboard` vẫn được gửi cho bất kỳ ai truy cập. An toàn thật sự phụ thuộc hoàn toàn
> vào việc Express từ chối request. `RoleGuard` là **UX, không phải ranh giới bảo mật**.

---

## 4. Logic khu vực công khai

### 4.1 Trang chủ
`page.tsx` (RSC) → `fetchHomeData()` chạy **5 fetch song song**: banners, stars, events
featured/trending/upcoming.

**Header** (`components/home/Header.tsx`) render **2 cây DOM riêng biệt** — desktop
(72px header + 40px sub-nav) và mobile (64px); CSS quyết định cái nào hiện.
`useScrollState()` (rAF-throttled) cho phép ẩn header khi cuộn xuống (`dir==='down' && y>120`).

**HeroBanner** — carousel 5s, dừng khi hover **và** khi focus (`onFocusCapture/onBlurCapture`),
tôn trọng `prefers-reduced-motion` qua `matchMedia`, `goTo` dùng modulo để lặp vô hạn.

### 4.2 Danh sách sự kiện `/su-kien`
- `?q` → `GET /events/search`, ngược lại `GET /events?limit=100`.
- **Mẹo remount:** `key={collection|category|query}` trên `EventsExplorer` buộc reseed toàn bộ state
  khi URL đổi — thay cho việc viết effect đồng bộ thủ công.
- **Infinite scroll:** `IntersectionObserver` với `rootMargin:'300px'`, `PAGE_SIZE = 8`.
- `filter-events.ts` — lọc theo collection → thành phố → miễn phí → nhiều category (OR) → ngày,
  rồi sort tăng dần. Preset `weekend` tính Sat+Sun tuần này; `month` dùng `new Date(y, m+1, 0)`.
- `today` "đóng băng" bằng lazy `useState(() => startOfDay(new Date()))`.

### 4.3 Chi tiết sự kiện `/su-kien/[id]`
`GET /events/:id/detail` → `{event, tickets, related}`; `null` → `notFound()`.

**EventSchedule** là component nhiều logic nhất: parse `DD/MM/YYYY`, lấy ngày sớm nhất làm mốc,
dựng **đúng 5 tab tháng liên tiếp**, lịch bắt đầu từ Thứ Hai (`(getDay()+6)%7`), 2 chế độ xem
calendar/list.

**StickyPurchaseBar** hiện khi `dir==='down' && y>420` — chiếm đúng chỗ header vừa ẩn. Dùng
`tabIndex={-1}` + `aria-hidden` khi ẩn để không lọt vào tab order.

### 4.4 Luồng đặt vé (2 bước)

**Bước 1 — `/dat-ve`** (`SelectTicketsView`):
- Chọn suất chỉ hiện khi `shows.length > 1`.
- Vé không có `showId` hợp lệ cho **mọi** suất; có `showId` thì chỉ hiện ở suất tương ứng.
- **Đổi suất là xoá sạch giỏ** — một dòng giỏ gắn với đúng một suất.
- Clamp số lượng theo `maxPerOrder`.
- Lựa chọn được **mã hoá vào query string** (`booking-selection.ts`) để sống sót qua điều hướng và F5.

**Bước 2 — `/thanh-toan`**: server `redirect` về `/dat-ve` nếu `totalQuantity === 0`
(chặn URL gõ tay). `isFree` (total 0) thì ẩn hẳn phần chọn phương thức.
`pay()`: `holdSelection()` tạo registration **tuần tự từng loại vé** → nếu VNPAY thì
`POST /payments/vnpay/create-payment-url` rồi `window.location.href`; ngược lại confirm mock →
`/ve-cua-toi`.

**`/thanh-toan/vnpay-return`**: thuần trình bày — backend đã verify chữ ký và chốt đơn phía server,
nên client không cần giữ state nào qua vòng VNPAY.

### 4.5 Vé của tôi
`GET /registrations/me` → `toUserTicket` suy ra trạng thái: `CANCELLED|EXPIRED|REFUNDED → cancelled`;
`PAID` + đã qua ngày → `used`; còn lại → `upcoming`.

`TicketQrModal` sinh **QR thật** bằng `BrowserQRCodeSvgWriter` (@zxing/browser), khoá scroll body,
`Escape` để đóng, focus nút đóng khi mở.

---

## 5. Logic Organizer

### 5.1 Shell
`layout.tsx` đổi sidebar theo route: trong `/organizer/events/[id]/…` thì dùng
`EventWorkspaceSidebar`, ngoài ra `OrganizerSidebar`. Sidebar được **render 2 lần** (inline + trong
drawer mobile); CSS chỉ ẩn bản inline bằng selector con `.body .sidebar`.

`EventWorkspaceProvider` được `key={id}` nên `selectedShowId` không bao giờ rò rỉ giữa 2 sự kiện.

### 5.2 Wizard tạo sự kiện (6 bước)

`1 Thông tin · 2 Thời gian & Loại vé · 3 Cài đặt · 4 Logistics & Giấy phép · 5 Hợp đồng · 6 Thanh toán`

State là **một object `CreateEventForm`** lồng `shows[] → tickets[]`. Ảnh giữ dạng blob URL cho tới
lúc lưu.

**Hệ thống lộ lỗi 2 tầng:** `touched: Set<string>` + `revealFieldErrors: boolean` →
`isShown(key) = revealFieldErrors || touched.has(key)`. Key có namespace (`show:<id>:startTime`)
nên một Set phủ được cả 6 bước.

**Điều hướng có kiểm soát:** `maxStep = firstInvalidStep(form) ?? 6` — chỉ mở tới bước hỏng đầu tiên;
đi lùi luôn tự do, đi tới thì bị "đẩy" về đúng bước đang chặn.

**Luật nghiệp vụ chính** (`wizard-validation.ts`):
- Mô tả phải ≥10 ký tự **và khác template mặc định** (chống submit template rỗng).
- Suất diễn: giờ bắt đầu phải ở tương lai, kết thúc sau bắt đầu, **không chồng lấn suất trước**
  (sát nhau thì được).
- Vé: `price>0` nếu không miễn phí, `maxPerOrder ≥ minPerOrder`, `maxPerOrder ≤ quantity`,
  `saleEnd ≤ show.endTime`.

**Vòng đời lưu:** upload asset (bỏ qua nếu URL đã có tiền tố `/uploads/` → không upload lại) →
`POST` (tạo) hoặc `PUT` event + `PUT .../tickets` (sửa, thay thế toàn bộ, an toàn vì chỉ áp dụng cho
DRAFT). `showIdMap` khớp theo **id FE chứ không theo vị trí mảng**.

**Khoá readOnly khi PENDING_REVIEW:** `<fieldset disabled>` **cộng** `pointerEvents:none` — fieldset
vô hiệu hoá input gốc, pointer guard chặn rich-text/upload ảnh/modal vé.

### 5.3 Các màn quản lý
- **Summary/Analytics** — recharts (`AreaChart` + `LineChart` 2 trục Y); `buildDailySeries` zero-fill
  theo ngày, chỉ dùng phần ngày **local** để nhãn SSR/CSR không lệch.
- **Check-in** — `Promise.all` 2 endpoint, có `mountedRef` guard; refresh im lặng giữ nguyên bảng.
- **Orders** — export CSV bằng Blob + thẻ `<a download>` tổng hợp.
- **Members** — **cố ý chỉ đọc**: nút "Thêm thành viên" luôn `disabled` vì phân công là việc của ADMIN.
- **Permits** — chỉ sửa được khi DRAFT|REJECTED; **từ chối lưu danh sách rỗng** để không đẩy sự kiện
  vào trạng thái không thể submit.
- **Schedule** — suất đã bán vé thì khoá nút xoá kèm tooltip giải thích.
- **Inventory** — row key `${ticketId}:${quantity}` nên khi server đổi số lượng thì row **remount**,
  input cũ không thể ghi đè restock của người khác. Sàn restock = `soldQuantity`.
- **Reports** — selection là `Set` giữ qua nhiều trang; sau khi xoá thì lùi trang nếu cần.

---

## 6. Logic Admin & Staff

### 6.1 `ResourceManager.tsx` — trừu tượng CRUD dùng chung

`makeResourceApi<T>(listPath, basePath)` → `{list, create, update, remove}`. Ba instance:
`categoryApi`, `starApi`, `bannerApi` (banner dùng `/banners/admin` để lấy cả banner inactive).

Component nhận `fields: FieldConfig[]` với `type: text|number|image|emoji|boolean|textarea` rồi render
đa hình cả **bảng** (`CellValue`) lẫn **form** (`FieldInput`). `openEdit` chỉ copy các field đã khai
báo nên `_id`/`createdAt` không bao giờ lọt vào body PUT.

Kết quả: mỗi trang categories/stars/banners chỉ còn ~25 dòng khai báo.

### 6.2 Kiểm duyệt
`reviewStatus` backend ↔ `ModerationStatus` UI qua `REVIEW_STATUS_BY_TAB` và hàm nghịch đảo.
Danh sách chỉ mở 2 tab (`pending`, `waiting_deposit`), tải song song cả hai để đổi tab tức thì.
`ModerationDecisionModal` dùng chung cho duyệt/từ chối, có Escape-to-close và preview phép tính
cọc 20% / còn lại 80% ngay khi gõ chi phí dịch vụ.

### 6.3 Trạm soát vé Staff

**`CameraQrScanner.tsx`** — máy trạng thái 7 nhánh:
`idle → starting → active` hoặc `denied | insecure | unavailable | error`.

- Kiểm tra `window.isSecureContext` trước (không HTTPS → `insecure`, và **ẩn luôn nút thử lại**
  vì retry vô nghĩa).
- **Hai backend giải mã:** ưu tiên `BarcodeDetector` gốc của trình duyệt (interval 350ms);
  không có thì `import("@zxing/browser")` **động** để zxing không nằm trong bundle ban đầu.
- **Chống race:** `sessionRef` là token tăng dần, mọi điểm resume bất đồng bộ đều kiểm tra lại token
  và tự dọn stream của mình — xử lý đúng trường hợp bấm start/stop liên tục.
- Chống quét trùng: bỏ qua cùng một mã trong 5000ms, rung `navigator.vibrate(80)` khi nhận.
- `catch` map `DOMException.name` → `NotAllowedError|SecurityError → denied`,
  `NotFoundError|OverconstrainedError → unavailable`.

**`StaffCheckInView`** — poll `checkin-stats` mỗi 15s (lỗi poll bị nuốt cố ý để không phá luồng quét);
khoá tái nhập bằng **ref** (`checkingRef`) chứ không phải state, để chặn đồng bộ trước khi React
re-render; tăng bộ đếm lạc quan rồi để poll sau đối soát.

**Cổng nghiệp vụ:** nút vào trạm chỉ hiện khi ca trực đã `confirmed`; báo sự cố cũng chỉ chọn được
sự kiện đã xác nhận ca.

---

## 7. CSS & Responsive

### 7.1 Hai hệ style song song

| Khu vực | Cách style |
|---|---|
| Public + Organizer | **CSS Modules** (65 file `.module.css`), class camelCase, dùng `composes:` cho biến thể |
| Admin + Staff | **100% Tailwind v4** + inline `style={{var(--…)}}`. Không có một file `.module.css` nào |

Tailwind v4 cấu hình **CSS-first** — không có `tailwind.config.js`; `@theme inline` trong
`globals.css:5-35` nối `--background` → `--color-background` để `bg-card`, `text-muted-foreground`,
`border-border` trỏ về cùng bộ biến.

### 7.2 Design tokens (`globals.css`)

- **Bảng màu cơ bản:** cyan/slate — `--primary: #0891b2` (cyan-600), `--background: #f8fafc`,
  `--card: #ffffff`, `--border: #e2e8f0`, `--radius: 0.75rem`.
- **Bộ trạng thái ngữ nghĩa** (`:58-68`): `--success-fg/-surface/-border`, `--warning-*`, `--danger-*`
  — foreground đạt WCAG AA ≥4.5:1 trên chính surface của nó, có bản dark tương ứng.
- **Token mở rộng** (`:80-103`) cho các CSS module cũ: `--color-surface`, `--color-text`,
  `--color-primary-bright`, `--header-height`, `--mobile-nav-height`, `--space-md/lg`,
  `--transition-fast/base`. Phần lớn là `var()` gián tiếp nên dark mode tự kế thừa.
- **Dark mode:** class `.dark` trên `<html>`, kích hoạt bởi script chặn render trong `layout.tsx:25`.
  **Dark là mặc định** — chỉ khi `localStorage.theme === 'light'` mới thoát; exception cũng ép dark.
  `ThemeToggle` **không dùng state React** — icon đổi thuần bằng biến thể `dark:`, tránh hydration
  mismatch.
- **Animation:** `fadeSlideUp / fadeDown / pulse-soft / shimmer / shake` + utility tương ứng.
- Font **Be Vietnam Pro** (400–800, subset `vietnamese`) — chọn vì hỗ trợ đầy đủ dấu tiếng Việt.

### 7.3 Chiến lược responsive

Không có breakpoint dùng chung — **mỗi module tự chọn**. Tổng hợp toàn bộ:

| Breakpoint | Số lần | Vai trò chính |
|---|---|---|
| `max-width: 640px` | 24 | Mốc mobile phổ biến nhất — grid về 1 cột, header xuống dòng |
| `max-width: 768px` | 15 | Padding container về `--space-md`, chừa chỗ cho bottom-nav |
| `max-width: 900px` | 5 | Layout 2 cột của booking/analytics/check-in |
| `max-width: 1024px` | 5 | Grid 4 cột → 2 cột |
| `max-width: 1023px` | 4 | **Mốc shell** — ẩn header desktop, hiện hamburger |
| `prefers-reduced-motion` | 4 | Global + 3 module tự khai báo thêm |
| `min-width: 768px` | 2 | Hai chỗ duy nhất viết mobile-first |
| 560 / 520 / 480 / 340 / 860 / 767 / 1200 | 1–2 mỗi loại | Tinh chỉnh cục bộ |
| `@media print` | 1 | In hợp đồng (`contract-step.module.css`) |

**Các mốc quan trọng:**

- **1023/1024px — mốc shell.** `globals.css:107` đổi `--header-height` 112px → 64px; header desktop
  ẩn, mobile bar hiện; sidebar admin `hidden lg:flex`; drawer mobile `lg:hidden`.
- **768px — mốc mobile-nav.** Mọi page shell thêm `padding-bottom: var(--mobile-nav-height)` để
  bottom-nav không che nội dung. `MobileBottomNav` hiện tại `max-width: 767px`.
- **640px — mốc 1 cột.** Grid sự kiện, KPI card, form 2 cột đều gập.

**Kỹ thuật responsive đáng chú ý:**
- `TicketCard` ở ≤640px: ẩn 2 pseudo-element "lỗ xé vé", **xoay dải màu trạng thái** từ dọc sang
  ngang (viết lại gradient thành `90deg` cho cả 3 tone), đổi `border-left` → `border-top`.
- `EventDetailHero` ≤768px: `flex-direction: column-reverse` — poster nhảy lên trên.
- Chi tiết sự kiện ≤1024px: sidebar khuyến mãi `position: static; order: -1` — nhảy lên **trên** nội
  dung dài.
- `DatePanel` ≤640px: ẩn hẳn tháng thứ hai → lịch 1 tháng.
- Bảng dữ liệu: **cuộn ngang** trong `overflow-x:auto` thay vì reflow.
- Layout shell dùng `100dvh` + vùng cuộn độc lập; token `--mobile-nav-height` chừa chỗ ở footer.

### 7.4 Accessibility (đang thực thi)
Touch target ≥44px · `aria-label` cho nút chỉ có icon · `role="alert"`/`aria-live` cho lỗi và kết quả
quét · focus trap + Escape ở modal QR và modal duyệt · `aria-pressed`/`aria-checked` cho chip và
switch · `prefers-reduced-motion` global · màu không bao giờ là tín hiệu duy nhất.

---

## 8. Vấn đề phát hiện

### 8.1 Bug thực sự

1. **Trang "Sự kiện đã lưu" luôn rỗng.** `SavedEventsView.tsx:16-18` resolve id bằng
   `findEventById` từ `lib/mockData.ts` — chỉ tìm trong mảng mock cứng (`"f1"`, `"e1"`…).
   Nhưng `EventCard` lưu **`_id` Mongo thật** từ backend. Kết quả: không id nào khớp,
   trang luôn hiện empty state. *(Đã xác minh trực tiếp.)*
2. **`min-w-160` / `min-w-130`** (`ResourceManager.tsx:163`, `ModerationDetailView.tsx:265`) —
   Tailwind v4 hiểu số trần là spacing scale → **40rem / 32.5rem**, gần như chắc chắn tác giả muốn
   160px/130px. Bảng rộng gấp ~4 lần dự định, ép cuộn ngang trên mobile. *(Đã xác minh.)*
3. **`animate-zoom-in` / `animate-fade-in` không tồn tại.** Dùng ở `accounts/page.tsx:474-475` và
   `layout/Header.tsx:125`, nhưng không có trong `globals.css` và cũng không phải built-in của
   Tailwind v4 (thuộc plugin `tailwindcss-animate` — không có trong `package.json`).
   Các modal/dropdown này render **không animation**. *(Đã xác minh.)*
4. **`minPerOrder` không được enforce** ở `SelectTicketsView.change()` — stepper đi 0→1 bất kể
   `minPerOrder` của hạng vé. Backend có thể từ chối đơn mà UI đã cho qua.

### 8.2 Rủi ro bảo mật
- **Không có `middleware.ts`** — phân quyền hoàn toàn client-side (§3.2).
- **`dangerouslySetInnerHTML`** cho HTML do organizer soạn: `EventIntro.tsx:39` và
  `ModerationDetailView.tsx:247` — không thấy sanitizer ở FE.
- **Google client ID hardcode** trong `login/page.tsx:61`.

### 8.3 Không nhất quán
- **Độ dài mật khẩu tối thiểu khác nhau:** 8 (`forgot-password`) vs 6 (`activate`,
  `ChangePasswordForm`).
- **Regex số tài khoản khác nhau:** 6–30 chữ số (wizard bước 6) vs 6–20 (form rút tiền).
- Đếm/lọc **chỉ trong trang hiện tại** chứ không phải toàn cục: `StaffCheckInHistoryView`,
  `TicketSalesView` (chỗ này có ghi rõ "trang hiện tại" — trung thực).
- `wrong_event` bị **đếm 2 lần** ở `StaffShiftSummaryView` (vừa `failed` vừa `invalid`);
  đồng thời `StaffCheckInView` gộp `wrong_event`/`cancelled` thành `"invalid"` nên vé hợp lệ quét
  nhầm cổng lại báo "Mã vé không hợp lệ".
- Hai quy ước input song song (admin `focus:ring-2 ring-cyan-500/20` vs staff
  `focus:ring-4 ring-primary/20`); admin hardcode màu literal nên **không sống sót khi đổi theme**,
  staff dùng token nên sống sót.
- Xử lý lỗi lẫn lộn: banner inline / `alert()` / `window.confirm` / `console.error` bị nuốt.

### 8.4 Code chết
`lib/mockData.ts` (phần mảng dữ liệu, trừ `findEventById` đang gây bug) · `my-events-data.ts`
(`organizerEvents`, `getOrganizerEventById`) · `staff-assignment-data.ts` (toàn file) ·
`moderation-detail-data.ts:51-164` · `tickets-data.ts` (`myTickets` + `buildQrMatrix` tự chế) ·
API quản lý sự cố phía admin (`staff-api.ts:319-349` — có client, **không có UI nào dùng**) ·
`lib/api.ts` (RSC client, không route nào gọi) · fallback `?? styles.badgePending` ở
`MyEventCard.tsx:37` (class `.badgeWaitingDeposit` thực tế **có tồn tại**).

### 8.5 Route link tới nhưng không tồn tại
`/nghe-si` và `/nghe-si/{slug}` (từ `FeaturedStars`) · `/blog` (sub-nav Header).
Ngoài ra `MobileBottomNav` tab "Tài khoản" **luôn trỏ `/login`** kể cả khi đã đăng nhập —
nên role-aware như `HeaderAccountMenu`.

### 8.6 Placeholder chưa có chức năng
Header: chọn thành phố, chọn ngôn ngữ, nút search mobile, hamburger mobile ·
checkbox "Ghi nhớ đăng nhập" (không bao giờ được đọc) · voucher ở trang thanh toán ·
ghi chú bàn giao ca (chỉ state local) · `/forgot-password` **mock hoàn toàn**, không có endpoint
(cố ý chống dò email: luôn báo thành công).

---

## 9. Câu hỏi còn treo

1. `/dashboard` tổng quan + `/dashboard/reports` + `/dashboard/finance` — sẽ nối endpoint tổng hợp
   thật, hay cố ý để làm màn demo?
2. Có kế hoạch làm màn quản lý sự cố cho admin không (API client đã sẵn ở `staff-api.ts:319-349`)?
3. `StaffAssignment.gate/shift/responsibility` đã khai báo type nhưng chưa render — có định đưa lên
   UI, hay `note` free-text là thiết kế cuối?
4. Token `--header-height` có nên điều khiển luôn chiều cao `Header` admin và `StaffTopbar`
   (hiện đang hardcode `h-16`)?
5. Đồng bộ độ dài mật khẩu tối thiểu về 6 hay 8?
