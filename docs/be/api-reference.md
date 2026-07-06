# API Reference — Event Management (EventBox)

> Cập nhật: 2026-07-05 · Branch: `develop`
> Tài liệu tham chiếu **từng endpoint** (method, path, auth, request, response, lỗi).
> Đọc kèm [`backend-logic.md`](./backend-logic.md) để hiểu luồng nghiệp vụ phía sau.

Base URL (dev): `http://localhost:5000`
Tất cả endpoint nghiệp vụ có prefix `/api`. Tất cả response bọc trong format chuẩn:

```jsonc
// Thành công
{ "success": true, "message": "string", "data": <any|null>, "meta"?: {...} }
// Lỗi (AppError hoặc lỗi hệ thống)
{ "success": false, "message": "string", "stack"?: "chỉ có ở NODE_ENV=development" }
```

Xác thực dùng **JWT trong cookie HttpOnly** tên `token` (set sau login/register/google), có
fallback đọc header `Authorization: Bearer <token>`. Cookie: `httpOnly, secure (chỉ production),
sameSite=strict, maxAge=7 ngày`.

---

## 0. Health check

### `GET /api/health`
Không auth. Trả `{ status: "ok", timestamp: ISOString }` (không theo format `ApiResponse` chuẩn).

---

## 1. User — Authentication (`/api/users`, public)

### `POST /api/users/otp/send`
Gửi mã OTP 6 số tới email (dùng để đăng ký). OTP lưu MongoDB (TTL 5 phút, tự xóa) **trước khi**
gửi mail — nếu SMTP lỗi, request trả 500 nhưng OTP **vẫn đã được lưu** trong DB (collection `otps`).

**Body**
```json
{ "email": "user@example.com" }
```
**Response 200**
```json
{ "success": true, "message": "Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư!", "data": null }
```
**Lỗi**: `400` thiếu `email` · `500` SMTP lỗi (VD sai App Password Gmail).

---

### `POST /api/users/register`
Đăng ký tài khoản mới bằng email + OTP đã nhận. Set cookie `token` khi thành công.

**Body**
```json
{
  "email": "user@example.com",
  "password": "min 1 ký tự (không có rule độ dài ở BE)",
  "fullName": "Nguyễn Văn A",
  "phone": "0900000000",        // optional
  "role": "PARTICIPANT",        // optional, mặc định PARTICIPANT. Cho phép: PARTICIPANT | ORGANIZER
  "otpCode": "123456"
}
```
**Ràng buộc role**
- `PARTICIPANT` / `ORGANIZER`: luôn được phép.
- `ADMIN`: chỉ được phép nếu **hệ thống chưa có admin nào** (bootstrap tài khoản admin đầu tiên).
- `STAFF`: **cấm** tự đăng ký (403) — chỉ tạo qua `POST /admin/staff`.

**Response 201**
```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công!",
  "data": {
    "user": { "_id": "...", "fullName": "...", "email": "...", "role": "PARTICIPANT", "accountStatus": "ACTIVE", "phone": "...", "avatar": "...", "createdAt": "...", "updatedAt": "..." },
    "token": "<jwt>"
  }
}
```
**Lỗi**: `400` thiếu field / role không hợp lệ / OTP sai-hết hạn · `403` role ADMIN/STAFF vi phạm ràng buộc · `409` email đã tồn tại.

---

### `POST /api/users/login`
Đăng nhập email + mật khẩu. Set cookie `token`.

**Body**: `{ "email": "...", "password": "..." }`
**Response 200**: `{ success, message: "Đăng nhập thành công!", data: { user, token } }`
**Lỗi**: `400` thiếu field · `401` sai email/mật khẩu (thông điệp gộp chung, không lộ email tồn tại) ·
`403` tài khoản `PENDING` (chưa kích hoạt, dành cho STAFF) hoặc `BANNED`.

---

### `POST /api/users/google`
Đăng nhập/đăng ký qua Google. Set cookie `token`. Tự tạo user role `PARTICIPANT` nếu email chưa tồn tại.

**Body**: `{ "credential": "<google id_token>" }`
> Chế độ test: `credential` bắt đầu bằng `mock_<id>` → tạo user giả `<id>@gmail.com`. Nếu
> `GOOGLE_CLIENT_ID` chưa cấu hình → coi `credential` như email test luôn. Ở `development`, nếu verify
> token thật thất bại sẽ fallback sang user demo thay vì lỗi (không xảy ra ở production).

**Response 200**: `{ success, message: "Đăng nhập bằng Google thành công!", data: { user, token } }`
**Lỗi**: `400` thiếu `credential` / verify Google thất bại (production) · `403` tài khoản `BANNED`.

---

### `POST /api/users/logout`
Xóa cookie `token`. Không cần body, không cần auth.
**Response 200**: `{ success: true, message: "Đăng xuất thành công!", data: null }`

---

### `POST /api/users/activate`
Kích hoạt tài khoản STAFF bằng token nhận qua email (khi admin tạo tài khoản STAFF), đồng thời cho
phép đổi họ tên + đặt mật khẩu mới lần đầu.

**Body**
```json
{
  "token": "<jwt activation token, hạn 7 ngày>",
  "fullName": "Tên mới",     // optional
  "password": "min 6 ký tự"  // optional nhưng khuyến nghị đặt
}
```
**Response 200**: `{ success, message: "Kích hoạt tài khoản và cập nhật thông tin thành công!", data: user }`
**Lỗi**: `400` thiếu token / token sai mục đích / tài khoản không ở trạng thái `PENDING` / mật khẩu < 6
ký tự / **token hết hạn** (thông điệp riêng: "Mã kích hoạt tài khoản đã hết hạn...") · `404` không tìm thấy tài khoản.

---

## 2. User — Profile (`/api/users`, cần đăng nhập)

### `GET /api/users/me`
**Auth**: `isAuthenticated`.
**Response 200**: `{ success, message: "Lấy thông tin người dùng thành công", data: user }`
**Lỗi**: `401` chưa đăng nhập / token không hợp lệ · `404` user không còn tồn tại.

### `PUT /api/users/me`
Cập nhật hồ sơ cá nhân (đổi tên và/hoặc đổi mật khẩu).
**Auth**: `isAuthenticated`.
**Body**
```json
{
  "fullName": "Tên mới",           // optional
  "currentPassword": "...",        // bắt buộc nếu có newPassword
  "newPassword": "min 6 ký tự"     // optional
}
```
**Response 200**: `{ success, message: "Cập nhật thông tin cá nhân thành công", data: user }`
**Lỗi**: `400` thiếu `currentPassword` khi đổi mật khẩu / sai mật khẩu hiện tại / mật khẩu mới < 6 ký tự · `404` tài khoản không hợp lệ.

---

## 3. User — Admin management (`/api/users/admin`, `isAuthenticated` + `authorize('ADMIN')`)

> Mọi hàm service **tự xác minh lại** người gọi có role `ADMIN` (phòng thủ chiều sâu, không chỉ tin middleware).

### `GET /api/users/admin`
Danh sách tài khoản, hỗ trợ lọc + phân trang.

**Query params** (tất cả optional): `page` (mặc định 1), `limit` (mặc định 10), `role`
(`ADMIN|ORGANIZER|PARTICIPANT|STAFF`), `status` (`ACTIVE|BANNED|PENDING`), `search` (khớp
`fullName` hoặc `email`, không phân biệt hoa/thường).

**Response 200**
```json
{
  "success": true,
  "message": "Tải danh sách tài khoản thành công",
  "data": [ { "_id": "...", "fullName": "...", "email": "...", "role": "...", "accountStatus": "...", ... } ],
  "meta": { "currentPage": 1, "totalPages": 3, "totalItems": 25, "itemsPerPage": 10 }
}
```
**Lỗi**: `401` chưa đăng nhập · `403` không phải ADMIN.

---

### `POST /api/users/admin/staff`
Tạo tài khoản STAFF mới (trạng thái `PENDING`, mật khẩu ngẫu nhiên 10 ký tự), gửi email chứa
credential + link kích hoạt (`{FRONTEND_URL}/activate?token=...`, hạn 7 ngày). Nếu gửi mail lỗi,
**không rollback** — user STAFF vẫn được tạo, chỉ log lỗi ra console.

**Body**: `{ "fullName": "...", "email": "..." }`
**Response 201**: `{ success, message: "Tạo tài khoản STAFF thành công và đã gửi mail kích hoạt tài khoản", data: staffUser }`
**Lỗi**: `400` thiếu field · `409` email đã tồn tại.

---

### `POST /api/users/admin/:id/role`
Đổi role của một tài khoản. **Chặn admin tự đổi role của chính mình** (tránh tự khóa quyền).

**Body**: `{ "role": "ADMIN" | "ORGANIZER" | "PARTICIPANT" | "STAFF" }`
**Response 200**: `{ success, message: "Cập nhật quyền hạn tài khoản thành công", data: user }`
**Lỗi**: `400` role không hợp lệ / tự đổi role chính mình · `404` không tìm thấy user.

---

### `POST /api/users/admin/:id/status`
Đổi trạng thái tài khoản. **Chặn admin tự khóa chính mình**.

**Body**: `{ "status": "ACTIVE" | "BANNED" }`
**Response 200**: `{ success, message: "Cập nhật trạng thái tài khoản thành công", data: user }`
**Lỗi**: `400` status không hợp lệ / tự khóa chính mình · `404` không tìm thấy user.

---

### `DELETE /api/users/admin/:id`
Xóa tài khoản. **Chặn admin tự xóa chính mình**.

**Response 200**: `{ success, message: "Xóa tài khoản thành công", data: null }`
**Lỗi**: `400` tự xóa chính mình · `404` không tìm thấy user.

---

## 4. Event (`/api/events`)

> **`GET /` và `GET /:id` cố ý public** (đọc) để phục vụ trang chủ/trang chi tiết cho khách chưa
> đăng nhập. `GET /search` và `GET /:id/detail` (EM-68, EM-72) cũng public.
> **`POST/PUT/DELETE` gắn** `isAuthenticated + authorize('ORGANIZER','ADMIN')`.
> Module `event` **không có nhánh offline mock** — bắt buộc phải kết nối MongoDB mới hoạt động.
> Chi tiết field & use-case xem [`homepage-api.md`](./homepage-api.md).

### `GET /api/events`
Danh sách sự kiện, hỗ trợ lọc + sort + phân trang. **Mặc định chỉ trả `status=published`** kể cả
không truyền `status` (bảo vệ khách vãng lai khỏi thấy draft).

**Query params** (optional): `page` (mặc định 1), `limit` (mặc định 10), `sort` (tên field, mặc
định `date`), `order` (`asc|desc`, mặc định `asc`), `status`, `category`, `categorySlug` (1 slug
hoặc nhiều slug cách nhau bởi dấu phẩy, VD `nhac-song,the-thao` — khớp filter panel multi-select),
`city` (`hcm|hanoi|dalat|other`), `isFree` (`true|false`), `search` (regex theo `title`),
`excludeId` (loại 1 id khỏi kết quả — dùng cho "sự kiện liên quan"), `dateFrom`/`dateTo` (ISO date,
lọc theo khoảng `date`, dùng cho preset "Hôm nay/Ngày mai/Cuối tuần/Tháng này" ở FE — giá trị
không parse được sẽ bị bỏ qua thay vì lỗi 500), `collection` (`featured|trending|upcoming` — alias
tiện cho trang chủ, map sang `isFeatured`/`isTrending`; `upcoming` không cần filter thêm, chỉ cần
sort mặc định theo `date asc`).

**Response 200**
```json
{
  "success": true,
  "message": "Events retrieved successfully",
  "data": [ { "_id": "...", "title": "...", "description": "...", "contentBlocks": [], "date": "...", "time": "20:00", "sessions": [], "location": "...", "city": "hcm", "maxAttendees": 100, "organizer": "...", "categorySlug": "nhac-song", "category": "...", "status": "published", "imageUrl": "...", "priceFrom": 300000, "isFree": false, "isFeatured": false, "isTrending": false, "createdAt": "...", "updatedAt": "..." } ],
  "meta": { "currentPage": 1, "totalPages": 2, "totalItems": 15, "itemsPerPage": 10 }
}
```

### `GET /api/events/search` (EM-68)
Full-text search cho thanh tìm kiếm (header) — khác `search` param của `GET /` ở chỗ khớp
**nhiều field** (`title`, `description`, `location`, `organizer`, `category`) qua `$or` thay vì chỉ
`title`. Cùng cơ chế phân trang/sort + mặc định `status=published` như `GET /`.

**Query params** (optional): `q` (từ khoá tìm kiếm, regex không phân biệt hoa/thường), `page`, `limit`,
`sort`, `order`, `category`, `categorySlug` (1 hoặc nhiều slug cách nhau bởi dấu phẩy), `city`,
`isFree`, `dateFrom`/`dateTo`.

**Response 200**: cùng shape với `GET /api/events` (`data` + `meta` phân trang).

### `GET /api/events/:id`
Chỉ trả event có `status='published'` (khác 404 nếu chưa publish, tránh lộ draft qua đoán ID).
**Response 200**: `{ success, message: "Event retrieved successfully", data: event }`
**Lỗi**: `404` không tìm thấy, chưa published, hoặc `id` không phải ObjectId hợp lệ (validate trước khi
query Mongoose nên không còn lỗi 500 do CastError).

### `GET /api/events/:id/detail` (EM-72)
Payload đầy đủ cho trang chi tiết sự kiện (`/su-kien/:id`) trong 1 lần gọi: event (chỉ
`status='published'`, cùng điều kiện 404 như `GET /:id`) + danh sách loại vé đang mở bán (exclude HIDDEN) + sự
kiện liên quan (cùng `categorySlug`, tối đa 4, sắp xếp theo `date`).

**Response 200**
```json
{
  "success": true,
  "message": "Event detail retrieved successfully",
  "data": {
    "event": { "_id": "...", "title": "...", "categorySlug": "nhac-song", "...": "..." },
    "tickets": [ { "_id": "...", "eventId": "...", "ticketName": "Vé thường", "price": 300000, "quantity": 100, "soldQuantity": 12, "status": "ACTIVE" } ],
    "related": [ { "_id": "...", "title": "...", "categorySlug": "nhac-song", "...": "..." } ]
  }
}
```
**Lỗi**: `404` không tìm thấy hoặc chưa published (giống `GET /:id`). `tickets` loại trừ loại vé
`status='HIDDEN'` (chỉ organizer thấy qua module `organizer`).

### `POST /api/events`
**Auth**: `isAuthenticated + authorize('ORGANIZER','ADMIN')`
**Body**
```json
{
  "title": "string, required",
  "description": "string, required",
  "date": "ISODate, required",
  "location": "string, required",
  "maxAttendees": "number >= 1, required",
  "organizer": "string, required (free-text)",
  "category": "string, required",
  "status": "draft|published|cancelled|completed, optional (mặc định draft)",
  "imageUrl": "string, optional"
}
```
**Response 201**: `{ success: true, message: "Created successfully", data: event }`
**Lỗi**: `400` thiếu field bắt buộc · `401` chưa đăng nhập · `403` sai role.

### `PUT /api/events/:id`
**Auth**: `isAuthenticated + authorize('ORGANIZER','ADMIN')`
Body: bất kỳ tập con field nào ở trên (partial update), chạy `runValidators: true`.
**Response 200**: `{ success, message: "Event updated successfully", data: event }`
**Lỗi**: `400` dữ liệu sai · `401` chưa đăng nhập · `403` sai role · `404` không tìm thấy.

### `DELETE /api/events/:id`
**Auth**: `isAuthenticated + authorize('ORGANIZER','ADMIN')`
**Response 200**: `{ success, message: "Event deleted successfully", data: null }`
**Lỗi**: `401` chưa đăng nhập · `403` sai role · `404` không tìm thấy.

---

## 5. Organizer — Event & Ticket Management (EM-23, EM-24, EM-128)

> **Tất cả route gắn** `isAuthenticated + authorize('ORGANIZER','ADMIN')`.
> Tạo + quản lý DRAFT event + loại vé. Event khi submit chuyển PENDING_REVIEW (chờ admin duyệt).

### `POST /api/organizer/events` (EM-23)
Tạo DRAFT event + ticket mặc định (1 loại vé free).
**Body**
```json
{
  "title": "string, required",
  "description": "string, required",
  "startDate": "ISODate, required",
  "endDate": "ISODate, optional",
  "location": "string, required",
  "capacity": "number >= 1, optional",
  "categoryId": "ObjectId, required (ref Category)",
  "banner": "string, optional (image URL)"
}
```
**Response 201**: `{ success, message: "Event created", data: { event, ticket } }`
**Lỗi**: `400` thiếu field · `401` chưa đăng nhập · `403` sai role.

### `GET /api/organizer/events`
Danh sách event của tôi (dùng `creatorId`). Hỗ trợ filter `reviewStatus` (DRAFT|PENDING_REVIEW|PUBLISHED|REJECTED).
**Query params** (optional): `page`, `limit`, `reviewStatus`.
**Response 200**: `{ success, message: "…", data: [ event ], meta: { … } }`
**Lỗi**: `401`, `403`.

### `GET /api/organizer/events/:id`
Chi tiết event của tôi (chưa publish, cho phép xem cả DRAFT/REJECTED).
**Response 200**: `{ success, data: event }`
**Lỗi**: `401`, `403`, `404`.

### `PUT /api/organizer/events/:id` (EM-24)
Sửa DRAFT event (chỉ DRAFT, không sửa được PENDING_REVIEW hoặc PUBLISHED).
**Body**: tập con của POST (partial update).
**Response 200**: `{ success, message: "Event updated", data: event }`
**Lỗi**: `400` event không phải DRAFT · `401`, `403`, `404`.

### `POST /api/organizer/events/:id/submit`
Submit event for review: DRAFT → PENDING_REVIEW.
**Response 200**: `{ success, message: "Event submitted for review", data: event }`
**Lỗi**: `400` event không phải DRAFT · `401`, `403`, `404`.

### `GET /api/organizer/events/:id/tickets`
Danh sách loại vé của event (kể cả HIDDEN).
**Response 200**: `{ success, data: [ ticket ] }`
**Lỗi**: `401`, `403`, `404`.

### `POST /api/organizer/events/:id/tickets`
Thêm loại vé mới.
**Body**: `{ ticketName, description?, price, quantity, saleStart?, saleEnd? }`
**Response 201**: `{ success, data: ticket }`
**Lỗi**: `400` dữ liệu sai · `401`, `403`, `404`.

### `PUT /api/organizer/events/:id/tickets` (EM-128)
Bulk update/create ticket (partial replacement). Rows với `_id` update, không có `_id` create,
omitted rows delete (trừ khi `soldQuantity > 0`).
**Body**: `{ tickets: [ { _id?, ticketName, price, quantity, saleStart?, saleEnd? } ] }`
**Response 200**: `{ success, message: "Tickets configured", data: [ ticket ] }`
**Lỗi**: `400` event không phải DRAFT · `401`, `403`, `404`.

### `PUT /api/organizer/events/:id/tickets/:ticketId`
Cập nhật 1 loại vé (chỉ event DRAFT).
**Body**: tập con của POST (partial update).
**Response 200**: `{ success, data: ticket }`
**Lỗi**: `400` event không phải DRAFT · `401`, `403`, `404`.

### `DELETE /api/organizer/events/:id/tickets/:ticketId`
Xóa loại vé (chỉ event DRAFT; chặn nếu `soldQuantity > 0` hoặc là loại vé cuối cùng).
**Response 200**: `{ success, message: "Ticket deleted", data: null }`
**Lỗi**: `400` event không phải DRAFT / vé đã có người mua / vé cuối cùng · `401`, `403`, `404`.

---

## 6. Category / Star / Banner (dữ liệu trang chủ)

> Chi tiết field & lý do thiết kế: [`homepage-api.md`](./homepage-api.md).

### `GET /api/categories` — public
Trả toàn bộ category sort theo `order`. `data: [{ _id, name, slug, icon, order }]`.

### `POST /api/categories` / `PUT /api/categories/:id` / `DELETE /api/categories/:id` — ADMIN
Body tạo: `{ name, slug, icon, order? }`. Lỗi: `400` thiếu field · `409` slug trùng · `404` (update/delete) không tìm thấy.

### `GET /api/stars` — public
Trả toàn bộ star sort theo `order`. `data: [{ _id, name, slug, imageUrl, verified, order }]`.

### `POST /api/stars` / `PUT /api/stars/:id` / `DELETE /api/stars/:id` — ADMIN
Body tạo: `{ name, slug, imageUrl, verified?, order? }`. Lỗi: `400` thiếu field · `409` slug trùng · `404`.

### `GET /api/banners` — public
Chỉ trả banner `isActive=true`, sort theo `order`.

### `GET /api/banners/admin` — ADMIN
Trả **toàn bộ** banner (kể cả inactive), dùng cho trang quản trị.

### `POST /api/banners` / `PUT /api/banners/:id` / `DELETE /api/banners/:id` — ADMIN
Body tạo: `{ title, subtitle?, imageUrl, ctaLabel?, linkUrl?, eventId?, order?, isActive? }`. Lỗi: `400` thiếu field · `404`.

---

## 7. Registration — Event booking (`/api/registrations`, EM-76)

> Toàn bộ route yêu cầu `isAuthenticated` + `authorize('PARTICIPANT')` — chỉ participant mới được
> đặt vé (organizer/staff/admin bị chặn 403). Chưa có VNPAY thật: flow dùng **giữ chỗ 10 phút**
> (`holdExpiresAt`) rồi xác nhận thanh toán qua endpoint mock riêng — xem `docs/business.md` §8.
> `status` mở rộng thêm `PENDING`/`EXPIRED` so với enum gốc trong SDS (`PAID|CANCELLED|REFUNDED`)
> để biểu diễn trạng thái chờ thanh toán.

### `POST /api/registrations`
Giữ chỗ `quantity` vé của một `ticketId` thuộc `eventId` (phải `published` và ticket `ACTIVE`,
trong khung `saleStart`/`saleEnd` nếu có). Trừ tồn kho `Ticket.soldQuantity` **ngay khi giữ chỗ**
(atomic, chống oversell khi nhiều request cùng tranh vé cuối) — chỉ tạo `Registration` sau khi
trừ kho thành công.

**Body**: `{ "eventId": "...", "ticketId": "...", "quantity": 1 }`
**Response 201**: `{ success, message: "Giữ chỗ thành công, vui lòng thanh toán trong 10 phút", data: registration }`
(`registration.status = "PENDING"`, `holdExpiresAt` = now + 10 phút)
**Lỗi**: `400` thiếu field/quantity không hợp lệ/vé ngoài khung bán · `404` event chưa published
hoặc ticket không thuộc event · `409` không đủ vé còn lại.

### `POST /api/registrations/:id/confirm-payment`
Xác nhận thanh toán (**mock** — chưa gọi VNPAY thật), chuyển `PENDING → PAID` và tạo 1 `Payment`
(`paymentMethod: "MOCK"`). Tồn kho **không** trừ lại ở bước này (đã trừ từ lúc giữ chỗ).

**Response 200**: `{ success, message: "Xác nhận thanh toán thành công", data: { registration, payment } }`
**Lỗi**: `400` registration không ở trạng thái `PENDING` · `404` không tìm thấy (hoặc không phải
chủ sở hữu) · `410` hết hạn giữ chỗ (tự động chuyển sang `EXPIRED` + nhả tồn kho).

### `POST /api/registrations/:id/cancel`
Hủy đăng ký đang `PENDING` hoặc `PAID`, nhả lại tồn kho vé đã trừ. Hủy vé `PAID` **không** tự
hoàn tiền (đó là luồng `Withdrawal`/refund riêng, chưa thuộc phạm vi này).

**Response 200**: `{ success, message: "Hủy đăng ký thành công", data: registration }` (`status: "CANCELLED"`)
**Lỗi**: `400` registration không ở trạng thái hủy được · `404` không tìm thấy/không phải chủ sở hữu.

### `GET /api/registrations/me`
Danh sách đăng ký của chính participant đang đăng nhập (dữ liệu nguồn cho "Vé của tôi"), phân
trang. Tự động dọn các hold quá hạn (chuyển `EXPIRED` + nhả tồn kho) trước khi trả kết quả.

**Query params**: `page` (mặc định 1), `limit` (mặc định 10).
**Response 200**: `{ success, message, data: registration[], meta: pagination }`

### `GET /api/registrations/:id`
Chi tiết 1 đăng ký — chỉ chủ sở hữu mới xem được.
**Response 200**: `{ success, message, data: registration }`
**Lỗi**: `404` không tìm thấy hoặc không phải chủ sở hữu (không phân biệt 2 trường hợp, tránh dò `id`).

---

## 8. Bảng tổng hợp nhanh

| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/api/health` | Không | — |
| POST | `/api/users/otp/send` | Không | — |
| POST | `/api/users/register` | Không | — |
| POST | `/api/users/login` | Không | — |
| POST | `/api/users/google` | Không | — |
| POST | `/api/users/logout` | Không | — |
| POST | `/api/users/activate` | Không (token trong body) | — |
| GET | `/api/users/me` | Có | any |
| PUT | `/api/users/me` | Có | any |
| GET | `/api/users/admin` | Có | ADMIN |
| POST | `/api/users/admin/staff` | Có | ADMIN |
| POST | `/api/users/admin/:id/role` | Có | ADMIN |
| POST | `/api/users/admin/:id/status` | Có | ADMIN |
| DELETE | `/api/users/admin/:id` | Có | ADMIN |
| GET | `/api/events` | Không (cố ý public, mặc định `status=published`) | — |
| GET | `/api/events/search` | Không (public) | — |
| GET | `/api/events/:id` | Không (cố ý public, chỉ `published`) | — |
| GET | `/api/events/:id/detail` | Không (public) | — |
| POST | `/api/events` | Có | ORGANIZER\|ADMIN |
| PUT | `/api/events/:id` | Có | ORGANIZER\|ADMIN |
| DELETE | `/api/events/:id` | Có | ORGANIZER\|ADMIN |
| GET | `/api/categories` | Không | — |
| POST/PUT/DELETE | `/api/categories...` | Có | ADMIN |
| GET | `/api/stars` | Không | — |
| POST/PUT/DELETE | `/api/stars...` | Có | ADMIN |
| GET | `/api/banners` | Không | — |
| GET | `/api/banners/admin` | Có | ADMIN |
| POST/PUT/DELETE | `/api/banners...` | Có | ADMIN |
| POST | `/api/registrations` | Có | PARTICIPANT |
| GET | `/api/registrations/me` | Có | PARTICIPANT |
| GET | `/api/registrations/:id` | Có | PARTICIPANT |
| POST | `/api/registrations/:id/confirm-payment` | Có | PARTICIPANT |
| POST | `/api/registrations/:id/cancel` | Có | PARTICIPANT |

---

## 9. Ghi chú cho FE khi kick-off

1. Luôn gửi request với `credentials: 'include'` (fetch) hoặc `withCredentials: true` (axios) để cookie `token` được đính kèm.
2. Không cần tự quản lý header `Authorization` trừ khi test qua Postman/curl (khi đó dùng `Bearer <token>` lấy từ `data.token` sau login/register).
3. Phân trang trả trong `meta`, không phải `data.pagination` — field: `currentPage, totalPages, totalItems, itemsPerPage`.
4. Object user trả về **không bao giờ chứa `passwordHash`**.
5. `event.organizer` hiện là chuỗi tự do, chưa liên kết với `User._id` — nếu FE cần hiển thị theo tài khoản organizer thật, cần backend bổ sung ref (xem câu hỏi mở trong `backend-logic.md`).
6. Event API hiện chưa có phân quyền cho thao tác ghi (`POST/PUT/DELETE`) — FE có thể gọi thẳng nhưng backend cần sớm bổ sung auth trước khi go-live. Thao tác đọc (`GET`) đã cố ý để public.
7. Trang chủ/trang khám phá/trang chi tiết sự kiện: xem đầy đủ mapping mock data → API thật, seed script, và checklist swap FE tại [`homepage-api.md`](./homepage-api.md).
