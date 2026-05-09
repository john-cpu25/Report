# Phân tích Quy trình: Planner -> Approval -> Sync -> Planning

Tài liệu này mô tả chi tiết quy trình nghiệp vụ mới dành cho việc lập kế hoạch công việc hàng tuần, phê duyệt và công khai dữ liệu.

## 1. Các giai đoạn của Quy trình

### Giai đoạn 1: Lập kế hoạch (Weekly Planner)
- **Đối tượng**: Manager / Team Leader.
- **Hành động**: Sử dụng giao diện Planner để kéo thả hoặc nhập các đầu việc cho tuần tới.
- **Trạng thái**: `DRAFT` (Nháp) - Chỉ người tạo mới thấy.

### Giai đoạn 2: Chia sẻ & Phê duyệt (Approval)
- **Hành động**: Leader nhấn "Submit for Review".
- **Thông báo**: Gửi yêu cầu tới Manager cấp cao hơn (Approver).
- **Trạng thái**: `PENDING` (Chờ duyệt). Approver có thể xem, nhận xét hoặc yêu cầu chỉnh sửa.

### Giai đoạn 3: Đồng bộ dữ liệu (Sync to Supabase)
- **Hành động**: Sau khi Approver nhấn "Approve".
- **Kỹ thuật**: Hệ thống tự động chuyển dữ liệu từ trạng thái chờ sang trạng thái chính thức trên Supabase.
- **Trạng thái**: `APPROVED`.

### Giai đoạn 4: Công khai & Thực hiện (Planning Tab)
- **Đối tượng**: Toàn bộ nhân viên trong công ty.
- **Hành động**: Xem bản kế hoạch đã được duyệt tại tab **Planning**.
- **Kết quả**: Đây là "Source of Truth" cho công việc trong tuần.

## 2. Yêu cầu kỹ thuật (Technical Requirements)
- **Cơ sở dữ liệu**: Bảng `NMK_Planning_Flow` với các cột `status`, `content` (JSON), `week_id`.
- **Phân quyền**: 
    - `Staff`: Chỉ đọc.
    - `Leader`: Tạo và Sửa bản nháp của mình.
    - `Manager`: Phê duyệt các bản kế hoạch của Team mình quản lý.
- **UI/UX**: 
    - Hiệu ứng Pulse Glow cho các task đang chờ duyệt.
    - Biểu đồ Timeline để dễ dàng quản lý khối lượng công việc.

---
*Ghi chú: Đây là tài liệu định hướng để phát triển trong tương lai.*
