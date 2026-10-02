# Supabase Connection History & Local Dev - Rincovitch Report

Tài liệu này lưu trữ lịch sử các thông tin kết nối Supabase và thông tin truy cập cục bộ (Localhost) của hệ thống Báo cáo tuần Rincovitch.

---

## 🔑 Khóa Đang Hoạt Động (Active)
*Đang sử dụng chính thức trong [supabaseClient.js](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/supabaseClient.js) & [ACCOUNTS.md](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/ACCOUNTS.md)*

- **Supabase URL**: `https://wluhkzkfknpbunxagvjw.supabase.co`
- **Supabase Anon Key**: `sb_publishable_iQ89mBYJqfyHwSnaPgM6wA_iRzhdRD9`
- **Trạng thái**: Hoạt động bình thường (Đã nạp toàn bộ dữ liệu người dùng, dự án, task, thông báo, thư viện).

---

## 🌐 Đường Dẫn Phát Triển Cục Bộ (Local Dev)
*Sử dụng khi chạy dự án dưới máy Local*

- **Trang chủ Local:** `http://localhost:5173/Report/`
- **Trang quản trị (Admin Bypass Mode):** `http://localhost:5173/Report/?admin_mode=true`
  > Chế độ này bỏ qua bước đăng nhập Microsoft SSO, giả lập tài khoản **Super Admin (Bypass)** để kiểm thử nhanh.

---

## 🗄️ Lịch Sử Khóa Cũ (Backup)

### Đợt 3 (Giai đoạn tháng 07/2026 - 24/09/2026)
- **Supabase URL**: `https://ejyirnfxuezipogweybo.supabase.co`
- **Supabase Anon Key**: `sb_publishable_r1DKG_nf_nyivQgbe6D7YA_zow13__G`
- **Ghi chú**: Đã backup toàn bộ dữ liệu sang thư mục `CSharp/SUPABASE/migration/exported_data/`.

### Đợt 2 (Khoảng tháng 05/2026)
- **Supabase URL**: `https://fabuhzarlzstcsaerfut.supabase.co`
- **Supabase Anon Key**: `sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm`
- **Ghi chú**: Đã ngưng hoạt động / Không còn kết nối.

### Đợt 1 (Trước ngày 18/05/2026)
- **Supabase URL**: `https://slswxupqnjxnqpfkknqu.supabase.co`
- **Supabase Anon Key**: `sb_publishable_-6l8WMlZCW3dMlUshBQzNw_9Lbd7JMC`

---
> [!NOTE]
> Thông tin kết nối client được quản lý chính thức tại file [supabaseClient.js](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/supabaseClient.js). Khi thực hiện thay đổi key, hãy luôn cập nhật cả lịch sử tại tài liệu này để lưu trữ vết.
