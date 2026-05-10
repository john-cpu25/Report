# Lịch sử Cập nhật Hệ thống (System Core Update Log)

Tài liệu này lưu lại các thay đổi quan trọng trong lõi hệ thống (Core) của Weekly Report Web.

## [VERSION 4.6.0] - 2026-05-10
### "Intel-Zen Core Update"

### 1. Nâng cấp Giao diện & Trải nghiệm (UI/UX)
- **Bamboo Zen Environment (LED 4K Style)**: 
    - Nâng cấp hình nền Bamboo với hiệu ứng VFX/LED.
    - Thêm ánh sáng "God Rays", bụi sáng (Bokeh Particles) và hiệu ứng đổ bóng chiều sâu (Parallax Depth).
    - Tối ưu hóa hiệu năng animation bằng cách sử dụng `useMemo` và `framer-motion`.
- **Annual Leave Refresh**:
    - Cải thiện độ tương phản cho bảng dữ liệu trong chế độ nền trắng (Light Theme).
    - Thêm dòng xen kẽ (Alternating Rows) và củng cố Table Header.
    - Tối ưu hóa thanh điều khiển (Control Header) với màu sắc rõ ràng hơn.

### 2. Module Quy trình (Procedures Module)
- **Khởi tạo hệ thống SOP**: Thêm tab "Procedures" vào mục WORKFLOW.
- **Sơ đồ luồng (Flowcharts)**: Triển khai sơ đồ quy trình chung (App Work Sheet) với hiệu ứng animation.
- **Hướng dẫn chi tiết (Step-by-step)**: Xây dựng quy trình QA Check cho team STR Modeling với hỗ trợ song ngữ (EN/VN).
- **Kiến trúc mở**: Sẵn sàng các placeholder cho quy trình Issue và Specialty.

### 3. Sửa lỗi & Ổn định (Hotfixes)
- **Dynamic Icon Rendering**: Sửa lỗi cú pháp JSX khi render các icon động trong danh sách quy trình.
- **Contrast Fixes**: Giải quyết vấn đề "White-on-White" khiến các thành phần giao diện bị mờ nhạt trên nền Bamboo.
- **Gradient Fixes**: Chuyển đổi `bg-gradient-radial` (non-standard) sang CSS chuẩn để tương thích mọi trình duyệt.

## [VERSION 4.6.1] - 2026-05-10
### "Workflow Expansion & Refinement"

### 1. Cải thiện Điều hướng (Navigation)
- **Phân tách Tab rõ ràng**: Đảm bảo các mục "Review" và "Organization" không bị chồng chéo trong sidebar.
- **Tối ưu hóa Sidebar**: Điều chỉnh vị trí và logic render để tránh lỗi click-through trên các màn hình độ phân giải cao.

### 2. Mở rộng Module Quy trình (Procedures Expansion)
- **Issue Process**: Triển khai chi tiết 4 giai đoạn xử lý vấn đề (Identify, Report, Log, Resolve).
- **Specialty Knowledge**: Hoàn thiện tài liệu kỹ thuật cho STR Modeling, PT & REO, và Lateral Design.

### 3. Sửa lỗi & Hoàn thiện (Fixes)
- **Workflows Error Fix**: Sửa lỗi thiếu import icon (Zap, ShieldCheck) và lỗi render SVG path.
- **Navigation Logs**: Thêm debug logging để theo dõi trạng thái `activeTab` trong App.jsx.

## [VERSION 4.7.0] - 2026-05-11 (DỰ KIẾN)
### "System Modularization & Data Integrity"

### 1. Tái cấu trúc Quy mô lớn (Large Scale Refactoring)
- **CSVProcessor Deconstruction**: Chia tách triệt để file 114KB thành thư mục `/components/CSVProcessor/` chứa các sub-components.
- **Logic Centralization**: Chuyển các hàm tính toán thời gian và lọc dữ liệu sang `/utils/engine.js`.

### 2. Đồng bộ Dữ liệu (Data Synchronization)
- **Supabase Bridge**: Kết nối hoàn chỉnh `PerformanceReview.jsx` với live stream dữ liệu từ Supabase.
- **Offline Support**: Cải thiện cơ chế fallback sang LocalStorage khi mất kết nối.

### 3. Nâng cấp Giao diện (UI Enhancements)
- **Tab Persistence**: Lưu trạng thái tab hiện tại vào `localStorage` để không bị mất khi reload trang.
- **Global Search**: Triển khai thanh tìm kiếm trên TopBar có khả năng tìm kiếm nhanh dự án và nhân sự.

---
**Kế hoạch tiếp theo (Next Steps):**
- [ ] Thực hiện Giai đoạn 2 của việc tách file `CSVProcessor`.
- [ ] Xây dựng `PerformanceEngine.js` để tập trung logic tính toán OT và Efficiency.
- [ ] Kiểm tra độ tương thích của các animation mới trên thiết bị cấu hình thấp.
- [ ] Cập nhật định kỳ tài liệu `code_review.md`.

---
*Vị trí file này: /core/update_plan.md*
