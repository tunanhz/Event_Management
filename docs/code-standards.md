# Code Standards — Event Management (EventBox)

> Cập nhật: 2026-06-30 · Branch: `develop`
> Tài liệu mô tả **quy ước đang được áp dụng** trong codebase, để code mới đồng bộ với code cũ.
> Đọc kèm [`codebase-summary.md`](./codebase-summary.md) và [`system-architecture.md`](./system-architecture.md).

## 1. Nguyên tắc chung

- Tuân thủ **YAGNI · KISS · DRY**.
- **TypeScript** xuyên suốt cả frontend lẫn backend.
- Giữ file < ~200 dòng; tách module khi vượt. Một số trang dashboard hiện vượt mức này
  (`accounts/page.tsx`) — ưu tiên tách khi có dịp sửa.
- Comment giải thích **"tại sao"**, không nhắc tới số phase/mã finding của kế hoạch.

## 2. Quy ước đặt tên file

| Ngữ cảnh | Quy ước | Ví dụ |
|----------|---------|-------|
| Backend module | `dot.case` theo vai trò tầng | `user.service.ts`, `event.repository.ts` |
| Backend util/middleware | camelCase hoặc PascalCase theo nội dung export | `asyncHandler.ts`, `ApiResponse.ts`, `auth.middleware.ts` |
| Frontend page (App Router) | thư mục route + `page.tsx`/`layout.tsx` | `app/dashboard/accounts/page.tsx` |
| Frontend component | **PascalCase** | `EventCard.tsx`, `Sidebar.tsx` |
| CSS Module | `Component.module.css` | `EventCard.module.css` |
| Frontend lib/util | kebab-case hoặc camelCase | `client-api.ts`, `mock-data.ts`, `utils.ts` |

> Lưu ý: hiện tồn tại cả `mockData.ts` và `mock-data.ts`. Khi thêm mock mới, chọn **một**
> quy ước (đề xuất: kebab-case) và dần hợp nhất để tránh trùng lặp.

## 3. Backend — quy ước

### 3.1 Phân tầng (bắt buộc)
`routes → controller → service → repository → model`. Không gọi vượt tầng (vd controller
không truy cập Mongoose trực tiếp). Mỗi module export qua `index.ts`.

### 3.2 Controller
- Là **class**, khởi tạo service trong constructor; mỗi handler là **arrow property** bọc
  trong `asyncHandler` để tự bắt lỗi async:
  ```ts
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.getAll(req.query);
    res.json(ApiResponse.ok(result.data, 'message', result.pagination));
  });
  ```
- Không chứa nghiệp vụ — chỉ đọc input, gọi service, trả `ApiResponse`.
- Dùng `AuthRequest` (thay vì `Request`) cho route cần `req.user`.

### 3.3 Service
- Là **class**; chứa toàn bộ nghiệp vụ + kiểm tra quyền/ràng buộc.
- Báo lỗi bằng **`throw new AppError(message, statusCode)`** — không tự `res.status()`.
- Không bao giờ trả `passwordHash` cho client (xóa khỏi object trước khi return).
- Thông điệp lỗi hướng người dùng cuối viết **tiếng Việt** (đồng bộ với code hiện tại).

### 3.4 Repository
- Đóng gói truy cập dữ liệu; với module có offline mode phải rẽ nhánh `isDbConnected`
  (Mongoose ↔ mock store) — xem `user.repository.ts`.
- Đọc nhiều dùng `.lean()`; auth cần document method thì lấy document đầy đủ
  (`findByEmailForAuth` + `.select('+passwordHash')`).
- Trả về `PaginatedResult<T>` với khối `pagination` chuẩn cho truy vấn danh sách.

### 3.5 Model (Mongoose)
- Khai báo `interface I<Name> extends Document` cùng file với schema.
- Bật `{ timestamps: true }`. Đặt index hợp lý (vd `email`, `{date,status}`).
- Logic gắn với dữ liệu (hash, compare) đặt ở hook/method của schema.

### 3.6 Response & lỗi
- **Luôn** dùng `ApiResponse.ok / .created / .error`. Không trả object JSON tùy ý.
- Phân trang đặt vào tham số `meta` (frontend đọc `res.meta`).
- `errorHandler` là nơi duy nhất biến lỗi thành HTTP response; stack chỉ lộ ở `development`.

### 3.7 Cấu hình
- Mọi biến môi trường đọc qua `config/index.ts` — **không** đọc `process.env` rải rác
  (ngoại lệ hiện có: vài chỗ check `process.env.NODE_ENV` cho cookie `secure`).
- **Không commit secret.** `.env` phải nằm trong `.gitignore`; cập nhật `.env.example` khi
  thêm biến mới.

## 4. Frontend — quy ước

### 4.1 Server vs Client Components
- Mặc định ưu tiên **Server Component** (RSC) để fetch dữ liệu/SEO; chỉ thêm `"use client"`
  khi cần state/hook/sự kiện (form, modal, context).
- **Server Component** dùng `lib/api.ts`; **Client Component** dùng `lib/client-api.ts`
  (đã `credentials: "include"` để gửi cookie). Không gọi `fetch` thẳng tới backend trong
  client (phá vỡ cùng-origin/cookie).

### 4.2 State & auth
- Truy cập user qua `useAuth()` (AuthContext) — không tự gọi `/users/me` rời rạc.
- Phân quyền UI dựa trên `user.role`, nhưng **luôn coi backend là chốt chặn bảo mật thật**.

### 4.3 Styling
- **Trang chủ** (`components/home/*`): CSS Modules + design tokens.
- **Dashboard/auth**: Tailwind v4 + CSS custom properties (`var(--foreground)`,
  `var(--muted-foreground)`, `var(--border)`...). Ghép class có điều kiện bằng `cn()`
  (`clsx` + `tailwind-merge`) trong `lib/utils.ts`.
- Icon dùng `lucide-react`. Biểu đồ dùng `recharts`.

### 4.4 Format & locale
- Dùng helper trong `lib/utils.ts` (`formatCurrency`, `formatNumber`, `formatDate`,
  `formatDateTime`) thay vì format thủ công, để tránh lệch hydration SSR và đồng nhất locale `vi-VN`.

### 4.5 Component pattern
- Component PascalCase, export named hoặc default nhất quán theo file.
- UI dùng lại đặt trong `components/ui/*` (Button, Card, badge, Spinner) — ưu tiên dùng lại
  trước khi tạo mới.

## 5. Bất biến & quy tắc nghiệp vụ cần giữ

- Admin **không** tự khóa / đổi-role / xóa chính mình.
- Chỉ tạo `ADMIN` đầu tiên qua self-register (admin bootstrap); `STAFF` chỉ do ADMIN tạo.
- Mật khẩu luôn hash bcrypt; OTP hết hạn sau 5 phút.
- Mọi route ghi/nhạy cảm phải qua `isAuthenticated` (+ `authorize` nếu giới hạn role).
  **Hiện event routes chưa tuân thủ — cần bổ sung.**

## 6. Git & commit

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`...
- Không đưa tham chiếu AI vào commit message.
- Lint trước commit (`npm run lint`); không commit secret/dotenv.
- Commit tập trung vào thay đổi thực tế, mô tả rõ ràng.

## 7. Lệnh kiểm tra

| Việc | Backend | Frontend |
|------|---------|----------|
| Dev | `npm run dev` (tsx watch) | `npm run dev` (next dev) |
| Build | `npm run build` (tsc) | `npm run build` (next build) |
| Lint | `npm run lint` (eslint) | `npm run lint` (eslint) |

Sau khi sửa code TS, chạy build/lint để chắc không có lỗi biên dịch trước khi bàn giao.

## 8. Câu hỏi chưa giải quyết

- Thống nhất một quy ước đặt tên file lib (kebab-case?) và hợp nhất `mockData.ts` / `mock-data.ts`.
- Có thêm Prettier + cấu hình ESLint nghiêm hơn (rule chung 2 package) không?
- Bổ sung khung test (Jest/Vitest + Playwright) — chưa có ở thời điểm hiện tại.
