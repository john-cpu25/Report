# Định nghĩa Logic Tính toán Thời gian (TIME 1 - TIME 5)

Tài liệu này quy định cách tính toán các chỉ số thời gian (KPI) trong hệ thống Weekly Report.

## 1. Các Chỉ số Thời gian (Metrics)

| Chỉ số | Tên gọi | Logic Tính toán | Mô tả |
| :--- | :--- | :--- | :--- |
| **TIME 1** | Target Duration | `date_start` -> `date_end` | Thời gian dự kiến hoàn thành theo kế hoạch. |
| **TIME 2** | Actual Completion | `date_start` -> `date_complete` | Thời gian thực tế từ khi bắt đầu kế hoạch đến khi xong. |
| **TIME 3** | Full Cycle | `date_start` -> `date_checked` | Tổng thời gian từ kế hoạch đến khi được kiểm tra (Deliver). |
| **TIME 4** | Pure Processing | `date_started` -> `date_checked` | Thời gian thực tế thực hiện (từ lúc bắt đầu làm đến lúc xong). |
| **TIME 5** | System Lead Time | `created_at` -> `date_checked` | Tổng thời gian tồn tại trong hệ thống. |

## 2. Quy tắc Tính Working Hours

Tất cả các chỉ số trên đều được tính dựa trên **Giờ làm việc thực tế (Working Minutes)**, loại trừ:
- **Cuối tuần**: Thứ 7 và Chủ nhật.
- **Ngoài giờ làm việc**:
    - Sáng: 08:30 - 12:30
    - Chiều: 13:30 - 17:30
    - Nghỉ trưa: 12:30 - 13:30 (không tính)
- **Tổng giờ làm việc 1 ngày**: 8 giờ (480 phút).

## 3. Cấu hình Time Zone (GMT+7)

- **Mặc định**: Hệ thống sử dụng Time Zone **GMT+7 (Asia/Ho_Chi_Minh)**.
- **Xử lý dữ liệu**: 
    - Dữ liệu từ Supabase (UTC) sẽ được chuyển đổi sang local time của trình duyệt (thường là +7 đối với người dùng Việt Nam).
    - Các hàm xử lý trong `csvHelpers.js` và `performanceEngine.js` đảm bảo tính toán khớp với múi giờ +7 bằng cách sử dụng các đối tượng `Date` chuẩn và cấu hình giờ làm việc (09:00 - 18:00).

## 4. Triển khai trong Code

- **Engine**: `src/utils/performanceEngine.js` -> Hàm `calculateTaskMetrics`.
- **UI**: `src/CSVProcessor.jsx` hiển thị các chỉ số này trong bảng phân tích và biểu đồ.
