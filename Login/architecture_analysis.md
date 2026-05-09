# Phân tích Kiến trúc Hệ thống: GitHub & Supabase

Tài liệu này phân tích sự kết hợp giữa GitHub (Hosting/Domain) và Supabase (Backend/Real-time) cho dự án Weekly Report.

## 1. Frontend & Hosting (GitHub)
- **Cơ chế**: Sử dụng GitHub Pages để host các file tĩnh của ứng dụng React/Vite.
- **Tên miền (Domain)**: Sử dụng domain mặc định của GitHub (`github.io`) hoặc tùy chỉnh.
- **Ưu điểm**: 
    - Miễn phí và ổn định.
    - CI/CD tự động thông qua GitHub Actions.
    - Quản lý phiên bản mã nguồn minh bạch.

## 2. Backend & Data Layer (Supabase)
- **Cơ sở dữ liệu (PostgreSQL)**: Lưu trữ toàn bộ dữ liệu nghiệp vụ (Tasks, Users, Projects, Planning).
- **Tính năng Real-time**: Sử dụng Websockets để đồng bộ dữ liệu ngay lập tức giữa các người dùng khi có sự thay đổi (ví dụ: khi một kế hoạch được duyệt).
- **Xác thực (Authentication)**: Quản lý danh tính người dùng và phân quyền (Staff, Leader, Manager).
- **Đồng bộ dữ liệu (Data Sync)**: Đảm bảo tính nhất quán của dữ liệu trên mọi thiết bị.

## 3. Quy trình vận hành tích hợp
1. **Source Code**: Nằm trên GitHub.
2. **UI/UX**: Được tải từ GitHub về trình duyệt người dùng.
3. **Data Flows**: 
    - Người dùng gửi yêu cầu (Đăng nhập, Tạo plan, Duyệt plan) tới Supabase.
    - Supabase xử lý và phản hồi lại dữ liệu mới nhất.
    - Tính năng Real-time cập nhật giao diện của các người dùng khác có liên quan.
4. **Security**: Row Level Security (RLS) trên Supabase bảo vệ dữ liệu khỏi các truy cập trái phép từ frontend.

---
*Ghi chú: Đây là nền tảng vững chắc để phát triển các quy trình duyệt kế hoạch (Approval Workflow) phức tạp trong tương lai.*
