# 🛠️ HƯỚNG DẪN CẤU HÌNH HỆ THỐNG THỰC TẾ (PRODUCTION/DEVELOPMENT SETUP)

Tài liệu này hướng dẫn chi tiết cách cấu hình cơ sở dữ liệu MongoDB thực tế, hệ thống gửi email OTP qua Gmail SMTP, cơ chế Đăng nhập Google (Google OAuth) và cách tự tạo tài khoản Admin trực tiếp trong cơ sở dữ liệu của bạn.

---

## 📌 Mục lục
1. [Cấu hình MongoDB Atlas (Cơ sở dữ liệu đám mây)](#1-cấu-hình-mongodb-atlas)
2. [Cấu hình Gmail SMTP (Gửi mã OTP xác thực)](#2-cấu-hình-gmail-smtp)
3. [Cấu hình Google OAuth (Đăng nhập Google)](#3-cấu-hình-google-oauth)
4. [Hướng dẫn tạo tài khoản Admin trực tiếp từ MongoDB Compass](#4-hướng-dẫn-tạo-tài-khoản-admin-trực tiếp-từ-mongodb-compass)
5. [Tổng kết file cấu hình `.env` mẫu](#5-file-cấu-hình-env-backend)

---

## 1. Cấu hình MongoDB Atlas

Nếu nhóm của bạn muốn dùng chung một cơ sở dữ liệu trên đám mây (Cloud) thay vì chạy MongoDB Local trên máy cá nhân, hãy làm theo các bước sau:

### Bước 1: Đăng ký & Tạo Cluster
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) và đăng ký tài khoản miễn phí.
2. Tạo một **Project** mới đại diện cho dự án.
3. Nhấp **Create a Deployment** -> Chọn gói **M0 (Free)** (Miễn phí hoàn toàn).
4. Chọn nhà cung cấp đám mây (AWS/Google Cloud) và Region gần Việt Nam nhất (ví dụ: `Singapore - ap-southeast-1`) để tối ưu tốc độ.
5. Nhấp **Create**.

### Bước 2: Tạo User truy cập Database
1. Trong màn hình khởi tạo bảo mật (Security Quickstart), tạo một Database User:
   - **Username**: nhập tên tài khoản (ví dụ: `dbuser`)
   - **Password**: nhấp *Autogenerate Secure Password* và lưu lại mật khẩu này.
2. Nhấp **Create User**.

### Bước 3: Cấu hình Network Access (Quan trọng)
*Mặc định MongoDB Atlas sẽ chặn toàn bộ kết nối từ bên ngoài.*
1. Chọn tab **Network Access** ở menu bên trái.
2. Nhấp **Add IP Address**.
3. Chọn **Allow Access From Anywhere** (IP: `0.0.0.0/0`) để tất cả thành viên trong nhóm của bạn có thể kết nối từ máy cá nhân ở nhà/trường học.
4. Nhấp **Confirm**.

### Bước 4: Lấy Connection String
1. Quay lại tab **Database** (hoặc Clusters) -> Nhấp nút **Connect**.
2. Chọn **Drivers** (Node.js).
3. Sao chép chuỗi kết nối (Connection String) có dạng:
   ```text
   mongodb+srv://dbuser:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
4. Thay thế `<password>` bằng mật khẩu của Database User bạn đã tạo ở **Bước 2**.
5. Mở file [backend/.env](file:///c:/Users/ADIM/OneDrive/Documents/.FPTU/SUMMER2026/WDP301/Event_Management/backend/.env) và cập nhật biến `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://dbuser:Mật_Khẩu_Của_Bạn@cluster0.xxxx.mongodb.net/event_management?retryWrites=true&w=majority
   ```

---

## 2. Cấu hình Gmail SMTP (Gửi mã OTP)

Hệ thống cần gửi mã xác thực OTP về email khi người dùng đăng ký tài khoản. Để gửi được email từ Gmail cá nhân hoặc Gmail dự án, bạn cần tạo **Mật khẩu ứng dụng (App Password)** từ Google.

### Các bước thiết lập:
1. Đăng nhập vào tài khoản Google (Gmail) của bạn/nhóm.
2. Truy cập trang quản lý [Tài khoản Google của tôi](https://myaccount.google.com/).
3. Chọn mục **Bảo mật (Security)** ở danh sách bên trái.
4. Tại phần **Cách bạn đăng nhập vào Google**, bắt buộc phải **Bật Xác minh 2 bước (2-Step Verification)** nếu chưa bật.
5. Sau khi bật Xác minh 2 bước, nhấp vào mũi tên bên phải của nó. Kéo xuống cuối trang, bạn sẽ thấy mục **Mật khẩu ứng dụng (App Passwords)**.
6. Nhập tên ứng dụng (ví dụ: `EventBox Node App`) và nhấp **Tạo (Create)**.
7. Google sẽ cung cấp một mật khẩu gồm **16 ký tự viết liền** (không có dấu cách, ví dụ: `abcd efgh ijkl mnop`). Hãy sao chép nó.
8. Mở file [backend/.env](file:///c:/Users/ADIM/OneDrive/Documents/.FPTU/SUMMER2026/WDP301/Event_Management/backend/.env) và điền cấu hình:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=gmail_cua_ban@gmail.com
   SMTP_PASS=abcdefghijklmnop    # 16 ký tự vừa tạo từ Google
   SMTP_FROM="EventBox System" <gmail_cua_ban@gmail.com>
   ```

---

## 3. Cấu hình Google OAuth (Đăng nhập Google)

Để nút "Đăng nhập bằng Google" hoạt động thật, bạn cần tạo một Google Client ID trên Google Cloud Console.

### Các bước thiết lập:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một dự án mới (ví dụ: `Event Management Platform`).
3. Tại ô tìm kiếm trên cùng, gõ và chọn **APIs & Services**.
4. Chọn **OAuth consent screen** ở menu bên trái:
   - Chọn User Type là **External** -> Nhấp **Create**.
   - Điền các thông tin bắt buộc: **App name** (`EventBox`), **User support email** (email của bạn), **Developer contact information** (email của bạn).
   - Nhấp **Save and Continue** qua các bước Scopes và Test users mà không cần chỉnh sửa thêm.
5. Chọn tab **Credentials** ở menu bên trái:
   - Nhấp **+ Create Credentials** ở phía trên -> Chọn **OAuth client ID**.
   - **Application type**: Chọn **Web application**.
   - **Name**: Nhập tên (ví dụ: `EventBox Web Client`).
   - Tại mục **Authorized JavaScript origins**, nhấp **Add URI** và nhập URL của frontend:
     - `http://localhost:3000`
   - Tại mục **Authorized redirect URIs** (Nếu dùng cơ chế chuyển hướng, còn nếu dùng Google One Tap/Login Popup xử lý trực tiếp ở Client, bạn có thể điền giống JavaScript origins):
     - `http://localhost:3000`
   - Nhấp **Create**.
6. Sao chép **Your Client ID** (chuỗi dài kết thúc bằng `.apps.googleusercontent.com`).
7. Dán Client ID này vào file `.env` của Backend:
   ```env
   GOOGLE_CLIENT_ID=chuoi_id_cua_ban.apps.googleusercontent.com
   ```

---

## 4. Hướng dẫn tạo tài khoản Admin trực tiếp từ MongoDB Compass

Để tối ưu hóa bảo mật và kiểm soát dữ liệu hoàn toàn từ database, bạn có thể tự chèn tài khoản Admin trực tiếp qua công cụ MongoDB Compass (hoặc MongoDB Shell) theo đúng các trường thuộc tính trong sơ đồ lớp của nhóm.

### Các bước thực hiện trên MongoDB Compass:
1. Mở ứng dụng **MongoDB Compass** và kết nối tới database của bạn (mặc định: `mongodb://localhost:27017`).
2. Ở thanh danh sách Database bên trái, nhấp chọn cơ sở dữ liệu **`event_management`**.
3. Chọn collection **`users`**.
4. Ở phía bên phải màn hình, nhấp vào nút **`+ Add Data`** -> Chọn **`Insert Document`**.
5. Chuyển chế độ xem sang dạng JSON bằng cách click biểu tượng dấu ngoặc `{}` ở góc trên bên phải của bảng Insert.
6. Sao chép và dán đoạn JSON dưới đây vào (đoạn JSON này sử dụng mật khẩu mặc định là **`Admin@123456`** đã được mã hóa an toàn thành `passwordHash`):

```json
{
  "fullName": "System Admin",
  "email": "admin@eventbox.vn",
  "passwordHash": "$2b$10$fePqrSL3kPQzf57BhwKb4.RGRjR4.f12C/HtsPvgOqtbt/2T6IHC6",
  "phone": "0987654321",
  "role": "ADMIN",
  "accountStatus": "ACTIVE",
  "createdAt": {
    "$date": "2026-06-29T08:00:00.000Z"
  },
  "updatedAt": {
    "$date": "2026-06-29T08:00:00.000Z"
  },
  "__v": 0
}
```

7. Bấm **Insert**.
8. Tài khoản Admin đã được tạo thành công trực tiếp trong database! Bạn có thể sử dụng email `admin@eventbox.vn` và mật khẩu thô `Admin@123456` để đăng nhập trên giao diện.

---

## 5. File cấu hình `.env` Backend hoàn chỉnh

Dưới đây là nội dung mẫu của file `backend/.env` sau khi bạn điền đầy đủ các thông tin thật:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (Thay thế bằng URI MongoDB Atlas thực tế)
MONGODB_URI=mongodb://localhost:27017/event_management

# JWT (Nên đổi chuỗi bí mật này khi triển khai thực tế)
JWT_SECRET=event_management_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d

# Frontend URL (Cập nhật nếu deploy tên miền khác)
FRONTEND_URL=http://localhost:3000

# Email Config (Cấu hình gửi mail OTP thực tế)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=gmail_cua_ban@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM="EventBox System" <gmail_cua_ban@gmail.com>

# Google OAuth Client ID
GOOGLE_CLIENT_ID=chuoi_id_cua_ban.apps.googleusercontent.com
```

---

## 🚀 Các bước khởi động sau khi cấu hình
1. Đảm bảo file `.env` đã được điền đủ thông tin.
2. Chạy backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Quan sát log trên console. Bạn sẽ thấy thông báo dạng:
   ```text
   📦 MongoDB connected successfully
   🚀 Server running on http://localhost:5000
   ```
4. Bây giờ bạn có thể mở trang Đăng nhập ở Frontend (`http://localhost:3000/login`) và đăng nhập trực tiếp bằng tài khoản Admin bạn vừa chèn vào database (`admin@eventbox.vn` / `Admin@123456`).
