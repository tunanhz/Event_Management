# Homepage — Database & API Reference

> Cập nhật: 2026-07-02 · Branch: `develop`
> Tài liệu mô tả DB schema + API **public (không cần đăng nhập)** phục vụ trang chủ
> (`frontend/src/app/page.tsx`) và các trang liên quan (`/su-kien`, `/su-kien/[id]`) — hiện FE
> đang dùng dữ liệu fix cứng ở `frontend/src/lib/mockData.ts`, tài liệu này định nghĩa phần
> backend tương ứng để sau này swap sang gọi API thật. Đọc kèm
> [`api-reference.md`](./api-reference.md), [`backend-logic.md`](./backend-logic.md).

## 1. Vì sao cần các model mới

`mockData.ts` phục vụ trang chủ cần 4 nhóm dữ liệu mà module `event` (bản cũ) không đủ:

| Mock data | Nhu cầu | Model mới/mở rộng |
|---|---|---|
| `featuredEvents/trendingEvents/upcomingEvents/exploreEvents` | Sự kiện + filter theo `city`, `categorySlug`, `isFree`, cờ nổi bật/xu hướng | **Mở rộng `Event`** |
| `categories` | Danh mục cho nav & filter panel | **`Category`** (mới) |
| `featuredStars` | Carousel "Nghệ sĩ / đơn vị nổi bật" | **`Star`** (mới) |
| `banners` | Hero banner carousel | **`Banner`** (mới) |
| `getEventDetail()` (showDates, description blocks, organizer) | Trang chi tiết sự kiện | **Mở rộng `Event`** (`sessions`, `contentBlocks`, `organizer*`) |

Tất cả thay đổi trên `Event` đều là **cộng thêm field**, không xóa/đổi kiểu field cũ → không phá vỡ
dữ liệu/API hiện có (đã verify bằng `tsc --noEmit`).

---

## 2. Schema

### 2.1 `Event` (mở rộng) — `backend/src/modules/event/event.model.ts`

Field cũ giữ nguyên: `title, description, date, location, maxAttendees, organizer, category,
status, imageUrl, createdAt, updatedAt`.

Field mới:

| Field | Kiểu | Ghi chú |
|---|---|---|
| `contentBlocks` | `{type: 'heading'\|'paragraph'\|'list', text?, items?}[]` | Nội dung mô tả chi tiết dạng block (map trực tiếp `ContentBlock` phía FE) |
| `time` | `string?` | Giờ hiển thị (VD `"20:00"`), tách khỏi `date` để dễ format |
| `sessions` | `{date: Date, time?: string, label?: string}[]` | Các suất diễn phụ (sự kiện lặp lại nhiều ngày/suất). `date` gốc luôn là suất đầu tiên/gần nhất |
| `city` | `'hcm'\|'hanoi'\|'dalat'\|'other'` | Phục vụ filter địa điểm ở `/su-kien` |
| `organizerLogoUrl` | `string?` | Logo đơn vị tổ chức (trang chi tiết) |
| `organizerDescription` | `string?` | Mô tả đơn vị tổ chức |
| `organizerId` | `ObjectId ref User?` | Optional — chỉ set khi đơn vị tổ chức là tài khoản ORGANIZER đã đăng ký; nhiều organizer (ca sĩ, phòng trà...) chưa có tài khoản nên **không bắt buộc** |
| `categorySlug` | `string` (required) | Khớp `Category.slug` (không dùng ràng buộc FK cứng, tương tự cách `category` hiện tại đang là free-text) |
| `priceFrom` | `number` (default 0) | Giá vé thấp nhất (VNĐ). FE tự format `"Từ 300.000đ"` / `"Miễn phí"` |
| `isFree` | `boolean` (default false) | |
| `isFeatured` | `boolean` (default false) | Cờ biên tập — quyết định xuất hiện ở collection `featured` |
| `isTrending` | `boolean` (default false) | Cờ biên tập — quyết định xuất hiện ở collection `trending` |

> **Quyết định thiết kế**: `featured`/`trending` là cờ do admin/organizer đặt tay (giống cách
> Ticketbox/Eventbrite thường để BTV chọn), **không** tính tự động theo lượt xem/vé bán (chưa có
> hệ thống analytics). Collection `upcoming` **không cần cờ riêng** — chỉ là query
> `status=published` sắp theo `date` tăng dần.

### 2.2 `Category` (mới) — `backend/src/modules/category/category.model.ts`
`name, slug (unique), icon, order` + timestamps.

### 2.3 `Star` (mới) — `backend/src/modules/star/star.model.ts`
`name, slug (unique), imageUrl, verified, order` + timestamps. Đại diện nghệ sĩ/đơn vị nổi bật
hiển thị ở carousel trang chủ — **độc lập** với `User`/tài khoản ORGANIZER vì phần lớn nghệ sĩ
hiển thị không có tài khoản trên hệ thống.

### 2.4 `Banner` (mới) — `backend/src/modules/banner/banner.model.ts`
`title, subtitle?, imageUrl, ctaLabel?, linkUrl?, eventId? (ref Event), order, isActive` + timestamps.

---

## 3. API — Public (không cần đăng nhập)

Tất cả endpoint dưới đây **public**, dùng được ngay khi chưa đăng nhập, đúng yêu cầu "người dùng
chưa đăng nhập vẫn xem được sự kiện/chi tiết sự kiện".

### `GET /api/categories`
Trả toàn bộ category, sort theo `order`. Dùng cho nav + filter panel.
```json
{ "success": true, "message": "Categories retrieved successfully", "data": [{ "_id", "name", "slug", "icon", "order" }] }
```

### `GET /api/stars`
Trả toàn bộ star, sort theo `order`. Dùng cho carousel "Nghệ sĩ nổi bật".

### `GET /api/banners`
Trả banner có `isActive=true`, sort theo `order`. Dùng cho hero banner carousel.
(Có route riêng `GET /api/banners/admin` — yêu cầu ADMIN — trả **toàn bộ** banner kể cả inactive, dùng cho trang quản trị sau này.)

### `GET /api/events` (đã có, mở rộng thêm filter)
**Mặc định chỉ trả `status=published`** kể cả khi không truyền `status` — đảm bảo khách chưa đăng
nhập không bao giờ thấy sự kiện `draft`/`cancelled`.

Query params mới, tất cả optional:
| Param | Ví dụ | Ý nghĩa |
|---|---|---|
| `categorySlug` | `nhac-song` hoặc `nhac-song,the-thao` | Lọc theo danh mục (khớp `Category.slug`); nhận nhiều slug cách nhau bởi dấu phẩy — khớp `Filters.categories: string[]` (multi-select) ở `FilterPanel` FE |
| `city` | `hcm` | Lọc theo thành phố — khớp `Filters.city` (single-select) ở FE |
| `isFree` | `true` | Chỉ sự kiện miễn phí — khớp `Filters.free` ở FE |
| `dateFrom`, `dateTo` | `2026-07-05`, `2026-07-06` | Lọc theo khoảng `date` (inclusive) — BE tương đương cho các preset `DateMode` (`today/tomorrow/weekend/month/date`) mà FE tính range ở `presetRange()` trong `filter-events.ts` rồi gửi lên; giá trị không parse được sẽ bị **bỏ qua** (không lỗi 500) |
| `search` | `jazz` | Tìm theo `title` (regex, không phân biệt hoa/thường) |
| `excludeId` | `<eventId>` | Loại trừ 1 event khỏi kết quả — dùng cho khối "Sự kiện liên quan" ở trang chi tiết |
| `collection` | `featured` \| `trending` \| `upcoming` | Alias tiện dụng cho trang chủ: `featured`→`isFeatured=true`, `trending`→`isTrending=true`, `upcoming`→ không thêm filter (chỉ cần sort `date asc`, mặc định) |

> Bốn param `categorySlug` (multi), `city`, `isFree`, `dateFrom/dateTo` cùng nhau map **1-1** với
> state `Filters` + `DateFilter` hiện có ở `frontend/src/components/events/events-types.ts` —
> khi swap FE sang gọi API thật, `applyFilters()` (lọc client-side trong `filter-events.ts`) có
> thể bỏ hoàn toàn, chỉ cần build query string từ state rồi gọi `GET /api/events`.

Ví dụ dùng cho 3 khối trang chủ:
```
GET /api/events?collection=featured&limit=4
GET /api/events?collection=trending&limit=4
GET /api/events?collection=upcoming&limit=4&sort=date&order=asc
```

Ví dụ cho trang `/su-kien` (filter panel):
```
GET /api/events?categorySlug=nhac-song&city=hcm&isFree=false&page=1&limit=12
```

Ví dụ "Sự kiện liên quan" ở trang chi tiết:
```
GET /api/events?categorySlug=<category của event hiện tại>&excludeId=<id>&limit=4
```

### `GET /api/events/:id` (đã có, giờ chỉ trả event `published`)
Trang `/su-kien/[id]` gọi endpoint này. Nếu event không tồn tại **hoặc chưa published** → `404
Event not found` (tránh lộ draft qua việc đoán ID).

> ✅ **Cập nhật 2026-07-05**: route ghi của event đã gắn `isAuthenticated` +
> `authorize('ORGANIZER','ADMIN')`, và organizer đã xem được draft của chính họ qua
> `GET /api/organizer/events/:id` (xem [`api-reference.md`](./api-reference.md)). Endpoint public
> này vẫn chỉ trả event `published`.

---

## 4. Seed data

Script `backend/src/scripts/seed-homepage.ts` (chạy `npm run seed:homepage` trong `backend/`)
seed sẵn 6 category, 5 star, 2 banner, 5 event `published` (bao phủ đủ 3 collection
featured/trending/upcoming + 1 event miễn phí) — **idempotent** (upsert theo `slug`/`title`, chạy
lại nhiều lần an toàn). Dùng để FE có dữ liệu thật để test khi chuyển từ `mockData.ts` sang gọi
API.

---

## 5. Việc cần làm tiếp khi FE chuyển sang gọi API thật

1. Thay `import { featuredEvents, ... } from "@/lib/mockData"` bằng fetch tới `GET
   /api/events?collection=...` (server component, có thể fetch trực tiếp trong `page.tsx`).
2. Field response khác tên với `EventItem` hiện tại của FE (`_id` thay vì `id`, `imageUrl` thay vì
   `image`, `priceFrom` số thay vì `price` chuỗi đã format) → cần 1 lớp mapper nhỏ ở FE
   (`toEventItem(apiEvent)`), không đổi field BE để giữ đúng convention response chuẩn của dự án.
3. Trang `/su-kien/[id]` cần đổi từ `findEventById` (client-side mock lookup) sang
   `fetch(`/api/events/${id}`)` ở server component — vẫn giữ được `generateMetadata` vì đó cũng
   là async server function.
4. Phần "Sự kiện liên quan" (`RelatedEvents`) đổi từ `exploreEvents.filter(...)` sang gọi
   `GET /api/events?categorySlug=...&excludeId=...&limit=4`.
