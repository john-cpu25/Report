# Hướng dẫn Chế độ Admin Bypass (Admin Mode Guide)

Tài liệu này hướng dẫn cách sử dụng và quản lý chế độ truy cập nhanh dành cho Admin trong hệ thống Weekly Report.

## 1. Mục đích
Chế độ Admin Bypass được thiết kế để:
- Review giao diện Dashboard và các tính năng Admin mà không cần đăng nhập Microsoft.
- Phát triển và kiểm thử khi hệ thống xác thực (MSAL) hoặc database (Supabase) gặp sự cố.
- Demo nhanh các module cấp cao.

## 2. Cách sử dụng
Để kích hoạt chế độ này, bạn chỉ cần thêm tham số `admin_mode=true` vào sau URL của ứng dụng:

**Đường dẫn:**
`http://localhost:5173/Report/?admin_mode=true`

## 3. Cơ chế hoạt động
- Hệ thống sẽ kiểm tra URL Parameter khi ứng dụng khởi chạy (`AuthContext.jsx`).
- Nếu phát hiện `admin_mode=true`, hệ thống sẽ bỏ qua logic đăng nhập thông thường.
- Một tài khoản giả lập (Mock User) sẽ được tạo ra với cấu hình:
    - **Name**: Super Admin (Bypass)
    - **Role**: Admin, Leader
    - **Team**: Management
    - **Location**: VIETNAM

## 4. Lưu ý quan trọng
- **Bảo mật**: Chế độ này hiện đang mở cho bất kỳ ai biết URL. Trong tương lai, nên thêm một Secret Key (ví dụ: `?admin_mode=true&key=SECRET123`).
- **Dữ liệu**: Vì đây là tài khoản giả lập, các hành động như "Xóa" hay "Sửa" dữ liệu vẫn sẽ tác động trực tiếp lên database thực tế (nếu kết nối Supabase đang hoạt động). Hãy cẩn trọng khi thao tác.

---
*Cập nhật lần cuối: 16/05/2026*
