# Đặc Tả Cột `is_onlychecked` & Quy Tắc Tính ONLY CHECK

Tài liệu này mô tả chi tiết ý nghĩa nghiệp vụ, cấu trúc dữ liệu, và cách thức hoạt động của trường **`is_onlychecked`** trong bảng **`NMK_Task`** trên Supabase và hệ thống ứng dụng Báo cáo (Report System).

---

## 1. Nguyên Tắc Cốt Lõi (Core Business Rule)

> [!IMPORTANT]
> **Task của Manager giao cho Leader, nếu Leader giao lại cho Member thì dòng task của Manager giao cho Leader sẽ hiển thị MÀU VÀNG. Cách tính thời gian ONLY CHECK sẽ là:**
> $$\mathbf{\text{ONLY CHECK} = \text{User Time của Leader} - \max(\text{User Time của Member con})}$$

* **Dòng task của Manager giao cho Leader (Task Cha - Dòng dưới):**
  - **Màu sắc:** Hiển thị **MÀU VÀNG (`#EAB308`)** và mang cờ `is_onlychecked = TRUE`.
  - **`PLAN TIME`:** Thời gian kế hoạch của task do Manager giao.
  - **`USER TIME`:** Hiển thị **`-`** *(vì Leader không trực tiếp gia công)*.
  - **`ONLY CHECK`:** Hiển thị:
    $$\mathbf{\text{ONLY CHECK} = \text{User Time của Leader} - \max(\text{User Time của Member con})}$$

* **Dòng task của Member làm (Task Con - Dòng trên):**
  - **Màu sắc:** Hiển thị bình thường theo màu dự án (không tô vàng), `is_onlychecked = FALSE`.
  - **`USER TIME`:** Hiển thị thời gian làm việc thực tế của Member (ví dụ `5h30`).
  - **`ONLY CHECK`:** Hiển thị **`-`** *(vì Member là người làm, không phải người check)*.

---

## 2. Triển Khai Trong Mã Nguồn

* **Cơ sở dữ liệu Supabase:**
  - Task Cha của Leader mang màu vàng `#EAB308` và `is_onlychecked = true`.
  - Task Con của Member giữ màu chuẩn của dự án và `is_onlychecked = false`.
* **Engine & Logic tính toán:**
  - [`performanceEngine.js`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/utils/performanceEngine.js): Tính toán `ONLY CHECK = leaderUserTime - maxMemberUserTime`.
  - [`dataProcessor.js`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/utils/dataProcessor.js): Xây dựng map `childrenByParentId` và tra cứu User time của member lớn nhất.
  - [`UnifiedTable.jsx`](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/components/CSVProcessor/UnifiedTable.jsx): Render chuẩn hóa, dòng vàng chỉ có `ONLY CHECK`, dòng thường chỉ có `USER TIME`.
