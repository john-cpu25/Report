# Kế hoạch Thực hiện - VERSION 4.7.0 "System Modularization & Data Integrity"

Tài liệu này phác thảo các bước kỹ thuật để tái cấu trúc các thành phần cốt lõi, tối ưu hóa quản lý trạng thái và hoàn thiện cầu nối dữ liệu với Supabase dựa trên bản [Phân tích chuyên sâu](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/core/deep_analysis.md).

## Yêu cầu Người dùng Xem xét

> [!IMPORTANT]
> Bản cập nhật này bao gồm những thay đổi đáng kể về cấu trúc tệp và phân cấp component. Mặc dù nó cải thiện hiệu suất và khả năng bảo trì, nhưng cần phải xác minh cẩn thận các luồng dữ liệu để đảm bảo không có sai lệch trong logic xử lý CSV.

## Các Thay đổi Đề xuất

### 1. Mô-đun hóa Component (Tái cấu trúc file Monolithic)

#### [NEW] [Thư mục CSVProcessor](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/CSVProcessor/)
Tạo một thư mục riêng cho các sub-components được tách ra từ file `CSVProcessor.jsx` (114KB).
- `DataUploader.jsx`: Xử lý đầu vào tệp CSV/XLSX và phân tích thô.
- `StatCards.jsx`: Hiển thị các thẻ thống kê tổng hợp phía trên.
- `FilterBar.jsx`: Quản lý logic lọc phức tạp cho dự án, người dùng và nhóm.
- `DataTable.jsx`: Component thuần hiển thị cho danh sách nhiệm vụ.

#### [MODIFY] [CSVProcessor.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/CSVProcessor.jsx)
- Chuyển đổi từ một file duy nhất sang một component "Container" điều phối các sub-components mới.
- Di chuyển logic nghiệp vụ (vòng lặp phân tích, tính toán thời gian) sang một tệp tiện ích riêng.

---

### 2. Tối ưu hóa Quản lý Trạng thái (State Management)

#### [NEW] [AppContext.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/context/AppContext.jsx)
Triển khai React Context API để loại bỏ tình trạng "Prop Drilling" cho các trạng thái toàn cục.
- **Global States**: `theme`, `background`, `activeTab`, `selectedDate`, `allProjects`.
- **Hooks**: Tạo custom hook `useApp()` để truy cập trạng thái dễ dàng.

#### [MODIFY] [App.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/App.jsx)
- Bọc ứng dụng trong `AppProvider`.
- Loại bỏ việc truyền props sâu cho `Sidebar`, `TopBar` và các component chính.

---

### 3. Tập trung Logic & Hiệu năng

#### [NEW] [performanceEngine.js](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/utils/performanceEngine.js)
Tập trung tất cả logic tính toán được sử dụng bởi cả `CSVProcessor` và `PerformanceReview`.
- `calculateEfficiency(logs, standardHours)`
- `formatDuration(minutes)`
- `processDateRange(start, end)`

#### [MODIFY] [WeeklyReport.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/WeeklyReport.jsx)
- Triển khai `React.memo` cho các component `TaskRow`.
- Sử dụng `useCallback` cho các hàm xử lý sự kiện truyền xuống các danh sách lớn.

---

### 4. Cầu nối Dữ liệu (Supabase Integration)

#### [MODIFY] [PerformanceReview.jsx](file:///c:/Users/nguye/OneDrive/AI/REPORT/weekly-report-web/src/components/PerformanceReview.jsx)
- Chuyển đổi từ dữ liệu giả lập trong `localStorage` sang fetch trực tiếp từ bảng `NMK_WeeklyReport`.
- Triển khai mô hình "Data Bridge" hợp nhất dữ liệu Supabase với các ghi đè thủ công được lưu trong `localStorage`.

## Kế hoạch Xác minh (Verification Plan)

1. **Tính toàn vẹn CSV**: Tải lên tệp mẫu `Book1.csv` và đảm bảo các số liệu thống kê và kết quả bảng khớp với các phiên bản trước đó.
2. **Trạng thái Điều hướng**: Refresh trang ở các tab khác nhau để xác minh rằng tab và ngày đã chọn vẫn được duy trì.
3. **Kiểm tra Hiệu năng**: Sử dụng Chrome DevTools (tab Performance) để xác minh rằng việc nhập liệu trong các bộ lọc không gây ra sụt giảm khung hình (frame drops).
4. **Theme Toggle**: Xác minh rằng việc thay đổi theme trong `Settings` sẽ cập nhật toàn bộ ứng dụng ngay lập tức thông qua Context.

## Câu hỏi Mở
- Chúng ta nên triển khai **React Query** ngay bây giờ hay tiếp tục sử dụng `useEffect` cho việc fetch dữ liệu Supabase trong phiên bản này?
- Có công thức tính toán "Efficiency" (Hiệu suất) cụ thể nào cần được tiêu chuẩn hóa trong `performanceEngine.js` mới không?
