# Convention — Event Management (EventBox)

> Cập nhật: 2026-06-30 · Branch: `develop`
> Quy ước **thực hành** cho cả team, dùng làm checklist khi viết code mới. Phần giải thích sâu
> xem [`be/backend-logic.md`](./be/backend-logic.md), [`fe/frontend-logic.md`](./fe/frontend-logic.md),
> [`code-standards.md`](./code-standards.md).

## 0. Nguyên tắc nền
**YAGNI · KISS · DRY**. TypeScript toàn bộ. File ≤ ~200 dòng (tách khi vượt). Comment giải
thích **"tại sao"**, không nhắc số phase/mã kế hoạch trong code.

---

## 1. Cấu trúc thư mục docs

```
docs/
├── codebase-summary.md        # tổng quan codebase
├── system-architecture.md     # kiến trúc + sơ đồ + API contract
├── code-standards.md          # chuẩn code chi tiết
├── convention.md              # ← file này (quy ước thực hành)
├── be/
│   └── backend-logic.md       # logic backend chi tiết
└── fe/
    └── frontend-logic.md      # logic frontend chi tiết
```

> Tài liệu logic mới của **backend** đặt trong `docs/be/`, của **frontend** trong `docs/fe/`.

---

## 2. Quy ước đặt tên

| Ngữ cảnh | Quy ước | Ví dụ |
|----------|---------|-------|
| Backend module file | `dot.case` theo tầng | `user.service.ts`, `event.repository.ts` |
| Backend util / middleware | theo nội dung export (camel/Pascal) | `asyncHandler.ts`, `ApiResponse.ts`, `auth.middleware.ts` |
| FE page (App Router) | thư mục route + `page.tsx`/`layout.tsx` | `app/dashboard/accounts/page.tsx` |
| FE component | **PascalCase** | `EventCard.tsx`, `Sidebar.tsx` |
| CSS Module | `Component.module.css` | `EventCard.module.css` |
| FE lib / helper | kebab-case (ưu tiên) | `client-api.ts`, `mock-data.ts` |
| Biến/hàm | camelCase · Class/Type/Interface PascalCase · hằng UPPER_SNAKE | — |
| Docs/markdown | kebab-case mô tả | `frontend-logic.md` |

> ⚠️ Đang tồn tại `mockData.ts` + `mock-data.ts`. Quy ước mới: **kebab-case**; dần hợp nhất.

---

## 3. Quy ước Backend

- **Phân tầng bắt buộc**: `routes → controller → service → repository → model`. Không vượt tầng.
- **Controller**: class + handler bọc `asyncHandler`; chỉ điều phối, trả `ApiResponse`. Route
  cần user dùng `AuthRequest`.
- **Service**: chứa nghiệp vụ; báo lỗi bằng `throw new AppError(msg, statusCode)` (không
  `res.status()`); không trả `passwordHash`.
- **Repository**: bọc truy cập dữ liệu; module có offline mode phải rẽ nhánh `isDbConnected`.
  Đọc nhiều dùng `.lean()`.
- **Model**: `interface I<Name> extends Document` + `{ timestamps: true }` + index hợp lý;
  hook/method gắn dữ liệu đặt ở schema.
- **Response**: luôn `ApiResponse.ok/created/error`; phân trang vào field `meta`.
- **Lỗi**: tập trung ở `errorHandler`; `stack` chỉ lộ `development`.
- **Cấu hình/secret**: đọc qua `config`; **không** commit `.env`; cập nhật `.env.example` khi
  thêm biến.
- **Bảo mật**: route ghi/nhạy cảm phải qua `isAuthenticated` (+ `authorize`); hàm admin tự
  xác minh `ADMIN` ở service.

## 4. Quy ước Frontend

- **RSC mặc định**; chỉ `"use client"` khi cần state/hook/sự kiện.
- **Gọi API**: Server Component → `lib/api.ts`; Client Component → `lib/client-api.ts`
  (`credentials:"include"`). **Không** fetch thẳng backend trong client.
- **Auth/user**: luôn qua `useAuth()`; phân quyền UI theo `role` nhưng backend mới là chốt thật.
- **Styling**: trang chủ = CSS Modules; dashboard/auth = Tailwind v4 + CSS tokens
  (`var(--foreground)`...); ghép class bằng `cn()`.
- **Format**: dùng helper `lib/utils.ts` (`formatCurrency/formatNumber/formatDate`) — tránh
  lệch hydration, locale `vi-VN`.
- **Tái sử dụng**: ưu tiên component trong `components/ui/*` trước khi tạo mới.
- **Thông điệp người dùng**: tiếng Việt, đồng bộ giọng văn hiện có.

## 5. Git & commit

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
- Không nhắc AI trong commit message; commit gọn, đúng phạm vi thay đổi.
- Lint trước commit; test trước push (không bỏ qua test để build pass).
- **Không** commit secret/dotenv.

## 6. Trước khi bàn giao (checklist)

- [ ] Build/lint sạch (`npm run build`, `npm run lint`) cả FE/BE liên quan.
- [ ] Route mới có bảo vệ auth/role đúng mức.
- [ ] Response qua `ApiResponse`, lỗi qua `AppError`.
- [ ] Không lộ secret, không trả `passwordHash`.
- [ ] Cập nhật doc liên quan trong `docs/` (be/ hoặc fe/).

## 7. Câu hỏi chưa giải quyết

- Có thêm Prettier + cấu hình ESLint dùng chung 2 package không?
- Hợp nhất `mockData.ts`/`mock-data.ts` theo kebab-case khi nào?
- Khung test (Vitest/Jest + Playwright) — chưa có; thời điểm bổ sung?
