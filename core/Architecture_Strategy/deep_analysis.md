# Phân tích Kỹ thuật Chuyên sâu (Deep Technical Analysis)

Tài liệu này cung cấp các phân tích chi tiết về hiệu năng, luồng dữ liệu và kiến trúc của hệ thống Weekly Report Web, tập trung vào các điểm nghẽn kỹ thuật và cơ hội tối ưu hóa.

## 1. Phân tích Hiệu năng Rendering (Rendering Performance)

### 1.1. Rủi ro Re-render diện rộng [⏳ CHƯA HOÀN THÀNH]
- **Vấn đề**: Trong `App.jsx`, hầu hết các state quan trọng (reportData, selectedDate, theme) đều được quản lý tại component gốc. Khi một state thay đổi (ví dụ: gõ text vào thanh tìm kiếm), toàn bộ cây component có thể bị re-render nếu không được bọc trong `React.memo`.
- **Điểm nghẽn**: `CSVProcessor.jsx` và `WeeklyReport.jsx` chứa hàng nghìn dòng mã JSX và logic phức tạp. Việc re-render các component này mà không có cơ chế `windowing` (như react-window) cho các bảng dữ liệu lớn sẽ gây ra hiện tượng giật (lag) giao diện.

### 1.2. Tối ưu hóa tính toán (Memoization) [⏳ CHƯA HOÀN THÀNH]
- **Hiện trạng**: Sử dụng `useMemo` khá nhiều trong `CSVProcessor.jsx`. Tuy nhiên, các dependency array thường bao gồm các object lớn. 
- **Rủi ro**: Nếu các dependency này được tạo mới ở mỗi lần render của component cha, `useMemo` sẽ mất tác dụng. 
- **Giải pháp**: Áp dụng `useCallback` cho các hàm handler và đảm bảo các dependency là stable (nguyên thủy hoặc được memo).

## 2. Luồng Dữ liệu & Quản lý Trạng thái (Data Flow & State)

### 2.1. Prop Drilling [✅ ĐÃ HOÀN THÀNH]
- **Vấn đề**: Dữ liệu từ Supabase và LocalStorage phải đi qua nhiều cấp component (App -> Main -> Tab -> Table). 
- **Hệ quả**: Khó theo dõi nguồn gốc thay đổi dữ liệu và gây khó khăn khi refactoring.
- **Đề xuất**: Sử dụng **React Context API** cho các dữ liệu toàn cục như `User Profile`, `Project List` và `System Settings`.

### 2.2. Chiến lược đồng bộ Supabase [⏳ CHƯA HOÀN THÀNH]
- **Hiện trạng**: Fetch dữ liệu thủ công trong `useEffect`.
- **Rủi ro**: Thiếu cơ chế xử lý lỗi mạng (retries) và không có "Optimistic UI" khi lưu dữ liệu.
- **Giải pháp**: Tích hợp **React Query** (hoặc SWR) để quản lý cache, trạng thái loading/error và đồng bộ hóa nền (background sync).

## 3. Phân tích Logic Xử lý Dữ liệu (Data Processing)

### 3.1. Độ phức tạp thuật toán (Big O) [⏳ CHƯA HOÀN THÀNH]
- **Vấn đề**: Hàm `weeklyReportData` trong `CSVProcessor.jsx` thực hiện gộp (grouping), lọc (filtering) và tính toán (aggregation) trong cùng một vòng lặp trên hàng nghìn bản ghi.
- **Chi phí**: O(N*M) với N là số bản ghi và M là số tiêu chí lọc. 
- **Tối ưu**: Chuyển việc lọc/gộp dữ liệu sang phía Backend (Supabase queries) hoặc sử dụng **Web Workers** để xử lý các phép toán nặng ở một luồng riêng, tránh làm đóng băng UI thread.

### 3.2. Chuẩn hóa dữ liệu (Data Normalization) [⏳ CHƯA HOÀN THÀNH]
- **Vấn đề**: Dữ liệu thô từ CSV/Supabase thường chứa các chuỗi ký tự không đồng nhất (ví dụ: "STR MODELING" vs "str modeling"). 
- **Hệ quả**: Logic `if-else` và `.toLowerCase()` xuất hiện dày đặc trong code UI.
- **Giải pháp**: Xây dựng một lớp **Adapter** để chuẩn hóa dữ liệu ngay khi vừa fetch về trước khi đưa vào state của React.

## 4. Kiến trúc Giao diện (Aesthetics & Animations)

### 4.1. Framer Motion Overhead [⏳ CHƯA HOÀN THÀNH]
- **Đánh giá**: Animation rất mượt mà nhưng việc lạm dụng `AnimatePresence` trên các danh sách lớn có thể gây tốn tài nguyên GPU.
- **Tối ưu**: Sử dụng `layoutId` một cách cẩn trọng và tắt các hiệu ứng blur/shadow phức tạp trên các thiết bị mobile/low-end thông qua việc kiểm tra `matchMedia`.

### 4.2. CSS Strategy [✅ ĐÃ HOÀN THÀNH]
- **Ưu điểm**: Tailwind CSS giúp giữ dung lượng CSS thấp.
- **Nhược điểm**: Một số class động (dynamic classes) như `bg-${color}-500` đang bị phụ thuộc vào việc Tailwind không tree-shake các màu đó. 
- **Giải pháp**: Sử dụng `safelist` trong config của Tailwind hoặc chuyển sang inline style cho các màu sắc động.

## 5. Lỗi Nghiêm Trọng Vừa Phát Hiện (CRITICAL BUGS)

### 5.1. Vi phạm tính bất biến (Immutability Violation) trong AppContext [✅ ĐÃ FIX XONG]
- **Vấn đề**: Trong hàm `handleAddTask` của `AppContext.jsx`, code từng tạo mảng mới bằng `[...reportData]` nhưng lại trực tiếp thay đổi (mutate) object bên trong mảng đó.
- **Hệ quả**: Gây lỗi không re-render UI khi update dữ liệu task do React shallow compare không nhận diện được vùng nhớ mới.
- **Trạng thái hiện tại**: Đã được AI sửa lại toàn bộ bằng kỹ thuật Spread Operator (`...`) để phân bổ vùng nhớ mới đúng chuẩn React Immutability. Lỗi đã được khắc phục hoàn toàn.

## 6. Kết luận & Ưu tiên (Conclusion)

1. **Ưu tiên 1 (Khẩn cấp)**: Sửa ngay lỗi Immutability trong `AppContext.jsx` để tránh sập UI.
2. **Ưu tiên 2**: Tách logic xử lý dữ liệu nặng ra khỏi component UI.
3. **Ưu tiên 3**: Tối ưu hóa các bảng dữ liệu lớn bằng kỹ thuật Virtualization.

---
*Người phân tích: Antigravity Assistant (AI Engineer)*
*Ngày: 2026-05-25 (Đã review và cập nhật)*
