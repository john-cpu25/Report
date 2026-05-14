# RINCOVITCH REPORT - UPDATE PLAN & ROADMAP

## [VERSION 4.7.0] - 2026-05-11 (COMPLETED)
### "System Modularization & Performance Optimization"

### 1. Tối ưu hóa Data Analyst (Performance Focus)
- [x] **Lazy Loading**: Triển khai cơ chế chỉ tải 300 bản ghi gần nhất khi khởi tạo tab.
- [x] **State Persistence**: Đảm bảo không bị reload dữ liệu khi chuyển tab.
- [x] **Sharp Design Standard**: Chuyển đổi toàn bộ giao diện sang phong cách sắc nét.

### 2. Tái cấu trúc Module (Refactoring)
- [x] **Deconstruction**: Chia tách file `CSVProcessor.jsx` thành thư mục component riêng.
- [x] **Sub-components**: Hoàn thiện StatCards, FilterBar, UnifiedTable, và DataUploader.

---

## [VERSION 4.8.0] - 2026-05-14 (COMPLETED)
### "Power BI Analytics & UX Polish"

### 1. Phân tích dữ liệu (Analytics)
- [x] **Interactive Cross-filtering**: Nhấn vào biểu đồ để lọc dữ liệu tự động.
- [x] **Trend Analysis**: Tích hợp đường trung bình trượt (Moving Average) 3 kỳ.
- [x] **Dynamic Selectors**: Hoàn thiện bộ chọn dự án thông minh.

### 2. Giao diện (UX/UI)
- [x] **Sticky Intelligence**: Cố định Header của Data Analyst.
- [x] **Intelligence Toggle**: Thêm nút ẩn/hiện khung phân tích.
- [x] **Data Placeholders**: Hiển thị dấu `-` cho các ô dữ liệu trống.

---

## [VERSION 4.9.0] - 2026-05-15 (DỰ KIẾN)
### "Security Enforcement & Personal Workspace"

### 1. Phân quyền & Bảo mật (RBAC & Security)
- [ ] **Environment Hardening**: Bảo mật Supabase Keys qua file `.env`.
- [ ] **Dynamic Sidebar**: Ẩn/Hiện Tab dựa trên chức vụ:
    - Admin/Leader: Xem tất cả.
    - User: Ẩn "Data Analyst" và "Review".
- [ ] **Route Protection**: Chặn truy cập trái phép vào các module nhạy cảm từ App logic.

### 2. Workspace Cá nhân (Personal Module)
- [ ] **My Performance Tab**: Tạo không gian riêng cho từng User.
- [ ] **Self-Data Only**: Tự động lọc chỉ hiển thị task của User đang đăng nhập.
- [ ] **Weekly Detailed View**: Chế độ xem chi tiết theo từng tuần với biểu đồ hiệu suất cá nhân.

### 3. Quản lý Đội ngũ (Team Management)
- [ ] **Live Operative Roster**: Trạng thái "Busy/Free" của nhân sự trên Dashboard.
- [ ] **Capacity Planning**: Thống kê tải trọng công việc của từng team.

---
**Kế hoạch tiếp theo (Next Steps):**
- [ ] Triển khai phân quyền Sidebar ngay lập tức.
- [ ] Xây dựng khung giao diện cho Tab cá nhân.
- [ ] Thực hiện fix bảo mật theo file `SECURITY_AUDIT.md`.

---
*Vị trí file này: /core/update_plan.md*
