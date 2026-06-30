# Backend Logic — Event Management (EventBox)

> Cập nhật: 2026-06-30 · Branch: `develop`
> Tài liệu mô tả **chi tiết logic** của backend (`backend/src`). Đọc kèm
> [`../system-architecture.md`](../system-architecture.md), [`../convention.md`](../convention.md).

Stack: **Express 5 · TypeScript · Mongoose 9 · JWT (cookie HttpOnly) · bcrypt · nodemailer ·
google-auth-library**. Kiến trúc **Modular Monolith**, phân tầng
`routes → controller → service → repository → model`.

---

## 1. Bootstrap & vòng đời request

### `server.ts` (entry point)
1. `connectDatabase()` — thử kết nối Mongo. Nếu lỗi → log cảnh báo và đặt `isDbConnected = false`
   (**không** crash; chuyển sang offline mock mode — xem §6).
2. `app.listen(config.port)` — log môi trường, DB URI, frontend URL.

### `app.ts` — pipeline middleware (đúng thứ tự)
```
helmet()                                  # security headers
cors({ origin: frontendUrl, credentials }) # cho phép cookie cross-site theo FE
cookieParser()                            # đọc cookie 'token'
morgan('dev')                             # log request
express.json() / urlencoded()             # parse body
GET /api/health                           # health check
/api/events  → eventRoutes
/api/users   → userRoutes
notFoundHandler                           # 404 cho route không khớp
errorHandler                              # bắt mọi lỗi → JSON
```

### `config/index.ts`
Gom toàn bộ biến môi trường vào object `config` (đọc qua `dotenv`): `port`, `nodeEnv`,
`mongodbUri`, `jwt.{secret,expiresIn}`, `frontendUrl`, `smtp.*`, `google.clientId`. **Mọi nơi
khác đọc cấu hình qua `config`**, không chạm `process.env` trực tiếp (ngoại lệ: check
`NODE_ENV` cho cờ cookie `secure`).

---

## 2. Mẫu module (áp dụng cho mọi feature)

Mỗi module trong `modules/<name>/` gồm: `*.model.ts`, `*.repository.ts`, `*.service.ts`,
`*.controller.ts`, `*.routes.ts`, `index.ts` (re-export routes).

| Tầng | Vai trò | Không được làm |
|------|---------|----------------|
| **routes** | map HTTP + gắn middleware | chứa logic |
| **controller** | đọc req → gọi service → trả `ApiResponse` | nghiệp vụ, truy cập DB |
| **service** | nghiệp vụ + kiểm tra quyền/ràng buộc + `throw AppError` | `res.status()` |
| **repository** | truy cập dữ liệu (Mongoose ↔ mock) | nghiệp vụ |
| **model** | schema + interface + hook/method | — |

---

## 3. Module `user` — Auth & quản trị tài khoản

File: `modules/user/{user.model, otp.model, user.repository, user.service, user.controller, user.routes}.ts`

### 3.1 Model
- **`IUser`**: `fullName, email (unique, lowercase), passwordHash (select:false, optional),
  phone, role, accountStatus, avatar` + `timestamps`.
  - `role`: `ADMIN | ORGANIZER | PARTICIPANT(mặc định) | STAFF`.
  - `accountStatus`: `ACTIVE(mặc định) | BANNED`.
  - **pre-save hook**: nếu `passwordHash` thay đổi và có giá trị → hash bcrypt (salt 10).
  - **method `comparePassword`**: so khớp bcrypt; trả `false` nếu không có hash (vd user Google).
- **`IOTP`**: `email, otp, createdAt` + **TTL index 300s** (Mongo tự xóa sau 5 phút) + index `email`.

### 3.2 Luồng xác thực (service)

**`sendOTP(email)`** — sinh OTP 6 chữ số → xóa OTP cũ của email → lưu OTP mới (DB hoặc
`mockOtpStore`) → gửi qua `emailService.sendOTP`.

**`registerWithOTP(data)`** — các bước:
1. Validate `email, password, fullName, otpCode`.
2. **Ràng buộc role**: `ADMIN` chỉ cho phép nếu hệ thống chưa có admin nào
   (`countAdmins() === 0`, admin bootstrap); `STAFF` cấm tự đăng ký; chỉ nhận
   `PARTICIPANT | ORGANIZER` ngoài hai ngoại lệ trên.
3. Chặn email đã tồn tại (409).
4. Verify OTP (so khớp bản ghi mới nhất theo `createdAt`).
5. Tạo user (mật khẩu sẽ được hook hash) → xóa OTP → loại `passwordHash` khỏi kết quả.
6. `generateToken({id, email, role})` → trả `{ user, token }`.

**`loginWithEmail(email, password)`** — lấy user kèm hash (`findByEmailForAuth`) → chặn
`BANNED` (403) → `comparePassword` → loại hash → trả token. Thông điệp lỗi gộp chung
"Email hoặc mật khẩu không chính xác" (401) để tránh dò email.

**`loginWithGoogle(googleToken)`** — 3 nhánh:
- Token bắt đầu `mock_*` → tạo email/tên giả (demo).
- Chưa cấu hình `GOOGLE_CLIENT_ID` → coi token như email test.
- Có client ID → `googleClient.verifyIdToken`. Nếu verify lỗi và `nodeEnv === development`
  → **fallback user demo** (tiện học tập, ⚠️ rủi ro nếu môi trường sai); production thì ném lỗi.
- Sau đó: tìm user theo email → chưa có thì tạo mới role `PARTICIPANT`; có rồi mà `BANNED` → 403.

> Controller đặt JWT vào **cookie HttpOnly** sau register/login/google (xem §3.4).

### 3.3 Quản trị tài khoản (chỉ ADMIN)
Mọi hàm admin **đều xác minh lại** người gọi là `ADMIN` ở tầng service (phòng thủ chiều sâu,
không chỉ dựa middleware):
- **`getAllUsers(adminId, query)`** — lọc `role/status/search` + phân trang (`findAll`).
- **`createStaffAccount`** — sinh mật khẩu ngẫu nhiên → tạo user `STAFF` → gửi credential qua
  email (`sendStaffCredential`); lỗi gửi mail chỉ log, **không** rollback user.
- **`updateAccountStatus`** — đặt `ACTIVE/BANNED`; **chặn admin tự khóa mình**.
- **`updateAccountRole`** — đổi role; **chặn admin tự đổi role mình** (tránh tự khóa quyền).
- **`deleteUser`** — xóa; **chặn admin tự xóa mình**.

### 3.4 Controller & routes
- Mỗi handler là arrow-property bọc `asyncHandler`; auth/register/login/google set cookie:
  `{ httpOnly, secure: NODE_ENV==='production', sameSite:'strict', maxAge: 7 ngày }`.
  `logout` xóa cookie cùng tham số.
- Routes (`/api/users`):
  - Public: `POST /otp/send`, `/register`, `/login`, `/google`, `/logout`.
  - Cần đăng nhập: `GET /me` (`isAuthenticated`).
  - Admin (`isAuthenticated` + `authorize('ADMIN')`): `GET /admin`, `POST /admin/staff`,
    `POST /admin/:id/role`, `POST /admin/:id/status`, `DELETE /admin/:id`.

---

## 4. Module `event` — CRUD sự kiện

File: `modules/event/{event.model, event.repository, event.service, event.controller, event.routes}.ts`

- **`IEvent`**: `title, description, date, location, maxAttendees(min 1), organizer(String),
  category, status(draft|published|cancelled|completed, mặc định draft), imageUrl` + timestamps.
  Index: `{date,status}`, `category`, `organizer`.
- **Service**: `getAllEvents` (lọc `status/category` + phân trang), `getEventById`,
  `createEvent`, `updateEvent`, `deleteEvent` — không tìm thấy thì `throw AppError(404)`.
- **Repository**: Mongoose thuần (`.lean()`, `findByIdAndUpdate({new:true, runValidators:true})`).
  **Chưa có nhánh offline mock** → cần DB để hoạt động.
- **Routes** (`/api/events`): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.
  ⚠️ **Chưa gắn `isAuthenticated`/`authorize`** → đang public; cần bổ sung
  `authorize('ORGANIZER','ADMIN')` cho các thao tác ghi.

---

## 5. Common — middleware & utils

### Middleware
- **`auth.middleware.ts`**:
  - `isAuthenticated`: lấy token (cookie ưu tiên → header `Bearer`) → `verifyToken` → kiểm
    tra user còn tồn tại + chưa `BANNED` → gán `req.user = {id,email,role}`.
  - `authorize(...roles)`: chặn 401 nếu chưa đăng nhập, 403 nếu role không thuộc danh sách.
- **`errorHandler.ts`**: nếu `AppError` → trả `statusCode` + message; còn lại → 500
  "Internal Server Error". `stack` chỉ lộ ở `development`.
- **`notFound.ts`**: 404 cho route không khớp.
- **`validateRequest.ts`**: tiện ích validate (sẵn sàng dùng cho các route cần).

### Utils
- **`ApiResponse`**: bao `{ success, message, data?, meta? }`. `ok(data,msg,meta)`,
  `created(data,msg)`, `error(msg)`. Phân trang truyền vào `meta`.
- **`AppError`**: `Error` mở rộng có `statusCode` + `isOperational`; là cách báo lỗi chuẩn.
- **`asyncHandler`**: bọc handler async, tự chuyển lỗi sang `next()` (khỏi try/catch lặp).
- **`jwt.ts`**: `generateToken/verifyToken` với payload `{id,email,role}`.
- **`email.service.ts`**: gửi OTP và credential STAFF qua SMTP (nodemailer).

### Types (`common/types`)
`AuthRequest` (Request + `user?`), `PaginationQuery`, `PaginatedResult<T>` (chứa khối
`pagination: {currentPage,totalPages,totalItems,itemsPerPage}`).

---

## 6. Offline mock mode (chi tiết)

Cờ `isDbConnected` (export từ `config/database.ts`) quyết định nhánh chạy:

- **`user.repository.ts`** rẽ nhánh ở **mọi** hàm: DB → Mongoose; offline → `mockUsersStore`
  (mảng RAM). Có `initializeMockUsers()` seed sẵn admin `admin@eventbox.vn / Admin@123456`
  + tài khoản demo; `createMockUserDoc()` giả lập `toJSON()`/`comparePassword()` như document.
- **`user.service.ts`** rẽ nhánh cho OTP (`mockOtpStore`).
- **Mục đích**: cho phép demo đăng ký/đăng nhập/admin khi không có Mongo. **Hạn chế**: dữ liệu
  mất khi restart; mock OTP không có TTL tự xóa; module `event` không hỗ trợ.

---

## 7. Bất biến cần giữ khi sửa backend

1. Thao tác ghi/nhạy cảm phải qua `isAuthenticated` (+ `authorize`). **Bổ sung cho event routes.**
2. Hàm admin tự xác minh `ADMIN` ở service (không chỉ tin middleware).
3. Không bao giờ trả `passwordHash`; luôn hash bcrypt.
4. Báo lỗi bằng `AppError`, trả dữ liệu bằng `ApiResponse` — không trả JSON tùy ý.
5. Đọc cấu hình qua `config`; `JWT_SECRET` phải đặt thật ở mọi môi trường.

## 8. Câu hỏi chưa giải quyết

- Module `event` có cần nhánh offline mock + ràng buộc `organizer` ref `User` không?
- Áp dụng `validateRequest` (schema validation) cho các body endpoint ở mức nào?
- Cơ chế refresh token hay giữ JWT 7 ngày phẳng?
