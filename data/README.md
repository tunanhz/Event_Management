# Dữ liệu mẫu (seed data)

Các file JSON trong thư mục này dùng định dạng **MongoDB Extended JSON**
(`{"$oid": "..."}`, `{"$date": "..."}`) để `_id`, các trường ref và ngày tháng
được import đúng kiểu dữ liệu (ObjectId / Date) thay vì bị lưu thành chuỗi.

Dữ liệu được liên kết chéo với nhau (user ↔ event ↔ ticket ↔ registration ↔
payment) nên cần import **đúng thứ tự** bên dưới.

## Cách 1: `mongoimport` (khuyến nghị, nhanh nhất)

Chạy lần lượt (đảm bảo MongoDB đang chạy ở `localhost:27017`, database
`event_management` — khớp với `MONGODB_URI` trong `backend/.env`):

```bash
cd data

mongoimport --uri="mongodb://localhost:27017/event_management" --collection=users         --file=users.json         --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=categories     --file=categories.json     --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=stars          --file=stars.json          --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=events         --file=events.json         --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=banners        --file=banners.json        --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=tickets        --file=tickets.json        --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=registrations  --file=registrations.json  --jsonArray
mongoimport --uri="mongodb://localhost:27017/event_management" --collection=payments       --file=payments.json       --jsonArray
```

Chạy lại lệnh sẽ báo lỗi trùng `_id`/`unique` (email, slug...) — nếu muốn
import lại từ đầu, thêm `--drop` vào từng lệnh để xóa collection cũ trước khi
import, hoặc xóa thủ công trong MongoDB Compass.

> Chưa có `mongoimport`? Cài **MongoDB Database Tools**:
> https://www.mongodb.com/try/download/database-tools (thường không đi kèm
> sẵn trong bản MongoDB Community Server).

## Cách 2: MongoDB Compass

1. Kết nối tới `mongodb://localhost:27017`, chọn (hoặc tạo) database
   `event_management`.
2. Với mỗi file, vào collection tương ứng (tạo mới nếu chưa có, tên collection
   = tên file không có `.json`, ví dụ `users.json` → collection `users`) →
   **Add Data → Import File** → chọn file → chọn định dạng **JSON**.
3. Import theo đúng thứ tự trong danh sách ở Cách 1 để tránh lỗi ref.

## Tài khoản mẫu

Tất cả user mẫu dùng chung mật khẩu: **`Password123!`**
(đã được hash sẵn bằng bcrypt nên có thể đăng nhập ngay sau khi import).

| Email | Role |
|---|---|
| admin@eventbox.vn | ADMIN |
| organizer.music@eventbox.vn | ORGANIZER |
| organizer.sports@eventbox.vn | ORGANIZER |
| staff@eventbox.vn | STAFF |
| participant1@eventbox.vn | PARTICIPANT |
| participant2@eventbox.vn | PARTICIPANT |

## Nội dung dữ liệu mẫu

- **users.json** — 6 user (1 admin, 2 organizer, 1 staff, 2 participant)
- **categories.json** — 6 danh mục sự kiện (`nhac-song`, `san-khau`, `the-thao`,
  `hoi-thao`, `tham-quan`, `khac`)
- **stars.json** — 3 nghệ sĩ nổi bật
- **events.json** — **25 sự kiện** (24 published + 1 draft), trải đều cả 6
  danh mục (4-5 sự kiện/danh mục), mỗi sự kiện có ảnh Unsplash được chọn khớp
  chủ đề thật (concert, sân khấu kịch/ballet, thể thao, hội thảo/workshop,
  tour du lịch, ẩm thực...). 14 sự kiện `isTrending: true`, 9 sự kiện
  `isFeatured: true`, phân bổ đều để mỗi danh mục khi lọc đều có ít nhất một
  sự kiện nổi bật/trending.
- **banners.json** — 4 banner gắn với các sự kiện nổi bật
- **tickets.json** — 31 vé (1-2 hạng vé/sự kiện) khớp `eventId`/`showId`
- **registrations.json** — 2 đơn đăng ký mẫu (1 đã PAID, 1 đang PENDING)
- **payments.json** — 1 giao dịch thanh toán mẫu (khớp với đơn PAID)

Lưu ý: đây là dữ liệu import **thẳng vào MongoDB**, bỏ qua các hook của
Mongoose (hash password, `timestamps`...), nên mọi field mặc định
(`role`, `status`, `createdAt`...) đã được điền sẵn thủ công trong JSON.

### Về mục "Vé bán lại"

Trong menu điều hướng của frontend có link **"Vé bán lại"**
(`frontend/src/components/home/Header.tsx`), nhưng đây hiện chỉ là một link
tĩnh trỏ về trang danh sách sự kiện chung (`/su-kien`) — **không phải một
category thật** và **chưa có tính năng backend nào** (không có model, route,
field nào liên quan đến "resale"/"bán lại" trong `backend/src`). Vì vậy bộ
dữ liệu mẫu này không tạo category giả cho mục đó; nếu muốn đây trở thành một
tính năng thật (thị trường mua bán lại vé), cần thiết kế thêm model/route
riêng.
