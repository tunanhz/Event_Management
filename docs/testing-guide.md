# Testing Guide

Hướng dẫn chạy và mở rộng test suite của Event Management (backend Express + frontend Next.js).

## Hiện trạng

| | Suites | Tests |
|---|---|---|
| Backend | 24 | 794 |
| Frontend | 25 | 901 |
| **Tổng** | **49** | **1.695** |

Toàn bộ đang pass. Không có test nào bị skip / `it.todo`.

### Phạm vi backend

| Nhóm | Nội dung |
|------|----------|
| `common/utils` | ApiResponse, AppError, jwt, query-params, asyncHandler |
| `common/middleware` | errorHandler (AppError / Mongoose ValidationError / CastError / duplicate key / unknown), auth middleware (cookie vs Bearer, token hỏng, user đã xoá, tài khoản BANNED, phân quyền theo role) |
| `modules/user` | OTP, đăng ký, đăng nhập, Google OAuth, logout, `/me`, quản trị tài khoản (role, status, xoá, tạo STAFF) |
| `modules/content` | category, star, banner — public đọc + admin ghi |
| `modules/event` | listing công khai, search, detail, và các trường discovery suy diễn (`city`, `sessions`, `priceFrom`, `isFree`) |
| `modules/organizer` | validation wizard (nhánh sâu nhất), discovery derive, CRUD sự kiện, CRUD vé, gửi duyệt |
| `modules/payment` | ký/verify chữ ký VNPAY, tạo URL thanh toán, callback return/IPN |
| `modules/registration` | đặt vé, giới hạn số lượng/tồn kho, cách ly dữ liệu giữa user, huỷ |
| `modules/admin` | duyệt/từ chối sự kiện, quản lý vé, ma trận phân quyền |
| `modules/staff` | phân công, check-in, sự cố |

### Phạm vi frontend

| Nhóm | Nội dung |
|------|----------|
| `lib` | format ngày/tiền/trạng thái, booking-selection, api client, discovery api, hook `use-saved-events` + `use-notifications` (localStorage, đồng bộ đa tab, dữ liệu hỏng) |
| `components/events` | filter-events (preset ngày, lọc tổ hợp, sắp xếp), toolbar, filter panel |
| `components/event-detail` | format ngày, SectionCard, EventIntro, EventSchedule |
| `components/organizer` | validation wizard phía client, map event → form, api tạo sự kiện, ConfirmDialog |
| `components/booking` | format ngày/giờ suất, SelectTicketsView (tăng/giảm số lượng, chạm trần, tổng tiền) |
| `components/account` | ProfileInfoForm, ChangePasswordForm |
| `components/staff`, `notifications`, `auth` | data helper, RoleGuard |

## TL;DR

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

Mỗi lần chạy sẽ ghi đè HTML report tương ứng trong `docs/test/`.

## Scripts

Cả `backend/` và `frontend/` đều có bộ script giống nhau:

| Script | Mục đích |
|--------|----------|
| `npm test` | Chạy toàn bộ suite + sinh HTML report |
| `npm run test:watch` | Watch mode khi đang code |
| `npm run test:coverage` | Kèm báo cáo coverage (`coverage/`, đã gitignore) |
| `npm run test:report` | Chạy im lặng, chỉ để sinh report |

Chạy một phần:

```bash
cd backend  && npx jest src/__tests__/modules/user --runInBand --reporters=default
cd frontend && npx jest src/__tests__/lib --reporters=default
```

`--reporters=default` bỏ qua bước ghi HTML — nên dùng khi chạy cục bộ để không ghi đè report chung.
`--runInBand` cho backend giúp giới hạn số mongod chạy song song.

## Output

| File | Nguồn |
|------|-------|
| `docs/test/test-report-BE.html` | `backend/jest.config.js` |
| `docs/test/test-report-FE.html` | `frontend/jest.config.ts` |

Cả hai dùng `jest-html-reporter`. Report được commit vào repo như một artifact bàn giao.

## Backend

**Stack:** Jest 30 + ts-jest + supertest + mongodb-memory-server

| File | Vai trò |
|------|---------|
| `backend/jest.config.js` | Config chính, map path alias `@/`, `@modules/`… |
| `backend/tsconfig.test.json` | tsconfig riêng cho test (`ignoreDeprecations` cho TS 6) |
| `src/__tests__/setup/env.setup.ts` | Pin toàn bộ env (JWT, VNPAY, SMTP) — test không phụ thuộc `.env` máy dev |
| `src/__tests__/setup/in-memory-database.ts` | Vòng đời MongoDB in-memory |
| `src/__tests__/setup/auth-test-helpers.ts` | Seed user theo role + token/cookie |

### Không cần MongoDB thật

`mongodb-memory-server` tự spawn một mongod tạm cho mỗi suite. Không cần cài MongoDB, không đụng tới DB dev.

### Lưu ý quan trọng: cờ `isDbConnected`

`src/config/database.ts` export biến `isDbConnected`. Khi kết nối MongoDB thất bại, app **tự động fallback sang mock store trong RAM** — `user.repository.ts` và `user.service.ts` rẽ nhánh theo cờ này ở khoảng 20 chỗ.

Test kết nối thẳng tới mongod tạm chứ không gọi `connectDatabase()`, nên cờ sẽ mặc định là `false` và **toàn bộ integration test sẽ âm thầm chạy nhánh mock thay vì nhánh Mongoose thật**. Vì vậy `connectInMemoryDatabase()` chủ động set cờ này `true` (và reset `false` khi teardown).

Đây là lý do file setup phải được dùng thay vì tự `mongoose.connect` trong từng suite.

### Mẫu một integration suite

```ts
import request from 'supertest';
import app from '../../app';
import {
  connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase,
} from '../setup/in-memory-database';
import { createAuthedUser } from '../setup/auth-test-helpers';

describe('Example Routes', () => {
  beforeAll(connectInMemoryDatabase);
  afterEach(clearDatabase);
  afterAll(closeInMemoryDatabase);

  it('should reject an unauthenticated caller', async () => {
    const res = await request(app).get('/api/example');
    expect(res.status).toBe(401);
  });

  it('should allow an ADMIN', async () => {
    const admin = await createAuthedUser('ADMIN');
    const res = await request(app).get('/api/example').set('Cookie', admin.cookie);
    expect(res.status).toBe(200);
  });
});
```

`createAuthedUser(role)` trả về `{ user, id, token, cookie, password }`. Role hợp lệ: `ADMIN | ORGANIZER | PARTICIPANT | STAFF`.

### Side effect ra ngoài

Mock ở ranh giới module, không bao giờ gọi thật:

- Email → `jest.mock('../../common/utils/email.service')`
- Google OAuth → mock `OAuth2Client.verifyIdToken`
- VNPAY → không mock; ký chữ ký thật bằng `signParams` với secret test trong `env.setup.ts`

## Frontend

**Stack:** Jest 30 + next/jest + React Testing Library 16 + jsdom

| File | Vai trò |
|------|---------|
| `frontend/jest.config.ts` | Dùng `next/jest` (SWC transform, CSS Modules stub, alias `@/`) |
| `frontend/jest.setup.ts` | jest-dom matchers + stub `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo` |

### Quy ước

- Query theo accessible role/label (`getByRole('button', { name: '…' })`), tránh bám vào class hoặc DOM structure.
- Khi text xuất hiện nhiều nơi (giá vé hiện ở cả dòng vé lẫn sidebar tổng), dùng `within(...)` để khoanh vùng — **không** dùng `getAllByText(...)[0]` để né lỗi ambiguous.
- Tương tác qua `userEvent`, không phải `fireEvent`.
- `fetch` luôn stub bằng `global.fetch = jest.fn()`, reset trong `beforeEach`.
- Mock `next/navigation` khi component dùng `useRouter` / `useSearchParams`.
- Server Component bất đồng bộ không render được trong jsdom — test phần logic thuần tách rời, hoặc test client component con.

## Nguyên tắc viết test

1. **Đọc source trước khi viết.** Assert hành vi thật, không assert hành vi phỏng đoán.
2. **Không test giả.** Không `it.todo`, không skip, không assertion luôn đúng kiểu `expect(x).toBeTruthy()` đứng một mình.
3. **Không nới assertion để pass.** Test đỏ nghĩa là đọc lại source, không phải hạ tiêu chuẩn.
4. **Không sửa code app để test dễ pass.** Phát hiện bug thì báo cáo, không tự vá trong lúc viết test.
5. **Ngày giờ phải xác định.** Dùng offset từ `Date.now()` hoặc `jest.useFakeTimers().setSystemTime(...)` (nhớ `useRealTimers()` khi cleanup). Với ngày local, assert qua getter local thay vì `toISOString()` để không vỡ theo timezone.
6. **Mỗi test tự lập.** Backend `clearDatabase()` sau mỗi test; frontend dọn `localStorage` và mock.

## Thêm test mới

Đặt file theo cấu trúc gương của source:

```
backend/src/__tests__/modules/<module>/<feature>-routes.test.ts
backend/src/__tests__/common/<utils|middleware>/<name>.test.ts
frontend/src/__tests__/lib/<name>.test.ts
frontend/src/__tests__/components/<area>/<name>.test.tsx
```

Đặt tên kebab-case, `describe` lồng theo tầng (module → endpoint/function → case), `it('should …')`.
