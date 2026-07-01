# TÀI LIỆU LOGIC NGHIỆP VỤ & PHÂN QUYỀN HỆ THỐNG EVENTBOX

Tài liệu này định nghĩa chi tiết luồng nghiệp vụ, danh sách các vai trò (roles) và quyền hạn tương ứng trên hệ thống Quản lý Sự kiện **EventBox** dựa trên sơ đồ ngữ cảnh (Context Diagram) và yêu cầu thực tế từ Ticketbox.vn. Bạn có thể chỉnh sửa trực tiếp tài liệu này để cập nhật yêu cầu cho các tính năng tiếp theo.

---

## 1. Luồng Xác thực & Kích hoạt (Authentication & Activation Flow)

### 1.1. Khách vãng lai (Guest) & Đăng ký Tự do
*   **Đăng ký & Đăng nhập:** Áp dụng cho `PARTICIPANT` (Người tham gia) và `ORGANIZER` (Nhà tổ chức).
*   **Xác thực qua OTP Gmail:** Khi đăng ký, người dùng điền Email hoạt động. Hệ thống gửi mã OTP 6 chữ số qua email để xác thực trước khi tạo tài khoản chính thức.
*   **Đăng nhập Google OAuth:** Người dùng có thể đăng nhập nhanh bằng tài khoản Google (liên kết Google Services). Hệ thống mặc định gán vai trò `PARTICIPANT` và chuyển hướng về trang chủ (`/`).
*   **Trạng thái tài khoản ban đầu:** `ACTIVE`.

### 1.2. Cấp tài khoản & Kích hoạt cho Nhân viên (Staff)
*   **Quy trình tạo tài khoản:** 
    1.  Admin cấp tài khoản STAFF từ Dashboard bằng cách nhập **Họ tên** và **Email**.
    2.  Hệ thống tạo tài khoản với trạng thái chờ kích hoạt (`PENDING`).
    3.  Hệ thống sinh một **Mật khẩu tạm thời** và một **Mã kích hoạt (Activation Token)** dạng JWT hạn 7 ngày.
    4.  Hệ thống tự động gửi email cho Staff chứa thông tin tài khoản đăng nhập tạm thời và liên kết kích hoạt: `/activate?token=...`.
*   **Quy trình kích hoạt & Đổi mật khẩu lần đầu:**
    1.  Nhân viên Staff click vào liên kết kích hoạt trong email để dẫn tới trang `/activate`.
    2.  Staff nhập Họ tên mới (nếu muốn thay đổi) và tự thiết lập **Mật khẩu mới** của riêng họ.
    3.  Sau khi bấm xác nhận, tài khoản chuyển trạng thái thành `ACTIVE` và Staff có thể đăng nhập bình thường bằng mật khẩu mới này.

---

## 2. Chi tiết Vai trò & Quyền hạn (Roles & Permissions)

### 2.1. ADMIN (Quản trị viên Hệ thống)
*   **Cách khởi tạo:** Tạo thủ công qua Database MongoDB Compass (không có luồng đăng ký trên giao diện).
*   **Quyền hạn & Chức năng:**
    *   **Xem chi tiết sự kiện:** Xem toàn bộ thông tin chi tiết (nội dung, cấu hình vé, trạng thái phê duyệt) của tất cả các sự kiện trên hệ thống.
    *   **Duyệt sự kiện (Event Governance):** Phê duyệt (Approve) hoặc từ chối (Reject) các yêu cầu đăng ký sự kiện mới từ Organizer.
    *   **Phân công Staff (Event Assignment):** Phân công nhân viên (`STAFF`) hỗ trợ, check-in hoặc bán vé tại các sự kiện đã được phê duyệt.
    *   **Quản lý bán vé (Ticket Management):** Theo dõi tình hình đặt vé, số lượng vé bán ra, và doanh thu thời gian thực của từng sự kiện cụ thể.
    *   **Quản lý quảng cáo sự kiện (Marketing Management):** Phê duyệt, sắp xếp hoặc thiết lập các sự kiện nổi bật, banner quảng cáo trên trang chủ để thúc đẩy doanh số.
    *   **Quản lý hợp đồng & thỏa thuận (Contract Management):** Quản lý thông tin, lưu trữ và theo dõi trạng thái các hợp đồng ký kết giữa hệ thống và Nhà tổ chức.
    *   **Xem dữ liệu & Báo cáo doanh thu (Reporting & Analytics):** Xem báo cáo thống kê, phân tích biểu đồ tài chính và doanh thu tổng hợp toàn sàn.
    *   **Quản lý thanh toán (Payment Management):**
        *   *Thanh toán sau sự kiện (Post-event Payout / Withdrawal Approval):* Phê duyệt các yêu cầu rút tiền/quyết toán doanh thu cho Nhà tổ chức sau khi sự kiện hoàn thành.
        *   *Hoàn tiền (Refunds):* Xử lý yêu cầu hoàn trả tiền vé cho Người tham gia trong trường hợp sự kiện bị hủy hoặc hoãn.
    *   **Quản lý Tài khoản (Account Management):** Khóa/mở khóa tài khoản, thay đổi vai trò (Role) của người dùng khác.

### 2.2. STAFF (Nhân viên Hỗ trợ & Kiểm duyệt)
*   **Cách khởi tạo:** Được Admin cấp tài khoản và kích hoạt thành công qua liên kết trong Email.
*   **Quyền hạn & Chức năng:**
    *   **Xem sự kiện được giao (Assigned Events):** Xem danh sách chi tiết các sự kiện mà mình được phân công hỗ trợ.
    *   **Xem lịch làm việc (Work Schedule):** Theo dõi lịch phân ca, ca làm việc cụ thể tương ứng với các sự kiện được chỉ định.
    *   **Kiểm tra vé tại sự kiện (Attendee Check-in):** Quét mã QR code/mã vé của người tham gia khi họ đến cửa sự kiện và cập nhật trạng thái check-in thời gian thực lên hệ thống.
    *   **Bán vé offline tại sự kiện (Offline Ticket Sales):** Hỗ trợ bán vé trực tiếp tại quầy của sự kiện cho khách hàng vãng lai chưa mua vé trước. Cập nhật dữ liệu bán vé offline về hệ thống.
    *   **Báo cáo vấn đề sự kiện (Issue Management):** Gửi báo cáo, cảnh báo sự cố hoặc vấn đề phát sinh tại sự kiện về cho Admin/Ban quản lý để kịp thời xử lý.

### 2.3. ORGANIZER (Nhà Tổ chức Sự kiện)
*   **Cách khởi tạo:** Đăng ký tự do qua giao diện (chọn vai trò Organizer và xác thực OTP Gmail).
*   **Quyền hạn & Chức năng:**
    *   **Tạo & Thiết lập Sự kiện:**
        *   *Cấu hình vé (Ticket Configuration):* Tạo nhiều hạng vé khác nhau (VIP, Standard, Early Bird...), số lượng vé phát hành và giá vé cụ thể.
        *   *Sơ đồ chỗ ngồi (Seat Map):* Cấu hình và thiết lập sơ đồ ghế ngồi theo hàng/khối đối với các sự kiện trong khán phòng hoặc có đánh số ghế.
    *   **Thuê thêm dịch vụ hệ thống (Services Request):** Gửi yêu cầu sử dụng các dịch vụ hỗ trợ từ hệ thống EventBox và chờ Admin duyệt:
        *   *Xin giấy phép tổ chức (Permits Request).*
        *   *Hỗ trợ hậu cần & nhân sự (Logistics & Equipment Support).*
    *   **Xem & Quản lý hợp đồng (Contracts):** Xem chi tiết các hợp đồng, thỏa thuận chia sẻ doanh số và ký kết thỏa thuận điện tử với EventBox.
    *   **Quản lý bán hàng & Người tham gia:**
        *   Xem danh sách chi tiết những người tham gia đã đăng ký mua vé (thông tin liên hệ, loại vé đã mua).
        *   Theo dõi số liệu thống kê chi tiết về doanh thu, tốc độ bán vé, lượt xem trang sự kiện.
    *   **Yêu cầu thanh toán sau sự kiện (Withdrawal Request):** Gửi yêu cầu quyết toán và rút doanh thu bán vé (sau khi trừ chi phí dịch vụ/thuế) từ ví hệ thống về tài khoản ngân hàng sau khi sự kiện kết thúc thành công.

### 2.4. PARTICIPANT (Người tham gia / Khách hàng)
*   **Cách khởi tạo:** Đăng ký tự do qua giao diện (Xác thực OTP) hoặc Đăng nhập nhanh bằng Google.
*   **Quyền hạn & Chức năng:**
    *   **Khám phá sự kiện:** Tìm kiếm sự kiện theo từ khóa, danh mục, thời gian, địa điểm.
    *   **Mua vé & Thanh toán:** Đặt vé trực tuyến và tiến hành thanh toán qua cổng thanh toán tích hợp (VNPAY / VNPay Gateway).
    *   **Lịch sử vé đã mua (Ticket Purchase History):** 
        *   Xem danh sách tất cả các vé đã mua (đã thanh toán, chưa thanh toán, đã sử dụng).
        *   Lấy mã QR code / Vé điện tử phục vụ check-in tại địa điểm diễn ra sự kiện.
    *   **Thông tin thanh toán (Payment History):** Theo dõi lịch sử giao dịch thanh toán và yêu cầu hoàn tiền (Refund Request) nếu thuộc diện được phép hoàn trả.

---

## 3. Liên kết Hệ thống Ngoại vi (External Integrations)

*   **Google Services:** Xác thực đăng nhập qua Google OAuth API và tích hợp bản đồ Google Maps cho địa điểm sự kiện.
*   **Cổng thanh toán VNPAY:**
    1.  Khi Participant xác nhận đặt vé, hệ thống gửi **Payment Request** đến cổng VNPAY.
    2.  Người dùng thực hiện thanh toán trên giao diện VNPAY.
    3.  VNPAY trả kết quả **Payment Status** về hệ thống để cập nhật trạng thái đơn hàng (Thành công / Thất bại).
