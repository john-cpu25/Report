# Kế hoạch triển khai Hệ thống Đăng nhập (Auth)

Tài liệu này lưu trữ kế hoạch thiết lập hệ thống đăng nhập chuyên nghiệp sử dụng Supabase Auth cho ứng dụng Weekly Report.

## 1. Mục tiêu
- Bảo mật dữ liệu báo cáo.
- Cá nhân hóa trải nghiệm người dùng dựa trên Team và Vai trò.
- Duy trì phiên đăng nhập (Session) ổn định.

## 2. Các thành phần chính
- **Trang Login**: Giao diện hiện đại, hỗ trợ theme Galaxy/News.
- **Auth Context**: Quản lý trạng thái đăng nhập toàn cục.
- **Middleware**: Kiểm tra quyền truy cập trước khi vào các tab dashboard.

## 3. Quy trình kỹ thuật
1. Kiểm tra session khi App khởi chạy.
2. Nếu chưa đăng nhập, hiển thị trang Login.
3. Đăng nhập thành công -> Lưu session -> Fetch dữ liệu người dùng từ bảng `NMK_User`.
4. Chuyển hướng vào Dashboard.

---
*Ghi chú: Bản kế hoạch chi tiết hơn nằm trong artifact implementation_plan.md*
