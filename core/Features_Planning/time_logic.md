# Định nghĩa Logic Tính toán Thời gian (TIME 1 - TIME 5)

Tài liệu này quy định cách tính toán các chỉ số thời gian (KPI) trong hệ thống Weekly Report:

## 1. Bảng Quy Chuẩn Các Chỉ Số Thời Gian

| Chỉ số | Tên chuẩn hóa | Logic Tính toán | Mô tả |
| :--- | :--- | :--- | :--- |
| **T1** | **PLAN TIME** | `date_start` -> `date_end` | Thời gian dự kiến hoàn thành theo kế hoạch (Working minutes). |
| **T2 & T3** | **USER TIME** | `date_start` -> `date_complete` / `date_checked` | Toàn bộ chu kỳ thời gian làm việc thực tế của Member (Gộp T2 & T3). |
| **T4** | **ONLY CHECK** | **- Task của Manager giao cho Leader (hiển thị màu vàng):**<br>$$\mathbf{\text{User Time của Leader} - \max(\text{User Time của Member})}$$<br>**- Task do Member làm:** Hiển thị `-` | Đo lường thời gian chênh lệch mà Leader chỉ làm khâu kiểm tra và nghiệm thu. |
| **T5** | **REVIEW** | `date_complete` -> `date_checked` | Thời gian nghiệm thu, duyệt và bàn giao (Review time). |

---

## 2. Chi Tiết Quy Tắc ONLY CHECK

1. **Quy tắc hiển thị màu vàng:**
   * Khi Leader nhận task từ Manager và giao lại cho member thực hiện (task con có liên kết `parent_id`):
     * **Dòng task của Manager giao cho Leader (Task Cha) sẽ hiển thị MÀU VÀNG (`#EAB308`).**
     * Dòng task của Member (Task Con) hiển thị bình thường (màu dự án / không tô vàng).
2. **Công thức tính ONLY CHECK:**
   $$\mathbf{\text{T4}_{\text{ONLY CHECK}} = \text{User Time của Leader} - \max(\text{User Time của Member con})}$$
   * Vì các member có thể làm song song, thời gian làm thực tế của nhóm member được tính bằng thời gian của **member làm lâu nhất** ($\max$).
   * Thời gian của Leader chỉ có check chính là khoảng thời gian dôi ra sau khi member lớn nhất hoàn thành cho tới khi Leader bàn giao xong cho Manager.

---

## 3. Quy tắc Tính Working Hours

Tất cả các chỉ số trên đều được tính dựa trên **Giờ làm việc thực tế (Working Minutes)**, loại trừ:
- **Cuối tuần**: Thứ 7 và Chủ nhật.
- **Ngoài giờ làm việc**:
    - Sáng: 08:30 - 12:30
    - Chiều: 13:30 - 17:30
    - Nghỉ trưa: 12:30 - 13:30 (không tính)
- **Tổng giờ làm việc 1 ngày**: 8 giờ (480 phút).

---

## 4. Cấu hình Time Zone (GMT+7)

- **Mặc định**: Hệ thống sử dụng Time Zone **GMT+7 (Asia/Ho_Chi_Minh)**.
- **Xử lý dữ liệu**: Dữ liệu từ Supabase (UTC) sẽ được chuyển đổi sang local time của trình duyệt (GMT+7) và tính toán theo đúng ca làm việc.
