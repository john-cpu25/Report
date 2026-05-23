# Kế Hoạch Bóc Tách UI (Refactoring) Cho Các Tab Còn Lại

**Mục tiêu:** 
Tiếp nối thành công của việc bóc tách UI ở `Projects` và `TopBar`, chúng ta sẽ áp dụng triệt để nguyên tắc **Tách biệt Logic và Giao diện (Separation of Concerns)** cho tất cả các tab còn lại. 
Tất cả các class Tailwind dài dòng và CSS nội tuyến (`style={{}}`) sẽ được dời sang thư mục `src/UI/`.

## Danh Sách Các Tab Cần Xử Lý

1. 📅 **Weekly Planner** -> Component: `src/WeeklyReport.jsx`
2. 📝 **Planning** -> Component: `src/components/Planning.jsx`
3. 🗂️ **Organization** -> Component: `src/components/OrgChart.jsx`
4. 👤 **Personal** -> Component: `src/components/PersonalSpace.jsx`
5. 🧠 **Neural Brain** -> Component: `src/components/NeuralBrain.jsx`
6. 🏖️ **Annual Leave** -> Component: `src/components/AnnualLeave.jsx`
7. ⚠️ **Issues** -> Component: `src/components/DrawingsManager.jsx`
8. 📚 **Library** -> Component: `src/components/Workflows.jsx`

## Kế Hoạch Thực Thi (Phân làm 3 Giai Đoạn)

### Giai Đoạn 1: Nhóm Quản Lý Cá Nhân & Lên Kế Hoạch
Nhóm này thường chứa nhiều thẻ thông tin phức tạp.
- `src/UI/05_weekly_planner.css` -> Dành cho `WeeklyReport.jsx` (Giao diện bảng biểu, cột thứ)
- `src/UI/06_planning.css` -> Dành cho `Planning.jsx` (Các thẻ task, drag & drop)
- `src/UI/07_personal.css` -> Dành cho `PersonalSpace.jsx` (Bảng thống kê cá nhân, avatar)

### Giai Đoạn 2: Nhóm Cấu Trúc & Quản Lý Dữ Liệu
Nhóm này thiên về hiển thị cây thư mục và danh sách.
- `src/UI/08_org_chart.css` -> Dành cho `OrgChart.jsx` (Sơ đồ tổ chức, đường nối)
- `src/UI/09_annual_leave.css` -> Dành cho `AnnualLeave.jsx` (Lịch nghỉ phép, progress bar)

### Giai Đoạn 3: Nhóm Nâng Cao & Thư Viện
- `src/UI/10_neural_brain.css` -> Dành cho `NeuralBrain.jsx` (Các khối AI, chat UI)
- `src/UI/11_issues.css` -> Dành cho `DrawingsManager.jsx` (Bảng danh sách issue/bản vẽ)
- `src/UI/12_library.css` -> Dành cho `Workflows.jsx` (Danh sách quy trình, thư viện)

## Quy trình chuẩn cho mỗi file:
1. **Quét Component:** Đọc file `.jsx` để tìm các div có class Tailwind > 5 thuộc tính.
2. **Tạo Class Ngữ Nghĩa:** Chuyển sang file `.css` với tên class bám sát chức năng (ví dụ: `.weekly-table-header`, `.org-node-card`).
3. **Thay Thế:** Xóa class cũ trong file `.jsx` và thay bằng class mới.
4. **Xác Nhận UI:** Đảm bảo layout 100% không biến dạng so với bản gốc.
