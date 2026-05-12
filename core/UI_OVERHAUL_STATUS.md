# PRECISION UI OVERHAUL STATUS (OCD PHASE)
**Date:** 2026-05-12
**Standard:** Padding: 10px | Margin: 10px | Gap: 10px | Border-Radius: 8px | Typography: 30px (Title), 24px (Section), 14px (Body)

## ✅ COMPLETED (ĐÃ CHUẨN HÓA)
Hệ thống lõi và các tab chính đã đạt trạng thái Pixel Perfect.

### 🟢 Core Framework
- [x] **index.css**: Thêm các class tiện ích `.ocd-card`, `.ocd-button`, `.ocd-input`...
- [x] **App.jsx**: Chuẩn hóa Layout chính và Container.
- [x] **Sidebar.jsx & NavItem.jsx**: Chuẩn hóa thanh điều hướng (Icon 80x80px / 40px height).

### 🟢 Navigation Tabs
- [x] **Dashboard.jsx**: Heatmap, Stats Cards và Operational Grid.
- [x] **WeeklyReport.jsx**: Batch Add Modal, Bulk Edit Bar và List Layout.
- [x] **Projects.jsx**: Project Cards, Top 10 List và Detail Modal.
- [x] **OrgChart.jsx**: Cấu trúc cây thư mục và Modals thông tin.
- [x] **CSVProcessor.jsx**: Giao diện Data Analyst (Analytics & Unified View).
- [x] **UnifiedTable.jsx**: Bảng dữ liệu đồng nhất.
- [x] **AnnualLeave.jsx**: Bảng theo dõi nghỉ phép và Analytics.
- [x] **EnergyBar.jsx**: Pin năng lượng (Battery visualization).

---

## ⏳ PENDING (CẦN UPDATE SAU)
Các tab và thành phần phụ chưa được rà soát chi tiết.

### 🟡 Tabs & Components
- [ ] **PerformanceReview.jsx**: Giao diện đánh giá KPI.
- [ ] **Planning.jsx**: Giao diện lập kế hoạch.
- [ ] **Workflows.jsx**: Luồng xử lý công việc.
- [ ] **AdminPanel.jsx**: Cấu trúc quản trị hệ thống.
- [ ] **Settings.jsx**: Cấu hình người dùng.
- [ ] **Login.jsx**: Màn hình đăng nhập và xác thực SSO.

### 🟡 Sub-Components
- [ ] **CSVProcessor Sub-elements**: `DataUploader`, `StatCards`, `FilterBar`.
- [ ] **Common Modals**: Các hộp thoại thông báo hệ thống.

---

## 🛠️ GHI CHÚ KỸ THUẬT
1. **Typography**: Tuyệt đối không dùng cỡ chữ dưới 10px. Ưu tiên phân cấp 30/24/14.
2. **Radius**: Ép toàn bộ về `rounded-[8px]`, không dùng `rounded-xl` hay `rounded-none`.
3. **Spacing**: Giữ khoảng cách `10px` đồng nhất giữa các element.
