# Frontend Logic — Event Management (EventBox)

> Cập nhật: 2026-06-30 · Branch: `develop`
> Tài liệu mô tả **chi tiết logic** của frontend (`frontend/src`). Đọc kèm
> [`../system-architecture.md`](../system-architecture.md), [`../convention.md`](../convention.md).

Stack: **Next.js 16 (App Router + RSC) · React 19 · TypeScript · Tailwind v4 + CSS Modules ·
lucide-react · recharts**.

---

## 1. App Router & layout

```
app/
├── layout.tsx            # RootLayout: <html lang="vi"> + font Inter + <AuthProvider>
├── page.tsx              # Trang chủ (RSC)
├── login/page.tsx        # Client — đăng nhập + Google
├── register/page.tsx     # Client — đăng ký (OTP)
└── dashboard/
    ├── layout.tsx        # Shell: <Sidebar/> + <Header/> + <main>{children}</main>
    ├── page.tsx          # Tổng quan (KPI + charts)
    ├── events/page.tsx   # Quản lý sự kiện
    └── accounts/page.tsx # Quản lý tài khoản (chỉ ADMIN)
```

- **RootLayout** bọc toàn app bằng `AuthProvider` → mọi trang truy cập được `useAuth()`.
- **DashboardLayout** là khung cố định (sidebar trái + header trên + vùng nội dung cuộn).

---

## 2. Hai API client (quan trọng)

| Client | File | Dùng ở | Base URL | Cookie |
|--------|------|--------|----------|--------|
| **Server** | `lib/api.ts` (`api`) | Server Components (RSC) | `API_BASE_URL` (`http://localhost:5000`) | không |
| **Client** | `lib/client-api.ts` (`clientApi`) | Client Components | `/api` (tương đối) | `credentials:"include"` |

- `clientApi` gọi `/api/*` → **Next rewrites** (`next.config.ts`) chuyển tiếp về
  `${NEXT_PUBLIC_API_URL}/api/*`. Vì cùng origin nên **cookie `token` (HttpOnly) tự gửi kèm**.
- `clientApi` parse message lỗi từ body backend (`errorData.message`) để hiển thị tiếng Việt.
- **Quy tắc**: client component **không** fetch thẳng `localhost:5000` (mất cookie/CORS) —
  luôn qua `clientApi`.

---

## 3. AuthContext — nguồn sự thật về user

File: `context/AuthContext.tsx` (`"use client"`).

- **State**: `user: User | null`, `loading: boolean`.
- **`refreshUser()`** — gọi `GET /users/me`; thành công set `user`, lỗi (chưa đăng nhập) set
  `null`. Chạy **một lần khi mount** (`useEffect`).
- **`login(email,password)`** — `POST /users/login` → set `user` → `router.push("/dashboard")`.
- **`register(data)`** — `POST /users/register` → set `user` → điều hướng dashboard.
- **`loginWithGoogle(credential)`** — `POST /users/google` → set `user` → điều hướng.
- **`logout()`** — `POST /users/logout` (xóa cookie BE) → clear `user` → `router.push("/login")`.
- **`useAuth()`** — hook truy cập context; ném lỗi nếu dùng ngoài `AuthProvider`.

> Interface `User` ở đây (FE) khác `types/index.ts` (kiểu Event/dashboard). `User` gồm
> `_id, fullName, email, phone?, role, accountStatus, avatar?, createdAt, updatedAt`.

---

## 4. Logic từng trang

### 4.1 Trang chủ `/` (RSC)
Server Component thuần; ghép `Header · HeroBanner · CategoryNav · 3×EventSection · Footer ·
MobileBottomNav`. Dữ liệu lấy từ `lib/mockData.ts` (`featuredEvents/trendingEvents/upcomingEvents`).
Có `metadata` SEO riêng.

### 4.2 `/login` (Client)
- Form email/password → `useAuth().login`; bắt lỗi hiện banner đỏ.
- **Google Sign-In**: `useEffect` nạp động script `accounts.google.com/gsi/client`, gọi
  `google.accounts.id.initialize({client_id, callback})` + `renderButton(#googleSignInBtn)`.
  Callback nhận `response.credential` → `loginWithGoogle`. (Client ID hiện là placeholder →
  backend fallback xử lý — xem backend §3.2.)
- Cleanup gỡ script khi unmount.

### 4.3 `/register` (Client)
Form đăng ký theo luồng OTP: gửi OTP → nhập mã → `useAuth().register`.

### 4.4 `/dashboard` — Tổng quan (Client)
- `useAuth()` lấy tên chào mừng.
- **KPI cards** (`statCards`) + **AreaChart doanh thu** (recharts) + **danh sách sự kiện gần
  đây** — toàn bộ từ `lib/mock-data.ts` (`mockMetrics/mockRevenueData/mockEvents`).
- `statusMap` map trạng thái → nhãn tiếng Việt + variant badge.

### 4.5 `/dashboard/events` — Quản lý sự kiện (Client)
Danh sách dạng card-list từ `mockEvents`: avatar chữ cái, badge trạng thái, địa điểm/ngày/chỗ,
**thanh tiến độ** `ticketsSold/capacity` (đổi màu theo % lấp đầy), doanh thu, nút Xem/Sửa/Xóa
(hiện UI, **chưa nối API**).

### 4.6 `/dashboard/accounts` — Quản lý tài khoản (Client, **API thật**)
Trang nghiệp vụ đầy đủ nhất phía FE:
- **Chốt quyền**: nếu `currentUser.role !== "ADMIN"` → render màn "Quyền truy cập bị từ chối".
- **`fetchAccounts()`**: build query `page/limit/search/role/status` → `GET /users/admin` →
  set `accounts` + `pagination` (đọc từ `res.meta`). Tự gọi lại khi đổi `page/roleFilter/
  statusFilter/currentUser` (search submit thủ công).
- **Hành động** (qua `clientApi`, cập nhật state lạc quan):
  - `handleToggleStatus` → `POST /users/admin/:id/status` (confirm trước).
  - `handleUpdateRole` → `POST /users/admin/:id/role` (dropdown).
  - `handleDeleteUser` → `DELETE /users/admin/:id` (confirm trước).
  - `handleCreateStaffSubmit` → `POST /users/admin/staff` (modal tạo STAFF).
- **Bảo vệ self-action ở UI**: với `isSelf` (chính mình) ẩn nút khóa/xóa và khóa dropdown role
  (backend cũng chặn — phòng thủ kép).
- Helper badge màu theo role/status; phân trang Trang trước/Trang sau.

---

## 5. Components

### `components/home/*` (trang chủ — **CSS Modules**)
`Header, HeroBanner, CategoryNav, EventCard, EventSection, Footer, MobileBottomNav` — mỗi
component đi kèm `*.module.css` (scoped). Phong cách marketing/Ticketbox.

### `components/layout/*` (dashboard — **Tailwind**)
- **`Sidebar`** (`"use client"`): menu **động theo role** — base (Tổng quan, Sự kiện, Vé & Bán
  hàng) + "Quản lý tài khoản" **chỉ khi `role==="ADMIN"`** + "Cài đặt". Highlight active theo
  `usePathname`; hiển thị avatar/role + nút Đăng xuất (`useAuth().logout`).
- **`Header`**: thanh trên cùng của dashboard.

### `components/ui/*` (design system dùng lại)
`Button`, `Card` (+ `CardHeader/Content/Title/Description`), `badge` (variant
success/warning/destructive/default), `Spinner`. Ưu tiên dùng lại trước khi tạo mới.

---

## 6. Tiện ích & kiểu dữ liệu

### `lib/utils.ts`
- **`cn(...)`** — ghép class Tailwind (`clsx` + `tailwind-merge`).
- **Format locale `vi-VN`**: `formatDate`, `formatDateTime`, `formatNumber` (Intl, tránh lệch
  hydration SSR), `formatCurrency` (rút gọn `tr đ`/`tỷ đ`).
- **Khác**: `truncate`, `slugify`, `getStatusColor/Label`, `buildQueryString`.

### `lib/mockData.ts` vs `lib/mock-data.ts`
- `mockData.ts` → dữ liệu trang chủ (sự kiện công khai).
- `mock-data.ts` → dữ liệu dashboard (`mockMetrics/mockRevenueData/mockEvents`).
- ⚠️ Hai file trùng vai trò khái niệm → nên hợp nhất / đặt tên rõ (xem `../convention.md`).

### `types/index.ts`
Kiểu cho UI dashboard/trang chủ: `Event` (id, title, capacity, ticketsSold, revenue,
status...), `Attendee`, `DashboardMetrics`, `RevenueData`. **Khác** interface `User` trong
AuthContext (kiểu domain backend).

---

## 7. Styling & token

- **Hai hệ**: trang chủ dùng **CSS Modules**; dashboard/auth dùng **Tailwind v4** + **CSS
  custom properties** (`var(--foreground)`, `var(--muted-foreground)`, `var(--border)`,
  `var(--muted)`...) định nghĩa ở `app/globals.css`.
- Icon: `lucide-react`. Biểu đồ: `recharts`. Gradient/animation đặt qua class tiện ích
  (`gradient-primary`, `animate-fade-up`...).

## 8. Bất biến cần giữ khi sửa frontend

1. Client component gọi API qua `clientApi` (không fetch thẳng backend).
2. Truy cập user qua `useAuth()` — không tự gọi `/users/me` rời rạc.
3. Phân quyền UI theo `user.role` nhưng **backend mới là chốt bảo mật thật**.
4. Format ngày/số/tiền qua helper `lib/utils.ts` (tránh lệch hydration).

## 9. Câu hỏi chưa giải quyết

- Bao giờ thay mock dashboard (`/dashboard`, `/dashboard/events`) bằng API thật từ
  `/api/events` + metrics?
- Hợp nhất `mockData.ts`/`mock-data.ts` theo một quy ước tên.
- Có thêm route guard (middleware Next) chặn `/dashboard` khi chưa đăng nhập không, thay vì chỉ
  chặn ở UI?
