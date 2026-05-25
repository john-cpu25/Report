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

## [VERSION 4.8.5] - 2026-05-16 (COMPLETED)
### "Dashboard Synchronization & Neumorphic Design"

### 1. Đồng bộ Giao diện (Layout Sync)
- [x] **Precise Alignment**: Gióng hàng Logo và Nội dung theo trục dọc **10px** chuẩn xác.
- [x] **Indentation Fix**: Loại bỏ Padding dư thừa, đồng nhất lề trái cho toàn bộ Dashboard.
- [x] **Market Intelligence V2**: Tối giản hóa, đưa về dạng Compact (12px padding) đồng bộ với Team Cards.

### 2. Hệ thống Neumorphism (Tactile UI)
- [x] **Global CSS Templates**: Lưu bộ class `.neu-button`, `.neu-raised`, `.neu-inset` vào `index.css`.
- [x] **Interactive Selectors**: Áp dụng phong cách 3D cho bộ chọn Team, Time Range và Chart Type.
- [x] **Theme-Aware Shadows**: Tự động điều chỉnh đổ bóng Neumorphic cho cả Light và Dark Mode.

---

## [VERSION 4.9.0] - 2026-05-17 (ĐÃ HOÀN THÀNH)
### "Personal Workspace & Data Visibility"

### 1. Phân quyền Hiển thị (Data Visibility)
- [x] **Dynamic Data Access**: Lọc dữ liệu hiển thị dựa trên chức vụ (Thay vì ẩn tab):
    - Admin/Leader: Được xem toàn bộ dữ liệu hệ thống.
    - User: Chỉ xem được các dữ liệu (task, review) liên quan trực tiếp đến họ.

### 2. Workspace Cá nhân (Personal Module)
- [x] **My Performance Tab (Không gian làm việc số)**: 
    - **Ý nghĩa:** Cấu trúc thẻ (card) và giao diện vẫn giữ nguyên như Dashboard tổng, nhưng chỉ hiển thị các task đang làm của chính User đó (không bị lẫn lộn dữ liệu với người khác).
- [x] **Self-Data Filtering**: Tự động lọc dữ liệu của User đang đăng nhập.
    - **Phạm vi áp dụng:** Chính xác, nó được áp dụng làm luật cốt lõi cho tab **Personal** này. Đồng thời, nó cũng sẽ được dùng làm "bộ lọc cứng" cho các tab khác (như Data Analyst) để đảm bảo User thường thì đi đâu cũng chỉ thấy data của họ.
- [x] **Weekly Detailed View**: Chế độ xem chi tiết theo từng tuần với biểu đồ hiệu suất cá nhân.

### 3. Quản lý Đội ngũ (Team Management)
- [x] **Live Operative Roster**: Theo dõi trạng thái làm việc (Busy/Free) của nhân sự trên Dashboard.
    - **Ý nghĩa:** Tự động phân loại nhân sự trong team thành các nhóm: Đang bận làm task (Busy/WK), Đang rảnh rỗi chờ việc (Free/AV), hoặc Đang nghỉ phép (Leave/LV) dựa trên dữ liệu khai báo thực tế trong ngày.
    - **Phân quyền:** Admin thấy được tình trạng của tất cả các team. Leader/User chỉ thấy tình trạng (Busy/Free) của team mình, các thẻ team khác sẽ bị ẩn thông tin và hiển thị "NO TASKS TODAY" để bảo mật.
- [x] **Capacity Planning**: Đánh giá tải trọng công việc (Workload) của từng team.
    - **Mục đích:** So sánh tổng số giờ task đang được giao với tổng quỹ thời gian có sẵn của team (sau khi trừ người nghỉ phép).
    - **Lợi ích:** Giúp Leader/Admin nhìn ra ngay team nào đang bị quá tải (Overloaded) hoặc đang rảnh rỗi (Underutilized) để phân bổ dự án hợp lý.

---

## [VERSION 5.0.0] - 2026-05-17 (ĐÃ HOÀN THÀNH)
### "Architecture Overhaul & Deep Optimization"
Dựa trên báo cáo `code_review.md` và `deep_analysis.md`, phiên bản này tập trung giải quyết nợ kỹ thuật và cải thiện hiệu năng cốt lõi.

### 1. Refactoring Nguyên khối (Monolithic Refactor)
- [x] **PersonalSpace Breakdown**: Chia nhỏ tệp `PersonalSpace.jsx` khổng lồ thành các View độc lập (`TimesheetView`, `ProjectView`, `GanttView`, `DeepAnalysisView`).
- [x] **Centralized Performance Engine**: Dời toàn bộ logic tính toán phức tạp vào bộ não dùng chung (`PersonalSpaceEngine.js`).
- [x] **Data Normalization Adapter**: Chuẩn hóa dữ liệu thô (`trim()`, `toUpperCase()`) trong `dataProcessor.js` trước khi đẩy vào State.

### 2. Quản lý Luồng Dữ liệu (State Management)
- [ ] **Context API Integration**: Áp dụng Global State cho `User Profile`, `Project List` thay vì Prop Drilling.
- [ ] **React Query/SWR**: Quản lý fetching dữ liệu từ Supabase (Cache, Background Sync, Optimistic UI).

### 3. Tối ưu Hiệu năng (Performance Tuning)
- [ ] **Data Virtualization**: Áp dụng `react-window` cho các bảng dữ liệu quá lớn để chống giật lag UI.
- [ ] **Web Workers Offloading**: Chuyển các phép tính toán O(N*M) phức tạp sang luồng chạy ngầm.
- [ ] **Stable Memoization**: Khắc phục lỗi re-render bằng cách ổn định Dependency Array cho `useMemo` và `useCallback`.

---
**Kế hoạch tiếp theo (Next Steps):**
- [x] Áp dụng Neumorphism cho toàn bộ hệ thống Tab (Annual Leave).
- [x] Triển khai dọn dẹp và xoá bỏ hoàn toàn 2 tab cũ (CSVProcessor & PerformanceReview) khỏi hệ thống.
- [x] Đại trùng tu giao diện Kệ sách Dự án (Projects Bookshelf) thành 3D chân thực, hỗ trợ cuộn ngang vô tận với nút điều hướng bằng đồng và chặn sách gỗ Mahogany.
- [x] Triển khai trải nghiệm Mở Sách 3D (3D Open Book) trực quan sinh động khi click xem chi tiết dự án.
- [x] Sửa lỗi hiển thị bị cắt đầu (clipping) của linh vật mèo cam 3D khi nhảy trên kệ sách.
- [ ] Triển khai tính năng Kéo thả Sơ đồ Tổ chức (theo `ORG_CHART_DRAG_DROP_PLAN.md`).

---
*Vị trí file này: /core/update_plan.md*
