# Codebase Summary — Event Management (EventBox)

> Cập nhật: 2026-06-30 · Branch: `develop`
> Tài liệu này tóm tắt cấu trúc, module và luồng chính của codebase. Đọc kèm
> [`system-architecture.md`](./system-architecture.md) và [`code-standards.md`](./code-standards.md).

## 1. Dự án là gì

EventBox là nền tảng **quản lý & bán vé sự kiện** (lấy cảm hứng từ Ticketbox). Hệ thống
gồm hai phần tách biệt trong một monorepo:

- **`frontend/`** — Next.js 16 (App Router + React Server Components): trang chủ marketing
  + khu dashboard quản trị.
- **`backend/`** — Express 5 (Modular Monolith, TypeScript): REST API cho auth, quản lý
  tài khoản và sự kiện.

Trạng thái hiện tại: giai đoạn khởi tạo. Phần **xác thực + quản trị tài khoản** đã hoàn
chỉnh end-to-end; phần **sự kiện (event)** mới ở mức CRUD khung và phần lớn UID dashboard
còn chạy trên dữ liệu giả (mock).

## 2. Cây thư mục (rút gọn)

```
Event_Management/
├── README.md               # Tổng quan + API endpoints
├── SETUP_GUIDE.md          # Hướng dẫn cấu hình MongoDB Atlas, Gmail SMTP, Google OAuth, tạo admin
├── backend/
│   ├── .env.example        # Mẫu biến môi trường
│   └── src/
│       ├── app.ts          # Khởi tạo Express app + middleware + mount routes
│       ├── server.ts       # Entry point: connect DB → app.listen
│       ├── config/
│       │   ├── index.ts        # Đọc & gom biến môi trường (dotenv)
│       │   └── database.ts     # Kết nối Mongo + cờ isDbConnected (offline mock mode)
│       ├── common/
│       │   ├── middleware/     # auth, errorHandler, notFound, validateRequest
│       │   ├── utils/          # ApiResponse, AppError, asyncHandler, jwt, email.service
│       │   └── types/          # AuthRequest, PaginationQuery, PaginatedResult
│       └── modules/
│           ├── event/          # model · repository · service · controller · routes · index
│           └── user/           # + otp.model.ts (auth + admin account management)
└── frontend/
    ├── next.config.ts      # Rewrites /api/* → backend; cấu hình ảnh
    └── src/
        ├── app/
        │   ├── layout.tsx          # Root layout + AuthProvider + font
        │   ├── page.tsx            # Trang chủ (RSC) — dùng mockData
        │   ├── login/ register/    # Trang auth (Client Components)
        │   └── dashboard/
        │       ├── layout.tsx      # Sidebar + Header shell
        │       ├── page.tsx        # Tổng quan KPI/charts (mock)
        │       ├── events/         # Quản lý sự kiện (mock)
        │       └── accounts/       # Quản lý tài khoản (API thật, chỉ ADMIN)
        ├── components/
        │   ├── home/               # Header, HeroBanner, CategoryNav, EventSection, ... (CSS Modules)
        │   ├── layout/             # Sidebar, Header của dashboard (Tailwind)
        │   └── ui/                 # Button, Card, badge, Spinner (design system)
        ├── context/AuthContext.tsx # State user toàn cục + login/register/logout
        ├── lib/
        │   ├── api.ts              # API client cho Server Components
        │   ├── client-api.ts       # API client cho Client Components (proxy + cookie)
        │   ├── utils.ts            # cn(), format ngày/tiền/số, slugify, ...
        │   ├── mockData.ts         # Dữ liệu giả cho trang chủ
        │   └── mock-data.ts        # Dữ liệu giả cho dashboard (LƯU Ý: trùng vai trò — xem §7)
        └── types/index.ts          # Kiểu Event/Attendee/DashboardMetrics (frontend)
```

## 3. Backend — module & phân tầng

Mỗi feature là một module độc lập theo mẫu **Controller → Service → Repository → Model**:

| Tầng | Trách nhiệm | Ví dụ |
|------|-------------|-------|
| **routes** | Khai báo HTTP route + gắn middleware | `user.routes.ts` |
| **controller** | Đọc req/res, gọi service, trả `ApiResponse` | `user.controller.ts` |
| **service** | Nghiệp vụ, kiểm tra quyền/ràng buộc, ném `AppError` | `user.service.ts` |
| **repository** | Truy cập dữ liệu (Mongoose **hoặc** mock store) | `user.repository.ts` |
| **model** | Schema Mongoose + interface TypeScript | `user.model.ts` |

### Module `user` (auth + admin)
- **Đăng ký qua OTP**: `POST /api/users/otp/send` → `POST /api/users/register`. OTP 6 chữ số,
  TTL 5 phút (TTL index trên `otp.model.ts`).
- **Đăng nhập**: email/password (`/login`) hoặc Google (`/google`); trả JWT đặt vào
  **cookie HttpOnly** (`token`, 7 ngày).
- **Hồ sơ**: `GET /api/users/me` (yêu cầu đăng nhập); `PUT /api/users/me` sửa họ tên/mật khẩu.
- **Kích hoạt STAFF**: `POST /api/users/activate` (public) → xác thực token + đặt mật khẩu
  mới → chuyển status `PENDING` → `ACTIVE`.
- **Quản trị tài khoản** (prefix `/api/users/admin`, chỉ `ADMIN`): liệt kê + lọc + phân
  trang, tạo STAFF (`POST /admin/staff`, sinh mật khẩu + gửi email kích hoạt), đổi role,
  khóa/mở khóa, xóa.
- **Ràng buộc nghiệp vụ**: chỉ tạo `ADMIN` đầu tiên qua self-register (admin bootstrap);
  `STAFF` không tự đăng ký; admin không thể tự khóa/đổi-role/xóa chính mình;
  STAFF không đăng nhập khi status `PENDING`.

### Module `event`
- CRUD đầy đủ: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
- Hỗ trợ lọc theo `status`, `category`, sắp xếp + phân trang ở repository.
- **Chưa gắn middleware auth/authorize** → mọi route đang public (xem §7).

### Roles
`ADMIN` · `ORGANIZER` · `PARTICIPANT` (mặc định) · `STAFF`.

## 4. Frontend — trang & thành phần

| Route | Loại | Dữ liệu | Ghi chú |
|-------|------|---------|---------|
| `/` | RSC | `lib/mockData.ts` | Trang chủ kiểu Ticketbox: hero, category, các section sự kiện |
| `/login`, `/register` | Client | API thật | Form + nút Google Sign-In (GSI script động) |
| `/activate` | Client | API thật | Form kích hoạt STAFF: nhập họ tên + mật khẩu mới, xác thực token |
| `/dashboard` | Client | `lib/mock-data.ts` | KPI cards + biểu đồ doanh thu (Recharts) + sự kiện gần đây |
| `/dashboard/events` | Client | `lib/mock-data.ts` | Danh sách sự kiện dạng card-list (chưa nối API) |
| `/dashboard/accounts` | Client | **API thật** | Quản lý tài khoản, chỉ render khi `role === "ADMIN"` |

- **Hai API client**: `api.ts` (Server Components, gọi thẳng `http://localhost:5000`);
  `client-api.ts` (Client Components, gọi `/api/*` được Next rewrite về backend, kèm
  `credentials: "include"` để gửi cookie).
- **AuthContext**: nạp user qua `/users/me` khi mount, expose `login/register/loginWithGoogle/
  logout/refreshUser`; điều hướng `/dashboard` sau khi đăng nhập.
- **Sidebar**: menu động theo role — mục "Quản lý tài khoản" chỉ hiện với `ADMIN`.
- **Styling**: trang chủ (`components/home/*`) dùng **CSS Modules**; dashboard + auth dùng
  **Tailwind v4** + design tokens qua CSS custom properties (`var(--foreground)`...).

## 5. Dữ liệu & lưu trữ

- **MongoDB + Mongoose** là kho chính. Hai collection: `users`, `events` (+ `otps` TTL).
- **Offline mock mode**: nếu kết nối Mongo thất bại, `connectDatabase()` đặt
  `isDbConnected = false` và hệ thống tự chuyển sang **in-memory store** (RAM) cho `user`
  (đăng ký/đăng nhập/admin vẫn chạy được để demo). Dữ liệu mất khi restart. Module `event`
  **không** có nhánh mock.
- Mock store khởi tạo sẵn admin `admin@eventbox.vn / Admin@123456` + vài tài khoản demo.

## 6. Cấu hình & chạy

```bash
# Backend (cổng 5000)
cd backend && npm install && cp .env.example .env && npm run dev

# Frontend (cổng 3000)
cd frontend && npm install && npm run dev
```

Biến môi trường backend (xem `SETUP_GUIDE.md`): `PORT`, `MONGODB_URI`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `FRONTEND_URL`, `SMTP_*`, `GOOGLE_CLIENT_ID`. Frontend dùng
`NEXT_PUBLIC_API_URL` (rewrites) và `API_BASE_URL` (Server Component fetch).

## 7. Nợ kỹ thuật & điểm cần lưu ý

1. **Event routes không bảo vệ** — `POST/PUT/DELETE /api/events` thiếu `isAuthenticated`/
   `authorize`; bất kỳ ai cũng tạo/sửa/xóa được sự kiện.
2. **Google OAuth fallback** — ở môi trường `development`, khi verify token thất bại vẫn
   tự đăng nhập bằng user demo (`user.service.ts`). Tiện demo nhưng rủi ro nếu `NODE_ENV`
   sai. Client ID trong `login/page.tsx` cũng đang là placeholder.
3. **Trùng mock data** — tồn tại cả `lib/mockData.ts` (trang chủ) và `lib/mock-data.ts`
   (dashboard). Cân nhắc gộp/đặt tên rõ ràng (vi phạm DRY).
4. **Dashboard chạy mock** — `/dashboard` và `/dashboard/events` chưa nối API thật; chỉ
   `/dashboard/accounts` đã nối.
5. **`event.organizer` là `String`** — chưa `ref` tới `User`; chưa gắn người tổ chức theo id.
6. **Chưa có test**, chưa có CI. Cần bổ sung khi mở rộng.
7. **`backend/.env` đang hiện diện trong thư mục làm việc** — đảm bảo nằm trong `.gitignore`
   và không bị commit (chứa secret).

## 8. Câu hỏi chưa giải quyết

- Module `event` có cần nhánh offline mock như `user` không, hay chấp nhận yêu cầu DB bắt buộc?
- Chuẩn hóa response phân trang: backend đặt phân trang vào field `meta`; có nên thống nhất
  thành một interface dùng chung cho FE không?
- Lộ trình bỏ mock dashboard và nối API thật cho events/metrics?
