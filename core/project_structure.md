# Kiến trúc và Cấu trúc Mã nguồn (Project Architecture)

Tài liệu này giải thích cách tổ chức mã nguồn và luồng dữ liệu bên trong ứng dụng Weekly Report Web.

## 1. Cấu trúc thư mục (Directory Structure)

- **/src**: Thư mục gốc chứa toàn bộ mã nguồn React.
    - **App.jsx**: File "Trái tim" của ứng dụng. Quản lý trạng thái tổng (Global State), Điều hướng (Tabs), và Theme.
    - **supabaseClient.js**: Điểm kết nối duy nhất tới cơ sở dữ liệu Supabase.
    - **index.css**: Hệ thống "Design System" với các biến CSS cho Galaxy và News mode.
- **/src/components**: Chứa các module tính năng độc lập.
    - `Dashboard.jsx`: Tổng quan số liệu.
    - `PerformanceReview.jsx`: Phân tích hiệu suất (Aesthetic tiêu chuẩn).
    - `AnnualLeave.jsx`: Quản lý nghỉ phép.
    - `Sidebar.jsx` & `TopBar.jsx`: Thành phần giao diện khung.
- **/src/utils**: Các hàm bổ trợ (xử lý ngày tháng, tính toán thời gian).
- **/src/data**: Các tệp dữ liệu tĩnh (JSON).

## 2. Luồng dữ liệu (Data Flow)

1. **Khởi tạo**: Khi App chạy, `App.jsx` sẽ fetch các dữ liệu cơ bản (Projects, User settings) từ Supabase hoặc LocalStorage.
2. **Quản lý State**: 
    - Các state dùng chung (như `reportData`, `theme`) được giữ ở `App.jsx`.
    - Các module (như `PerformanceReview`) sẽ nhận dữ liệu qua `props` và thực hiện logic riêng bên trong.
3. **Giao tiếp Database**: Các component trực tiếp sử dụng `supabaseClient` để truy vấn dữ liệu thời gian thực (Real-time).

## 3. Hệ thống Theme (Theming System)

- Ứng dụng sử dụng **CSS Variables** kết hợp với Tailwind CSS.
- Khi người dùng đổi theme, class `theme-galaxy` hoặc `theme-news` sẽ được gán vào thẻ `<body>`, từ đó thay đổi toàn bộ màu sắc hiển thị mà không cần load lại trang.

## 4. Định hướng phát triển (Future Scalability)

- **Auth Integration**: Sắp tới sẽ bọc toàn bộ `App.jsx` trong một `AuthProvider`.
- **Refactoring**: Các file lớn như `CSVProcessor.jsx` nên được tách nhỏ thành các sub-components trong `/src/components/CSVProcessor/`.
- **State Management**: Nếu số lượng tab tăng lên, cân nhắc sử dụng `React Context` để tránh việc truyền props quá nhiều tầng (Prop Drilling).
- AAA

---
*Vị trí file này: /core/project_structure.md*
