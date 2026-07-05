# Frontend API Contract — Event Management (EventBox)

> Cập nhật: 2026-07-05 · Branch: `develop`
> **Mục đích:** Tài liệu API dưới góc nhìn Frontend — **mỗi endpoint gọi thế nào & response trả về ra sao**.
> Đọc kèm [`business.md`](./business.md), [`system-architecture.md`](./system-architecture.md), [`codebase-summary.md`](./codebase-summary.md).
>
> **Quy ước độ tin cậy:**
> - ✅ **ĐÃ HIỆN THỰC** — verify trực tiếp từ source backend (`backend/src/...`). Contract thật, đang chạy.
> - 🟡 **FE KỲ VỌNG (chưa có backend)** — suy ra từ code FE + mock. Là **spec** để hiện thực, endpoint có thể đổi.
>
> **Hiện trạng:** Backend mới có **Auth + Quản trị tài khoản + Event CRUD**. Trên FE **chỉ 2 khu gọi API thật**:
> luồng Auth (`AuthContext`) và Admin → Accounts. Các màn còn lại chạy mock → phần 🟡 là backlog API.

---

## 1. Cách Frontend giao tiếp Backend

### 1.1 Hai API client

| Client | File | Dùng cho | Base URL |
|--------|------|----------|----------|
| `api` (server) | `frontend/src/lib/api.ts` | Server Components (RSC), fetch lúc SSR | `process.env.API_BASE_URL` → mặc định `http://localhost:5000` |
| `clientApi` (browser) | `frontend/src/lib/client-api.ts` | Client Components | prefix `/api` (relative) |

- `clientApi` luôn gửi `credentials: "include"` → **cookie `token` (HttpOnly) tự đính kèm** mọi request. Đây là cơ chế auth chính của FE.
- `Content-Type: application/json` cho cả request & response.
- ⚠️ `api` (RSC) **không** tự gửi cookie → chỉ hợp cho dữ liệu public. Endpoint cần auth phải gọi qua `clientApi`.

### 1.2 Proxy (Next.js rewrites)

`frontend/next.config.ts` rewrite mọi `/api/:path*` sang backend:

```
/api/:path*  →  ${NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/:path*
```

→ FE gọi `/api/users/login`, thực chất tới `http://localhost:5000/api/users/login`. Nhờ same-origin nên cookie hoạt động ở dev.

### 1.3 Mount prefix backend (`backend/src/app.ts`)

| Prefix | Module |
|--------|--------|
| `/api/users` | User + Auth (`user.routes.ts`) |
| `/api/events` | Event (`event.routes.ts`, public read + protected write) |
| `/api/organizer` | Organizer event + ticket mgmt (`organizer.routes.ts`, ORGANIZER\|ADMIN) |
| `/api/categories` | Category (`category.routes.ts`, public read + ADMIN write) |
| `/api/stars` | Star (`star.routes.ts`, public read + ADMIN write) |
| `/api/banners` | Banner (`banner.routes.ts`, public read + ADMIN write) |
| `/api/health` | Health check → `{ status: "ok", timestamp }` (không bọc envelope) |

### 1.4 Xác thực (cookie `token`)

Middleware `isAuthenticated` (`auth.middleware.ts`):
1. Đọc token từ **cookie `token`** (ưu tiên) hoặc header `Authorization: Bearer <jwt>` (fallback).
2. Verify JWT → nạp `req.user = { id, email, role }`.
3. Cookie set khi login/register/google: `HttpOnly`, `SameSite=Strict`, `secure` (chỉ prod), `maxAge` 7 ngày.

FE **không** đọc/lưu token — chỉ dựa vào cookie. `register`/`login`/`google` cũng trả `token` trong `data` (tiện debug), nhưng FE không cần dùng.

---

## 2. Response envelope — "response trả về như thế nào"

**Mọi endpoint (trừ `/api/health`) đều bọc chung 1 vỏ.** Nguồn: `common/utils/ApiResponse.ts`.

### 2.1 Response THÀNH CÔNG

```jsonc
{
  "success": true,
  "message": "…",            // string, thường tiếng Việt
  "data": { /* payload T */ }, // object | array | null
  "meta": { /* optional */ }   // CHỈ có khi phân trang
}
```

> **FE PHẢI đọc `res.data`, KHÔNG đọc thẳng body.** Ví dụ: `AuthContext` đọc `res.data.user`;
> Accounts đọc `res.data` (mảng) + `res.meta` (phân trang).
> Payload có thể kèm `__v` (version key của Mongo) — FE bỏ qua.

### 2.2 Response LỖI

Nguồn: `common/middleware/errorHandler.ts`. **Không có `data`.**

```jsonc
{
  "success": false,
  "message": "Mô tả lỗi (thường tiếng Việt)",
  "stack": "…"    // CHỈ có ở NODE_ENV=development
}
```

HTTP status ≠ 2xx. `clientApi` tự `throw new Error(errorData.message)` → component bắt `err.message` để hiển thị toast/inline.
`api` (RSC) chỉ `throw` kèm status text — **không** đọc `message`.

**Bảng mã lỗi dùng chung:**

| Code | Ý nghĩa | Ví dụ |
|------|---------|-------|
| `400` | Thiếu field / dữ liệu sai / OTP sai / tự thao tác chính mình | Đăng ký thiếu field, OTP sai |
| `401` | Chưa đăng nhập / token hỏng / sai đăng nhập | Gọi `/me` không cookie |
| `403` | Sai role / tài khoản `PENDING` / `BANNED` | PARTICIPANT gọi route admin |
| `404` | Không tìm thấy | Event id không tồn tại |
| `409` | Trùng dữ liệu | Email đã đăng ký |
| `500` | Lỗi không lường trước | `message: "Internal Server Error"` |

### 2.3 Phân trang (`meta`)

Chỉ xuất hiện ở endpoint list có phân trang. Nguồn: `common/types/index.ts` → `PaginatedResult.pagination`.

```jsonc
"meta": {
  "currentPage": 1,
  "totalPages": 5,
  "totalItems": 42,
  "itemsPerPage": 10
}
```

Query params: `page` (default 1), `limit` (default 10), + filter tuỳ endpoint.

### 2.4 Định danh & định dạng

- **ID:** backend trả **`_id`** (Mongo ObjectId dạng string). ⚠️ Nhiều type FE sự kiện dùng `id` — xem §5.
- **Ngày (real API):** ISO 8601. ⚠️ FE participant kỳ vọng `"DD/MM/YYYY"` — xem §5.

---

## 3. ✅ API ĐÃ HIỆN THỰC (verified từ source)

### 3.1 Kiểu `User` trả cho FE

Nguồn `user.model.ts` (đã loại `passwordHash`):

```ts
interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "ORGANIZER" | "PARTICIPANT" | "STAFF";
  accountStatus: "ACTIVE" | "BANNED" | "PENDING";
  avatar?: string;      // Google/tự sinh → URL dicebear
  createdAt: string;    // ISO
  updatedAt: string;    // ISO
}
```

### 3.2 Authentication — `/api/users` (public)

| # | Method | Path | Request body | HTTP | `data` trả về |
|---|--------|------|--------------|------|---------------|
| 1 | POST | `/otp/send` | `{ email }` | 200 | `null` — gửi OTP 6 số qua email (TTL 5') |
| 2 | POST | `/register` | `{ fullName, email, password, otpCode, phone?, role? }` | 201 | `{ user: User, token }` — set cookie |
| 3 | POST | `/login` | `{ email, password }` | 200 | `{ user: User, token }` — set cookie |
| 4 | POST | `/google` | `{ credential }` | 200 | `{ user: User, token }` — set cookie |
| 5 | POST | `/logout` | `{}` | 200 | `null` — clear cookie |
| 6 | POST | `/activate` | `{ token, fullName?, password? }` | 200 | `User` — kích hoạt STAFF |

**Chi tiết & ràng buộc:**
- **register:** `role` default `PARTICIPANT`. Chỉ `PARTICIPANT`/`ORGANIZER` được self-register. `ADMIN` chỉ khi hệ thống **chưa có** admin nào (bootstrap). `STAFF` **không** self-register.
- **login/google:** chặn `PENDING` & `BANNED` (403).
- **activate:** `token` = activation JWT (7 ngày, gửi qua email khi admin tạo STAFF); `password` ≥ 6 ký tự; chỉ hoạt động khi account đang `PENDING`.

**Ví dụ response `POST /login` (200):**
```jsonc
{
  "success": true,
  "message": "Đăng nhập thành công!",
  "data": {
    "user": {
      "_id": "665f1a2b3c4d5e6f7a8b9c0d",
      "fullName": "Nguyễn Văn A",
      "email": "a@gmail.com",
      "phone": "0912345678",
      "role": "PARTICIPANT",
      "accountStatus": "ACTIVE",
      "avatar": "https://api.dicebear.com/7.x/adventurer/svg?seed=Nguyễn Văn A",
      "createdAt": "2026-06-01T08:30:00.000Z",
      "updatedAt": "2026-06-20T02:15:00.000Z"
    },
    "token": "<jwt>"
  }
}
```

**Ví dụ response `POST /otp/send` (200):**
```jsonc
{ "success": true, "message": "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!", "data": null }
```

**Lỗi hay gặp (auth):**

| Endpoint | Code | `message` |
|----------|------|-----------|
| register | 400 | `Email, password, fullName, and OTP code are required` / `Mã OTP không hợp lệ hoặc đã hết hạn` |
| register | 403 | `STAFF accounts cannot self-register...` / ADMIN đã tồn tại |
| register | 409 | `Email already registered` |
| login | 401 | `Email hoặc mật khẩu không chính xác` |
| login | 403 | `Tài khoản của bạn chưa được kích hoạt...` / `...đã bị khóa...` |
| activate | 400 | `Mã kích hoạt không hợp lệ` / `...đã hết hạn...` / `Mật khẩu mới phải có ít nhất 6 ký tự` |

### 3.3 Profile — `/api/users/me` (cần cookie auth)

| Method | Path | Request body | `data` |
|--------|------|--------------|--------|
| GET | `/me` | — | `User` |
| PUT | `/me` | `{ fullName?, currentPassword?, newPassword? }` | `User` |

- `GET /me` → `AuthContext.refreshUser` dùng để hydrate phiên. Chưa auth → **401** `Vui lòng đăng nhập...`.
- `PUT /me`: đổi mật khẩu **bắt buộc** kèm `currentPassword` đúng; `newPassword` ≥ 6 ký tự.

**Ví dụ response `GET /me` (200):**
```jsonc
{
  "success": true,
  "message": "Lấy thông tin người dùng thành công",
  "data": { "_id": "…", "fullName": "…", "email": "…", "role": "ORGANIZER", "accountStatus": "ACTIVE", "createdAt": "…", "updatedAt": "…" }
}
```

**Lỗi:** `PUT /me` → 400 `Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu` / `Mật khẩu hiện tại không chính xác`.

### 3.4 Admin — Quản trị tài khoản — `/api/users/admin` (cần cookie auth + role `ADMIN`)

Khu **duy nhất** trong Admin dashboard đang gọi API thật (`dashboard/accounts/page.tsx`).

| Method | Path | Request | HTTP | `data` / `meta` |
|--------|------|---------|------|-----------------|
| GET | `/admin` | query: `page`, `limit`(FE=10), `search`, `role`, `status` | 200 | `data: User[]` + `meta: pagination` |
| POST | `/admin/staff` | `{ fullName, email }` | 201 | `data: User` (STAFF/PENDING) |
| POST | `/admin/:id/role` | `{ role }` | 200 | `data: User` |
| POST | `/admin/:id/status` | `{ status: "ACTIVE" \| "BANNED" }` | 200 | `data: User` |
| DELETE | `/admin/:id` | — | 200 | `null` |

- **GET /admin:** `search` khớp `fullName` OR `email` (regex, không phân biệt hoa thường); sort `createdAt` desc.
- **POST /admin/staff:** BE tự sinh mật khẩu tạm + gửi email kích hoạt (activation link).
- **role/status/delete:** **không** tự thao tác chính mình → 400 (`Không thể tự thay đổi quyền hạn của chính mình`, `Không thể tự khóa tài khoản của chính mình`, `Cannot delete your own admin account`).

**Ví dụ response `GET /admin?page=1&limit=10` (200):**
```jsonc
{
  "success": true,
  "message": "Tải danh sách tài khoản thành công",
  "data": [
    { "_id": "…", "fullName": "System Admin", "email": "admin@eventbox.vn", "role": "ADMIN", "accountStatus": "ACTIVE", "createdAt": "…", "updatedAt": "…" }
  ],
  "meta": { "currentPage": 1, "totalPages": 3, "totalItems": 24, "itemsPerPage": 10 }
}
```

**Lỗi:** thiếu cookie → 401; không phải ADMIN → 403 `Bạn không có quyền thực hiện hành động này`; tạo STAFF trùng email → 409.

### 3.5 Events — `/api/events`

✅ **Auth:** `GET` public (để trang chủ/khám phá); `POST/PUT/DELETE` gắn `authorize('ORGANIZER','ADMIN')`.

**Kiểu `EventApi` thật** (`event.model.ts`) — **khác** kiểu FE participant/admin đang dùng (xem §5):

```ts
interface EventApi {
  _id: string;
  title: string;
  description: string;
  date: string;                 // ISO
  location: string;             // 1 chuỗi phẳng
  maxAttendees: number;
  organizer: string;            // string tự do, CHƯA ref User
  category: string;             // string tự do, CHƯA ref Category
  status: "draft" | "published" | "cancelled" | "completed";  // default "draft"
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

| Method | Path | Request | HTTP | `data` |
|--------|------|---------|------|--------|
| GET | `/` | query: `page`, `limit`, `sort`, `order`(asc\|desc), `status`, `category` | 200 | `EventApi[]` + `meta` |
| GET | `/:id` | — | 200 | `EventApi` (404 nếu không có) |
| POST | `/` | các field bắt buộc: `title, description, date, location, maxAttendees, organizer, category` | 201 | `EventApi` |
| PUT | `/:id` | `Partial<EventApi>` | 200 | `EventApi` |
| DELETE | `/:id` | — | 200 | `null` |

**Ví dụ response `GET /api/events/:id` (200):**
```jsonc
{
  "success": true,
  "message": "Event retrieved successfully",
  "data": {
    "_id": "…", "title": "Live Concert 2026", "description": "…",
    "date": "2026-07-18T12:30:00.000Z", "location": "Nhà hát Hòa Bình, TP.HCM",
    "maxAttendees": 500, "organizer": "EventBox", "category": "Nhạc sống",
    "status": "published", "imageUrl": "https://…", "createdAt": "…", "updatedAt": "…"
  }
}
```
> `POST /api/events` khi thành công trả `message: "Created successfully"` (mặc định `ApiResponse.created`).

---

## 4. 🟡 API FRONTEND KỲ VỌNG (chưa có backend — spec để hiện thực)

> Chưa có endpoint. Shape lấy từ code FE + mock → là **spec**. Endpoint là **đề xuất**. Trọng tâm: **field UI cần nhận để render**.

### 4.1 Participant — Trang chủ (`/`) · `app/page.tsx`

```ts
interface EventCardItem {           // card dùng chung Home/list/related
  id: string; title: string;
  date: string;     // "DD/MM/YYYY"
  time: string;     // "HH:mm" (đôi khi "10:00 - 18:00")
  location: string; // "Venue, Thành phố"
  price: string;    // ĐÃ format: "500.000đ" | "Từ 300.000đ" | "Miễn phí"
  image: string; category: string; isFeatured?: boolean;
}
interface FeaturedStar { id: string; name: string; image: string; slug: string; verified?: boolean }
interface HeroBannerSlide { id: string; title: string; subtitle: string; image: string; cta: string; link: string }
```
Đề xuất: `GET /api/events?collection=featured|trending|upcoming` → `EventCardItem[]`; `GET /api/featured-stars`; `GET /api/banners`.

### 4.2 Participant — Danh sách sự kiện (`/su-kien`) · `EventsExplorer` (lọc + phân trang client-side)

```ts
type EventCity = "hcm" | "hanoi" | "dalat" | "other";
interface ExploreEvent extends EventCardItem {
  city: EventCity;       // drive filter vị trí
  categorySlug: string;  // nhac-song, san-khau, the-thao, hoi-thao, tham-quan, khac
  isFree: boolean;       // toggle "Miễn phí"
  collections: string[]; // tập con ["featured","trending","upcoming"]
}
```
Filter hiện có: `city`(radio), `free`(toggle), `categories`(multi), `date`(preset `today|tomorrow|weekend|month` | ISO). **Không có search text.** Sort tăng theo ngày, infinite scroll `PAGE_SIZE=8`.
Đề xuất: `GET /api/events?city=&category=&free=&date=&page=&limit=` → `ExploreEvent[]` + `meta` (nên chuyển filter/paging sang server).

### 4.3 Participant — Chi tiết sự kiện (`/su-kien/[id]`)

```ts
type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };
interface Organizer { name: string; logo: string; description: string }  // logo="" → hiện chữ cái đầu
interface EventDetailResponse {
  event: EventCardItem;
  detail: {
    showDates: string[];         // ≥1, "DD/MM/YYYY"
    description: ContentBlock[]; // rich content render tuần tự
    organizer: Organizer;
  };
  related: EventCardItem[];      // gợi ý (mock = 4)
}
```
`location` cần `"Venue, Địa chỉ, Thành phố"`; `price === "Miễn phí"` là sentinel. Đề xuất: `GET /api/events/:id/detail`.

### 4.4 Participant — Vé của tôi (`/ve-cua-toi`) — cần auth

```ts
type TicketStatus = "upcoming" | "used" | "cancelled";
interface UserTicket {
  id: string; orderCode: string;   // "EVB-7K2H9X" — QR hiện sinh client-side, KHÔNG scan được
  eventId: string; eventTitle: string; image: string;
  date: string; time: string; location: string;
  ticketType: string; quantity: number; seat?: string;
  totalPrice: string;              // ĐÃ format "1.600.000đ"
  purchasedAt: string;             // "DD/MM/YYYY"
  status: TicketStatus;
}
```
`status === "cancelled"` → ẩn nút xem vé. QR thật cần thêm field (`qrData`/`qrImageUrl` + QR động 30s, business §6.5). Đề xuất: `GET /api/me/tickets`.

### 4.5 Organizer — Tạo/Sửa sự kiện (wizard) · `save()` hiện chỉ `console.log`

**Payload FE sẽ GỬI (state form = request body):**
```ts
type LocationType = "offline" | "online";
interface CreateEventForm {
  posterImage: string | null;  // 720x958 — cần upload → URL
  bannerImage: string | null;  // 1280x720
  name: string;                // max 100
  locationType: LocationType;
  venueName: string; province: string; ward?: string;  // offline
  street: string;              // offline: địa chỉ; online: LINK tham gia
  category: string;            // 6 mục EVENT_CATEGORIES
  description: string;         // HTML rich-text
  orgLogo: string | null;      // 275x275
  orgName: string;             // max 80
  orgInfo: string;             // max 500
}
```
`EVENT_CATEGORIES` = `["Nhạc sống","Sân khấu & Nghệ thuật","Thể thao","Hội thảo & Workshop","Triển lãm","Khác"]`.
⚠️ **Wizard mới xong Step 1.** Step 2–4 (suất diễn, **loại vé**, cài đặt, thanh toán/ngân hàng) chưa có field → chốt schema khi hiện thực.
Đề xuất: `POST /api/organizer/events`, `PUT /api/organizer/events/:id`, `POST /api/upload` (ảnh → URL). Để **edit round-trip đúng**, `GET detail` phải trả đủ mọi field `CreateEventForm`.

### 4.6 Organizer — Sự kiện của tôi (`/organizer`)

```ts
type OrgEventStatus = "upcoming" | "past" | "pending" | "draft";
interface TicketType { name: string; price: number; sold: number; total: number; locked: number }
interface OrganizerEvent {
  id: string; title: string; image: string;
  dateTime: string;   // chuỗi VN format sẵn: "19:30, Thứ 7, 18 tháng 07 2026" | "Chưa đặt lịch"
  venueName: string; address: string; status: OrgEventStatus;
  ticketTypes?: TicketType[];  // draft không có
}
```
Tabs `upcoming|past|pending|draft`, search `title`, `PAGE_SIZE=4`. Đề xuất: `GET /api/organizer/events?status=&q=&page=&pageSize=`.

### 4.7 Organizer — Summary / Analytics / Check-in / Members / Orders

```ts
// Summary — GET /api/organizer/events/:id/summary?range=24h|30d
interface EventSummary { totalTickets; soldTickets; totalRevenue; soldRevenue; revenuePct; ticketsPct: number }
interface SummaryPoint { label: string; revenue: number; tickets: number }
// Analytics — GET /api/organizer/events/:id/analytics?from=&to=
interface EventAnalytics {
  visits; users; buyers: number; conversion: string;   // "3.2 %"
  series: { label: string; visits: number }[]; channels: { channel: string; visits: number }[];
}
// Check-in — GET /api/organizer/events/:id/checkin/stats (+realtime)
interface CheckInStats {
  soldTickets; checkedIn; inside; left: number; percent: number;
  perType: (TicketType & { checkedIn: number })[];
}
// Members — GET/POST /api/organizer/events/:id/members
interface EventMember { id; name; code; role; email: string; online: boolean }
```
- **Orders** (`/organizer/events/[id]/orders`): empty state, chưa có model → thiết kế `{ orderId, buyer, ticketType, quantity, amount, paymentStatus, createdAt }`.
- **Seatmap**: dùng `event.ticketTypes`, `available = max(0, total - sold - locked)`; action payload dự kiến `{ ticketTypeName, quantity, action: "lock"|"unlock"|"invite" }`.

### 4.8 Admin — Dashboard / Moderation / Reports / Settings

```ts
// GET /api/admin/dashboard/metrics
interface DashboardMetrics {
  totalEvents; activeEvents; totalRevenue; totalAttendees: number;
  revenueGrowth; attendeeGrowth: number; totalUsers; pendingApprovals: number;
}
interface RevenueData { month: string; revenue: number }  // month "T1".."T12"
// GET /api/admin/moderation?status=  ·  POST /api/admin/events/:id/moderate { status, rejectionReason? }
type ModerationStatus = "pending" | "approved" | "rejected";
interface ModerationEvent { id; title; organizer; category; location; submittedAt: string; status: ModerationStatus }
// GET/PUT /api/admin/settings
interface SystemSettings { platformName; hotline: string; autoApprove; emailAlerts; maintenance: boolean }
```
Reports (`GET /api/admin/reports`): `RevenueData[]` (bar/tháng), `{ name; value: number }[]` (pie thể loại), top events (`title, location, ticketsSold, capacity, revenue`). Moderation reject **bắt buộc** lý do (business §6.3).

---

## 5. ⚠️ Điểm mâu thuẫn cần chốt trước khi ráp API thật

Các lệch **sẽ vỡ UI** nếu ghép API thật vào FE hiện tại:

1. **`_id` vs `id`:** BE trả `_id`. Auth/Accounts dùng đúng `_id`; nhưng type sự kiện FE (`types/index.ts`, mock) dùng `id`. → map `_id`→`id` ở tầng fetch, hoặc BE trả `id`.
2. **Giá — chuỗi vs number:** participant dùng `price`/`totalPrice` **đã format** (`"500.000đ"`, sentinel `"Miễn phí"`); Organizer `TicketType.price` là **number**. → API trả number thì phải sửa EventCard/Hero/StickyBar/TicketCard.
3. **Ngày:** participant/organizer dùng `"DD/MM/YYYY"` (+ `dateTime` chuỗi VN); admin + backend dùng **ISO**. → chốt: API trả ISO, FE format khi render.
4. **Enum `status` — 4 hệ khác nhau:** BE `draft|published|cancelled|completed`; Admin FE giống BE; moderation `pending|approved|rejected`; Organizer `upcoming|past|pending|draft`; nghiệp vụ `DRAFT|PENDING_REVIEW|PUBLISHED|REJECTED`. → cần **một** bộ enum + bảng ánh xạ. BE hiện **thiếu** `pending_review`/`rejected` (chưa có luồng duyệt).
5. **`Event` field lệch:** admin `Event` có `capacity, ticketsSold, revenue` (BE không có); BE có `maxAttendees, organizer(string), category(string)` (chưa ref); participant cần `time, price, image, city, categorySlug, isFree, collections, showDates, description(blocks), organizer(object)`. → mở rộng schema Event.
6. **QR vé giả:** `/ve-cua-toi` sinh QR client-side từ `orderCode` (không scan được). Cần field/endpoint QR thật (QR động 30s).
7. **Upload ảnh:** poster/banner/orgLogo hiện là blob preview (chưa upload). Cần endpoint upload trả URL.
8. **Events routes chưa bảo vệ:** create/update/delete không auth/role → bảo vệ trước khi mở public.

---

## 6. Bảng tổng hợp endpoint

| Nhóm | Endpoint | Trạng thái |
|------|----------|-----------|
| Auth | `POST /api/users/otp/send · /register · /login · /google · /logout · /activate` | ✅ |
| Profile | `GET/PUT /api/users/me` | ✅ |
| Admin accounts | `GET /api/users/admin` · `POST /admin/staff` · `POST /admin/:id/role` · `POST /admin/:id/status` · `DELETE /admin/:id` | ✅ |
| Events CRUD | `GET/POST /api/events` · `GET/PUT/DELETE /api/events/:id` | ✅ (⚠️ chưa auth/role) |
| Health | `GET /api/health` | ✅ (không bọc envelope) |
| Home | `GET /events?collection=` · `/featured-stars` · `/banners` | 🟡 |
| Danh sách SK | `GET /events?city&category&free&date&page` | 🟡 |
| Chi tiết SK | `GET /events/:id/detail` | 🟡 |
| Vé của tôi | `GET /me/tickets` (+QR) | 🟡 |
| Organizer | `GET/POST/PUT /organizer/events[/:id]` · `/summary /analytics /checkin /members /orders` · `POST /upload` | 🟡 |
| Admin khác | `GET /admin/dashboard/* · /moderation · /reports · /settings` | 🟡 |
| Booking/VNPAY, Wishlist, Notification, Issue, AI gợi ý | — | 🟡 (chưa có FE lẫn BE) |

---

## 7. Tài khoản seed (mock fallback — chỉ khi DB offline)

Khi backend **không** kết nối được MongoDB, `user.repository.ts` dùng in-memory store với tài khoản demo (tiện dev FE):

| Email | Mật khẩu | Role |
|-------|----------|------|
| `admin@eventbox.vn` | `Admin@123456` | ADMIN |
| `admin_demo@gmail.com` | (Google/không mật khẩu) | ADMIN |
| `user_demo@gmail.com` | (Google/không mật khẩu) | PARTICIPANT |

Google login mock: gửi `credential` dạng `"mock_<tên>"` hoặc 1 email → BE tạo/đăng nhập user PARTICIPANT.

---

## 8. Câu hỏi chưa giải quyết

- **Chuẩn hoá kiểu Event:** hợp nhất participant/organizer/admin/backend thành mấy DTO (list card vs detail vs organizer-manage)? BE trả `price` number hay chuỗi?
- **Loại vé — nhúng hay tách bảng?** (business §10) — quyết trước wizard step 2 + booking.
- **Luồng duyệt sự kiện:** bổ sung `PENDING_REVIEW`/`REJECTED` vào enum BE + endpoint moderate?
- **Booking/VNPAY, Wishlist, Notification, Issue, AI gợi ý:** ưu tiên thứ tự?
- **Orders (Organizer):** thiết kế model đơn hàng.
- **`dateTime` (Organizer):** BE trả chuỗi format sẵn hay FE tự format từ ISO?
- **Filter `/su-kien`:** giữ lọc client hay chuyển server-side paging?
