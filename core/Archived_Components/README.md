# 📦 LƯU TRỮ CORE: CÁC COMPONENT ĐÃ ĐƯỢC THÁO KHỎI WEB

Tài liệu này lưu trữ thông tin chi tiết và mã nguồn gốc của hai tab phân tích nâng cao: **Deep Analysis** và **Neural Brain**, được gỡ khỏi thanh điều hướng của Personal Space theo yêu cầu người dùng ngày 29/09/2026.

---

## 1. 🔬 Deep Analysis (`DeepAnalysisView.jsx`)

- **Vị trí lưu trữ**: [DeepAnalysisView.jsx](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/core/Archived_Components/DeepAnalysisView.jsx)
- **Tính năng chính**:
  - Biểu đồ xu hướng vận hành (Operational Pulse - Performance Trend) sử dụng Chart.js (Line chart với moving average 3 chu kỳ).
  - Phân tích khối lượng công việc theo dự án (Project Distribution - Doughnut chart).
  - Biểu đồ so sánh thời gian và số lượng task theo nhân sự (User Comparison - Bar chart).
- **Props yêu cầu**:
  - `deepAnalysisData`: Dữ liệu phân tích xu hướng và phân bổ từ `usePersonalSpaceEngine`.
  - `selectedTimeMetric`: Chuẩn thời gian đang chọn (`t1`, `t2`, `t3`,...).

---

## 2. 🧠 Neural Brain (`NeuralBrain.jsx`)

- **Vị trí lưu trữ**: [NeuralBrain.jsx](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/core/Archived_Components/NeuralBrain.jsx)
- **Tài liệu & Stylesheet đi kèm**:
  - [03_NeuralBrain.md](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/core/Archived_Components/03_NeuralBrain.md)
  - [03_neuralbrain.css](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/core/Archived_Components/03_neuralbrain.css)
- **Tính năng chính**:
  - Giao diện mô phỏng mạng nơ-ron (Neural Knowledge Graph / Radar / System Topology).
  - Phân tích hiệu suất thần kinh, chỉ số tương tác và độ kết nối dự án.
  - Ma trận trực quan hóa các cụm dữ liệu phân tán.
- **Props yêu cầu**:
  - `filteredTasks`: Mảng các task đã lọc.
  - `timeRange`: Phạm vi thời gian (`week`, `month`, `year`).
  - `setTimeRange`: Hàm thay đổi phạm vi thời gian.

---

## 3. 🔄 HƯỚNG DẪN TÁI KÍCH HOẠT (NẾU CẦN KHÔI PHỤC)

1. **Thêm lại nút Switcher**:
   - Mở file [src/components/buttons/NeumorphicPersonalSwitcher.jsx](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/components/buttons/NeumorphicPersonalSwitcher.jsx).
   - Bổ sung lại:
     ```jsx
     { id: 'deep-analysis', label: 'DEEP ANALYSIS', icon: <DeepAnalysisIcon />, color: 'text-indigo-500' },
     { id: 'neural-brain', label: 'NEURAL BRAIN', icon: <NeuralBrainIcon />, color: 'text-purple-500' }
     ```
2. **Khai báo Render trong Personal Space**:
   - Mở file [src/components/PersonalSpace.jsx](file:///c:/Users/Johnny%20Nguyen/OneDrive%20-%20APEX%20SOUTHERN%20CROSS%20ENGINEERING/CSharp/REPORT/Report/src/components/PersonalSpace.jsx).
   - Import lại component và thêm điều kiện render theo `viewMode === 'deep-analysis'` hoặc `viewMode === 'neural-brain'`.
