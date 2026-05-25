# Cấu trúc Dự án & Phân cấp Mã nguồn (Project Directory Structure & Modularity)
**Phiên bản:** v5.0.0 (Overhaul & Optimization)  
**Ngày cập nhật:** 2026-05-17  
**Tác giả:** Antigravity AI Assistant & Engineering Team  

Tài liệu này giải thích chi tiết cấu trúc thư mục, sự phân chia module và sơ đồ phân cấp các thành phần giao diện bên trong ứng dụng **Weekly Report Web** sau khi hoàn thành đợt tái cấu trúc nguyên khối **V5.0.0**.

---

## 1. Sơ đồ Cấu trúc Thư mục mới (Updated Folder Hierarchy)

Hệ thống đã loại bỏ hoàn toàn các tệp monolithic cồng kềnh, chuyển dịch sang mô hình module hóa cao độ:

```
weekly-report-web/
├── core/                           # Tài liệu thiết kế, phân tích & kế hoạch dự án
│   ├── UI_OVERHAUL_STATUS.md       # Trạng thái OCD chuẩn hóa giao diện
│   ├── architecture_analysis.md    # Phân tích kiến trúc tổng thể (Supabase + GHP)
│   ├── project_structure.md        # [Tài liệu này] Cấu trúc mã nguồn chi tiết
│   └── update_plan.md              # Lộ trình và lịch sử các phiên bản
├── public/                         # Tài nguyên tĩnh công khai (hình ảnh, mascot 3D, v.v.)
│   └── assets/                     # Tài nguyên hình ảnh, Mascot 3D (mèo cam)
├── src/                            # Thư mục gốc chứa toàn bộ mã nguồn React
│   ├── assets/                     # Các logo, hình nền động tĩnh
│   ├── context/                    # Lớp quản lý trạng thái toàn cục (Global State Contexts)
│   │   ├── AppContext.jsx          # Quản lý UI layout, tab, theme, data cache & handlers
│   │   ├── AuthContext.jsx         # Quản lý SSO Microsoft, phân quyền Leader/Admin, bypass mode
│   │   └── NotificationContext.jsx # Lắng nghe thời gian thực và quản lý kênh thông báo Supabase
│   ├── services/                   # Điểm kết nối và cấu hình dịch vụ bên thứ ba
│   │   ├── authConfig.js           # Cấu hình MSAL SSO (Azure AD)
│   │   └── supabaseService.js      # Giao tiếp tập trung & API query dữ liệu Supabase
│   ├── utils/                      # Bộ não tính toán & Các hàm tiện ích dùng chung
│   │   ├── PersonalSpaceEngine.js  # Engine tính toán hiệu suất, timesheet cho Personal Space
│   │   ├── performanceEngine.js    # Logic tính toán KPI, OT & tổng hợp hiệu suất
│   │   ├── taskEngine.js           # Xử lý phân cấp, phân nhóm & lọc nhiệm vụ
│   │   ├── csvHelpers.js           # Hỗ trợ phân tích cú pháp dữ liệu CSV/XLSX
│   │   └── timeUtils.js            # Tính toán ngày làm việc, giờ công & chuyển đổi thời gian
│   ├── components/                 # Các thành phần giao diện chức năng (Modular Components)
│   │   ├── CSVProcessor/           # Module phân tích dữ liệu CSV đã được chia nhỏ
│   │   │   ├── DataUploader.jsx    # Giao diện kéo thả tải file CSV
│   │   │   ├── FilterBar.jsx       # Bộ lọc thông minh cho bảng dữ liệu đồng nhất
│   │   │   ├── StatCards.jsx       # Các thẻ hiển thị chỉ số thống kê
│   │   │   └── UnifiedTable.jsx    # Bảng hiển thị dữ liệu đồng nhất, hiệu năng cao
│   │   ├── PersonalSpace/          # Không gian làm việc cá nhân (Personal Workspace Module)
│   │   │   ├── DeepAnalysisView.jsx# Tab phân tích hiệu suất chi tiết cá nhân
│   │   │   ├── GanttView.jsx       # Tab biểu đồ thanh Gantt tiến độ công việc
│   │   │   ├── ProjectView.jsx     # Tab phân tích thời gian theo dự án
│   │   │   └── TimesheetView.jsx   # Tab chấm công và phân bổ thời gian hàng ngày
│   │   ├── AdminPanel.jsx          # Quản trị hệ thống (Chỉ Admin truy cập)
│   │   ├── AnnualLeave.jsx         # Quản lý nghỉ phép (Neumorphic Design)
│   │   ├── Dashboard.jsx           # Tổng quan số liệu (Real-time Roster & Team Pulse)
│   │   ├── OrgChart.jsx            # Sơ đồ tổ chức thông minh (Beehive Intelligence)
│   │   ├── Projects.jsx            # Giao diện kệ sách 3D & chi tiết dự án mở sách 3D
│   │   ├── Sidebar.jsx             # Thanh điều hướng trái của ứng dụng (tactile design)
│   │   ├── TopBar.jsx              # Thanh đầu trang tích hợp chuông báo real-time & stats
│   │   ├── Login.jsx               # Màn hình đăng nhập SSO
│   │   ├── ProfileModal.jsx        # Hộp thoại chi tiết hồ sơ cá nhân
│   │   └── ...                     # Các component nền tảng khác
│   ├── App.css                     # Stylesheet phụ trợ
│   ├── App.jsx                     # Component gốc (Trái tim điều hướng và bảo vệ Route)
│   ├── index.css                   # Hệ thống Design System & Các lớp tiện ích Neumorphic
│   └── main.jsx                    # Điểm khởi chạy React của ứng dụng
└── vite.config.js                  # Cấu hình đóng gói Vite (base path: /Report/)
```

---

## 2. Phân rã Các Tệp Monolithic Quan trọng (Key Deconstruction Details)

Đợt refactoring **V5.0.0** đã giải quyết triệt để 2 tệp monolithic lớn nhất hệ thống, nâng cao khả năng bảo trì và kiểm thử:

### 2.1. Module Không gian Cá nhân (`PersonalSpace`)
*   **Legacy**: Tệp `PersonalSpace.jsx` cũ dài hơn **1100 dòng**, chứa toàn bộ logic xử lý ngày tháng, timesheet, vẽ biểu đồ Gantt, phân tích chiều sâu và UI render.
*   **Hiện tại**: Được chia nhỏ thành thư mục `src/components/PersonalSpace/` chứa 4 View chuyên biệt kết nối với một bộ não xử lý tập trung:
    1.  [TimesheetView.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/PersonalSpace/TimesheetView.jsx): Chuyên trách hiển thị bảng chấm công tuần.
    2.  [ProjectView.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/PersonalSpace/ProjectView.jsx): Hiển thị tỷ trọng thời gian phân bổ vào các dự án.
    3.  [GanttView.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/PersonalSpace/GanttView.jsx): Biểu đồ Gantt thời gian thực theo dõi tiến độ task.
    4.  [DeepAnalysisView.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/PersonalSpace/DeepAnalysisView.jsx): Biểu đồ radar và phân tích chuyên sâu hiệu năng cá nhân.
    5.  [PersonalSpaceEngine.js](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/utils/PersonalSpaceEngine.js): Cô lập 100% phần xử lý tính toán hiệu suất ra khỏi giao diện hiển thị.

### 2.2. Module Phân tích Dữ liệu (`CSVProcessor`)
*   **Legacy**: File `CSVProcessor.jsx` cũ dài hơn **600 dòng** chứa logic parsing file Excel/CSV bằng thư viện `xlsx`, tính toán thống kê và giao diện bảng biểu phức tạp.
*   **Hiện tại**: Tách thành `src/components/CSVProcessor/` gồm các component độc lập:
    1.  [DataUploader.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/DataUploader.jsx): Xử lý kéo thả và phân tích cú pháp dữ liệu file.
    2.  [StatCards.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/StatCards.jsx): Thẻ thống kê động.
    3.  [FilterBar.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/FilterBar.jsx): Thanh lọc dữ liệu cấp cao.
    4.  [UnifiedTable.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/UnifiedTable.jsx): Render bảng dữ liệu tối ưu hóa re-render.

---

## 3. Điều hướng & Bảo vệ Tuyến đường (App Tab Router & Route Guards)

Việc chuyển đổi giữa các module chức năng được điều phối thông qua thuộc tính `activeTab` từ `useApp()` bên trong [App.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/App.jsx):

| Mã Tab (`activeTab`) | Component chính tương ứng | Mô tả chức năng | Quyền truy cập tối thiểu |
| :--- | :--- | :--- | :--- |
| `'dashboard'` | `Dashboard` | Tổng quan số liệu hệ thống & Roster Busy/Free | Bất kỳ |
| `'report'` | `WeeklyReport` | Nhập liệu & Bảng báo cáo công việc tuần | Bất kỳ |
| `'personal'` | `PersonalSpace` | Không gian làm việc cá nhân (Timesheet, Gantt, Radar) | Bất kỳ |
| `'leave'` | `AnnualLeave` | Đăng ký phép & Lịch nghỉ phép Neumorphic | Bất kỳ |
| `'projects'` | `Projects` | Kệ sách dự án 3D & chi tiết dự án | Bất kỳ |
| `'planning'` | `Planning` | Lên kế hoạch dự kiến hàng tuần | Bất kỳ |
| `'organization'`| `OrgChart` | Sơ đồ tổ chức "Beehive Intelligence" | Bất kỳ |
| `'workflows'` | `Workflows` | Luồng xử lý công việc và quy trình duyệt | Bất kỳ |
| `'issues'` | `DrawingsManager` | Quản lý bản vẽ lỗi kỹ thuật và sự cố | Bất kỳ |
| `'admin'` | `AdminPanel` | Quản trị phân quyền nhân sự & Dự án | **Admin** |
| `'settings'` | `Settings` | Cấu hình theme hệ thống, background | Bất kỳ |

*Lưu ý bảo vệ tuyến đường (Route Guard): Nếu người dùng thường cố tình chuyển tab sang `'admin'`, hệ thống sẽ tự động chặn và trả hướng về tab `'personal'`.*

---

## 4. Định hướng Phát triển Kiến trúc Tương lai (Future Roadmap)

Mặc dù đợt Overhaul kiến trúc V5.0.0 đã hoàn thành xuất sắc, hệ thống vẫn định hướng nâng cấp các mục tiêu hiệu năng và trải nghiệm tiếp theo:

1.  **Virtualization Bảng lớn**: Tích hợp `react-window` hoặc `react-virtualized` cho [UnifiedTable.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/UnifiedTable.jsx) khi hiển thị danh sách vượt quá 1000 dòng để đạt hiệu năng 60 FPS khi cuộn trang.
2.  **Web Workers cho Engine nặng**: Chuyển các thuật toán tính toán O(N*M) phức tạp trong `PersonalSpaceEngine.js` sang chạy dưới luồng ngầm (Web Worker), giải phóng luồng xử lý UI chính.
3.  **Kéo thả Sơ đồ tổ chức**: Triển khai khả năng kéo thả tương tác cao cho các thẻ nhân sự trong `OrgChart` theo kế hoạch của `ORG_CHART_DRAG_DROP_PLAN.md`.
