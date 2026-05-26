# Kế hoạch Triển khai: Tính năng Tải xuống Hàng loạt (Batch Download)

## 1. Mục tiêu
Cho phép người dùng lọc danh sách bản vẽ theo `rev_date` và `rev_value`, chọn nhiều bản vẽ (checkboxes) và tải xuống hàng loạt (PDF/DWG) từ Google Drive.

## 2. Giao diện người dùng (UI) cần bổ sung

### 2.1. Thanh công cụ (Toolbar / Filter Area)
- **Dropdown/Input `rev_date`**: Cho phép người dùng lọc bảng theo ngày phát hành.
- **Dropdown/Input `rev_value`**: Cho phép người dùng lọc theo mã revision.
- **Checkbox "Tải PDF" & "Tải DWG"**: Người dùng chọn định dạng muốn tải xuống (mặc định chọn cả hai hoặc chỉ PDF).
- **Nút "Download All"**: Nút kích hoạt quá trình tải xuống cho các hàng đang được chọn.

### 2.2. Bảng dữ liệu (Table)
- **Cột Checkbox (Cột đầu tiên)**:
  - Checkbox trên Header (Select All): Khi click sẽ chỉ check/uncheck **những hàng đang hiển thị** (thỏa mãn bộ lọc).
  - Checkbox trên từng Row: Chọn riêng lẻ bản vẽ.

## 3. Logic & State Management

### 3.1. States cần thêm trong `DrawingRegisterView`
```javascript
const [filterRevDate, setFilterRevDate] = useState('');
const [filterRevValue, setFilterRevValue] = useState('');
const [selectedRows, setSelectedRows] = useState(new Set()); // Lưu danh sách sheetNo đang được chọn
const [downloadTypes, setDownloadTypes] = useState({ pdf: true, dwg: false }); // Tùy chọn tải
```

### 3.2. Logic Lọc Dữ liệu (Filtering)
Khi `filterRevDate` hoặc `filterRevValue` có giá trị:
- Chỉ render ra bảng những `draw` (hàng) thỏa mãn điều kiện.
- Nếu `filterRevDate` được set, kiểm tra `draw.revisions[filterRevDate]` có khớp với `filterRevValue` không (nếu có `filterRevValue`).

### 3.3. Logic "Select All"
- **Hành động**: Tính toán mảng `filteredDrawings`.
- Khi click "Select All", nếu số hàng được chọn đang nhỏ hơn số `filteredDrawings` → Chọn toàn bộ `filteredDrawings`. Ngược lại → Bỏ chọn toàn bộ.

### 3.4. Logic "Download All"
- Dựa vào danh sách `selectedRows`, duyệt qua các bản vẽ tương ứng.
- Truy xuất các URL từ `issueRecords` (`NMK_Issue`) dựa trên:
  - `sheet_number` (từ selectedRows)
  - `rev_date` và `rev_value` (ưu tiên lấy từ filter, nếu filter trống thì lấy current revision).
  - `type` (kiểm tra state `downloadTypes.pdf` và `downloadTypes.dwg`).
- **Thực thi tải xuống**: 
  - Mở URL trong iframe ẩn hoặc dùng thẻ `<a>` với thuộc tính `download` để trình duyệt tải về.
  - Lưu ý: Trình duyệt có thể chặn pop-up nếu tải quá nhiều file cùng lúc, có thể cần tạo cơ chế tải tuần tự (delay giữa các lần tải) hoặc đóng gói thành file ZIP.

## 4. Các bước triển khai (Các task cụ thể)

| Bước | Mô tả công việc | Trạng thái |
|---|---|---|
| **1** | Tạo các state cần thiết (`selectedRows`, `filterRevDate`, v.v.) trong `DrawingRegisterView.jsx` | 🕒 Pending |
| **2** | Thêm UI Filter (Dropdown/Input) và Checkbox Format (PDF/DWG) lên trên bảng. | 🕒 Pending |
| **3** | Thêm cột Checkbox vào `thead` và `tbody` của bảng. Cập nhật logic "Select All" chỉ áp dụng cho dữ liệu đã lọc. | 🕒 Pending |
| **4** | Lọc dữ liệu `registerData.drawings` dựa trên state của bộ lọc trước khi map ra các thẻ `<tr>`. | 🕒 Pending |
| **5** | Viết hàm `handleBatchDownload`: Thu thập URL từ `issueRecords` theo format đã chọn và kích hoạt tải xuống. | 🕒 Pending |
| **6** | Xử lý chống chặn popup (trình duyệt) khi tải nhiều file (tải tuần tự hoặc nén ZIP nếu cần thiết). | 🕒 Pending |

## 5. Các câu hỏi / Vấn đề cần làm rõ (Open Questions)
1. Có cần gom (ZIP) tất cả các bản vẽ lại thành 1 file không, hay cứ mở tải từng file một? (Tải từng file qua Google Drive nếu số lượng lớn có thể bị trình duyệt chặn).
2. Dropdown `rev_date` có nên tự động lấy các giá trị từ `registerData.dateColumns` để người dùng chọn dễ dàng không? (Đề xuất: Có).
