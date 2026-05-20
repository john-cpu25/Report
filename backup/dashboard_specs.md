# THÔNG SỐ THIẾT KẾ DASHBOARD - BACKUP SPECIFICATIONS

Tài liệu này lưu trữ toàn bộ các thông số kích thước pixel (PX) chi tiết, khoảng cách (Spacing), căn lề (Padding/Margin), bo góc (Border-Radius), và cấu trúc lưới (Grid) của giao diện Dashboard hiện tại (tại thời điểm ngày 19/05/2026).

---

## 🖥️ I. THÔNG SỐ TOÀN MÀN HÌNH & SIDEBAR
* **Độ phân giải chụp ảnh màn hình chuẩn:** `2974 x 1363px`
* **Padding chính của khung `<main>`:** `p-[10px]` (Trái: `10px`, Phải: `10px`).
* **Khoảng cách Top Margin của Dashboard:** `marginTop: '12px'`.

### 1. Trạng thái Sidebar Mở rộng (Expanded)
* **Chiều rộng Sidebar:** **`260px`**
* **Chiều rộng vùng hiển thị Grid khả dụng:** `2974px - 260px - 20px = 2694px`
* **Chiều rộng Left Grid (Vùng 4 nhóm - `xl:col-span-8`):** **`1788px`**
* **Chiều rộng Right Grid (Market Intelligence - `xl:col-span-4`):** **`882px`**
* **Khoảng cách giữa hai Grid chính (Gap):** `24px` (`gap-6`).

### 2. Trạng thái Sidebar Thu nhỏ (Collapsed)
* **Chiều rộng Sidebar:** **`80px`**
* **Chiều rộng vùng hiển thị Grid khả dụng:** `2974px - 80px - 20px = 2874px`
* **Chiều rộng Left Grid (Vùng 4 nhóm - `xl:col-span-8`):** **`1908px`** (Tăng thêm **`120px`**).
* **Chiều rộng Right Grid (Market Intelligence - `xl:col-span-4`):** **`942px`** (Tăng thêm **`60px`**).
* **Khoảng cách giữa hai Grid chính (Gap):** `24px` (`gap-6`).

---

## 📊 II. THÔNG SỐ CHI TIẾT CỦA VÙNG 4 NHÓM (LEFT GRID)
Vùng khoanh đỏ bao gồm 4 thẻ nhóm được sắp xếp theo dạng lưới 2 cột và 2 hàng.

### 1. Bố cục tổng thể (Grid Layout)
* **Cấu trúc Grid:** `grid grid-cols-1 md:grid-cols-2` (Tự động chia thành 2 cột đều nhau).
* **Khoảng cách giữa các thẻ nhóm (Gap):** `gap-4` (tương đương **`16px`**).
* **Chiều cao tổng thể của toàn bộ vùng 4 nhóm:** **`258px`**.
  * *Công thức tính: `(20px Tiêu đề + 101px Chiều cao Card) * 2 hàng + 16px (gap-4) = 258px`.*

### 2. Tiêu đề của từng nhóm (STR MODELING, PT & REO...)
* **Cỡ chữ (Font Size):** `text-xs` (tương đương **`12px`**).
* **Kiểu chữ:** `font-bold` (Chữ in đậm), `uppercase` (Chữ in hoa), `tracking-wider` (Giãn chữ rộng).
* **Khoảng cách phía dưới (Margin Bottom):** `mb-1` (tương đương **`4px`**).
* **Chiều cao ước tính:** **`20px`** (gồm cả dòng chữ và khoảng cách đệm).

### 3. Thẻ thông tin nhóm (Team Card Element)
* **Màu nền (Background):** `bg-[var(--glass-bg)]` kết hợp với hiệu ứng kính mờ `backdrop-blur-md`.
* **Đường viền (Border):** `border border-[var(--glass-border)]` (1px).
* **Độ bo góc (Border-Radius):** **`rounded-2xl`** (tương đương **`16px`**).
* **Đệm trong (Padding):** Set cứng **`12px`** (`style={{ padding: '12px' }}`).
* **Khoảng cách giữa cột Trái & Phải trong thẻ:** `gap-3` (tương đương **`12px`**).
* **Chiều cao thực tế của thẻ (Card Height):** **`101px`** (tính cả viền).

#### A. Cột bên trái (Thông tin số lượng thành viên & trạng thái):
* **Chiều rộng cố định:** `w-[120px]` (tương đương **`120px`**).
* **Cỡ chữ số lượng (Members):** `text-[10px]` (**`10px`**).
* **Trạng thái (BUSY / FREE / LEAVE):**
  * Cỡ chữ: `text-[10px]` (**`10px`**).
  * Chiều rộng nhãn text (`BUSY:`, `FREE:`, `LEAVE:`): Cố định `w-[45px]` (**`45px`**).
  * Kích thước chấm tròn màu sắc: `w-1.5 h-1.5` (bo tròn `rounded-full`).
  * Khoảng cách dòng: `gap-1.5` (**`6px`**), margin dọc là `my-1` (**`4px`**).

#### B. Cột bên phải (Khung danh sách công việc hôm nay - Daily Tasks Box):
* **Chiều cao cố định:** `h-[75px]` (tương đương **`75px`**).
* **Màu nền phụ:** `bg-[var(--bg-surface)]/50` kết hợp `border border-[var(--border)]`.
* **Độ bo góc:** `rounded-xl` (tương đương **`12px`**).
* **Đệm trong (Padding):** `p-2.5` (tương đương **`10px`**).
* **Kích thước font chữ công việc:** `text-[10px]` (**`10px`**).

---

## 📁 III. CHI TIẾT TỆP BACKUP CODE
* **Đường dẫn tệp code backup:** [backup/Dashboard.jsx](file:///c:/Users/Nhan/OneDrive - Rincovitch/00. Nhan/CSharp/REPORT/Report/backup/Dashboard.jsx)
* **Đường dẫn tệp thông số thiết kế:** [backup/dashboard_specs.md](file:///c:/Users/Nhan/OneDrive - Rincovitch/00. Nhan/CSharp/REPORT/Report/backup/dashboard_specs.md)
