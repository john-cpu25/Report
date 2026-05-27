# Kế hoạch Triển khai: Tính năng Tải xuống Hàng loạt (Batch Download)

## 1. Mục tiêu
Cho phép người dùng lọc danh sách bản vẽ theo `rev_date` và `rev_value`, chọn nhiều bản vẽ (checkboxes) và tải xuống hàng loạt (PDF/DWG) từ Google Drive.

## 2. Giao diện người dùng (UI) cần bổ sung

### 2.1. Thanh công cụ (Toolbar / Filter Area)
- **Dropdown `rev_date`**: Cho phép người dùng lọc bảng theo ngày phát hành.
  - **Nguồn dữ liệu**: Lấy trực tiếp từ `registerData.dateColumns` để populate danh sách lựa chọn.
- **Dropdown/Input `rev_value`**: Cho phép người dùng lọc theo mã revision.
- **Checkbox "Tải PDF" & "Tải DWG"**: Người dùng chọn định dạng muốn tải xuống (mặc định chọn PDF).
- **Nút "Download All"**: Nút kích hoạt quá trình tải xuống cho các hàng đang được chọn.

### 2.2. Bảng dữ liệu (Table)
- **Cột Checkbox (Cột đầu tiên)**:
  - Checkbox trên Header (Select All): Khi click sẽ chỉ check/uncheck **những hàng đang hiển thị** (thỏa mãn bộ lọc).
  - Checkbox trên từng Row: Chọn riêng lẻ bản vẽ.

### 2.3. UX Feedback khi tải
- **Loading overlay / progress counter**: Hiển thị số file đã tải / tổng số file đang tải.
- **State `isDownloading`**: Disable nút "Download All" và hiện spinner khi đang xử lý.
- Thông báo hoàn tất khi tải xong toàn bộ.

## 3. Logic & State Management

### 3.1. States cần thêm trong `DrawingRegisterView`
```javascript
const [filterRevDate, setFilterRevDate] = useState('');
const [filterRevValue, setFilterRevValue] = useState('');
const [selectedRows, setSelectedRows] = useState(new Set()); // Lưu danh sách sheetNo đang được chọn
const [downloadTypes, setDownloadTypes] = useState({ pdf: true, dwg: false }); // Tùy chọn tải
const [isDownloading, setIsDownloading] = useState(false); // Trạng thái đang tải
const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 }); // Tiến trình
```

### 3.2. Logic Lọc Dữ liệu (Filtering)

> **LƯU Ý**: Tích hợp logic lọc mới vào `useMemo` đã có sẵn tại dòng 746–754 trong `DrawingRegisterView.jsx`, KHÔNG tạo logic lọc riêng biệt.

Khi `filterRevDate` hoặc `filterRevValue` có giá trị:
- Chỉ render ra bảng những `draw` (hàng) thỏa mãn điều kiện.
- **Nếu chỉ có `filterRevDate`** (không có `filterRevValue`): Hiện hàng có `draw.revisions[filterRevDate]` khác rỗng (tức là bản vẽ có revision tại date đó).
- **Nếu có cả `filterRevDate` + `filterRevValue`**: Kiểm tra `draw.revisions[filterRevDate] === filterRevValue`.
- **Nếu chỉ có `filterRevValue`** (không có `filterRevDate`): Kiểm tra xem có bất kỳ date nào trong `draw.revisions` có giá trị khớp `filterRevValue` hay không.

```javascript
// Mở rộng useMemo hiện tại (dòng 746–754)
const filteredDrawings = useMemo(() => {
  if (!registerData || !registerData.drawings) return [];
  return registerData.drawings.filter(d => {
    // Search filter (giữ nguyên)
    const sheetNoStr = String(d.sheetNo || '').toLowerCase();
    const sheetNameStr = String(d.sheetName || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = sheetNoStr.includes(query) || sheetNameStr.includes(query);
    if (!matchesSearch) return false;

    // Rev Date filter
    if (filterRevDate && filterRevValue) {
      return d.revisions[filterRevDate] === filterRevValue;
    }
    if (filterRevDate) {
      return !!d.revisions[filterRevDate];
    }
    if (filterRevValue) {
      return Object.values(d.revisions).some(v => v === filterRevValue);
    }
    return true;
  });
}, [registerData, searchQuery, filterRevDate, filterRevValue]);
```

### 3.3. Logic "Select All"
- **Hành động**: Tính toán mảng `filteredDrawings`.
- Khi click "Select All", nếu số hàng được chọn đang nhỏ hơn số `filteredDrawings` → Chọn toàn bộ `filteredDrawings`. Ngược lại → Bỏ chọn toàn bộ.

### 3.4. Logic "Download All"
- Dựa vào danh sách `selectedRows`, duyệt qua các bản vẽ tương ứng.
- Truy xuất các URL từ `issueRecords` (`NMK_Issue`) dựa trên:
  - `sheet_number` (từ selectedRows)
  - `rev_date` và `rev_value`:
    - **Nếu có filter**: Dùng `filterRevDate` và `filterRevValue` trực tiếp.
    - **Nếu filter trống**: Duyệt `draw.revisions` theo thứ tự date column **từ mới nhất đến cũ nhất** để tìm cặp (`date`, `revValue`) tương ứng với `currRev`.
  - `type` (kiểm tra state `downloadTypes.pdf` và `downloadTypes.dwg`).

```javascript
// Xác định rev_date khi filter trống
const resolveRevision = (draw) => {
  if (filterRevDate && filterRevValue) {
    return { date: filterRevDate, value: filterRevValue };
  }
  // Duyệt ngược dateColumns (mới nhất → cũ nhất) để tìm date chứa currRev
  const reversedDates = [...registerData.dateColumns].reverse();
  for (const date of reversedDates) {
    if (draw.revisions[date] === draw.currRev) {
      return { date, value: draw.currRev };
    }
  }
  // Fallback: lấy date cuối cùng có giá trị
  for (const date of reversedDates) {
    if (draw.revisions[date]) {
      return { date, value: draw.revisions[date] };
    }
  }
  return null;
};
```

- **Thực thi tải xuống — Phương án: Tải tuần tự qua iframe ẩn**:
  - Tạo thẻ `<a>` với `target="_blank"` cho mỗi URL Google Drive.
  - Delay 300–500ms giữa mỗi lần tải để tránh bị trình duyệt chặn popup.
  - Cập nhật `downloadProgress` sau mỗi file.

```javascript
const handleBatchDownload = async () => {
  if (selectedRows.size === 0) return;
  setIsDownloading(true);

  const selectedDrawings = filteredDrawings.filter(d => selectedRows.has(d.sheetNo));
  const urlsToDownload = [];

  selectedDrawings.forEach(draw => {
    const rev = resolveRevision(draw);
    if (!rev) return;
    const links = findIssueUrl(issueRecords, draw.sheetNo, rev.date, rev.value);
    if (downloadTypes.pdf && links.pdf) urlsToDownload.push(links.pdf.url);
    if (downloadTypes.dwg && links.dwg) urlsToDownload.push(links.dwg.url);
  });

  setDownloadProgress({ current: 0, total: urlsToDownload.length });

  for (let i = 0; i < urlsToDownload.length; i++) {
    const a = document.createElement('a');
    a.href = urlsToDownload[i];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadProgress({ current: i + 1, total: urlsToDownload.length });
    await new Promise(r => setTimeout(r, 400)); // delay chống chặn popup
  }

  setIsDownloading(false);
};
```

## 4. Các bước triển khai (Các task cụ thể)

| Bước | Mô tả công việc | Trạng thái |
|---|---|---|
| **1** | Thêm các state mới (`selectedRows`, `filterRevDate`, `filterRevValue`, `downloadTypes`, `isDownloading`, `downloadProgress`) vào `DrawingRegisterView.jsx` | ✅ Done |
| **2** | Thêm UI Filter (Dropdown `rev_date` từ `dateColumns`, Input `rev_value`) và Checkbox Format (PDF/DWG) + nút "Download All" lên toolbar. | ✅ Done |
| **3** | Thêm cột Checkbox vào `thead` và `tbody` của bảng. Implement logic "Select All" chỉ áp dụng cho dữ liệu đã lọc. | ✅ Done |
| **4** | Mở rộng `useMemo` hiện tại (dòng 746) để tích hợp `filterRevDate` + `filterRevValue` vào logic lọc. | ✅ Done |
| **5** | Viết hàm `resolveRevision` và `handleBatchDownload`: Thu thập URL từ `issueRecords`, tải tuần tự với delay 400ms. | ✅ Done |
| **6** | Thêm UX feedback: loading overlay với progress counter, disable nút khi đang tải, thông báo hoàn tất. | ✅ Done |

## 5. Quyết định thiết kế (Đã xác nhận)

| # | Câu hỏi | Quyết định |
|---|---------|-----------|
| 1 | Gom ZIP hay tải từng file? | **Tải từng file tuần tự** (delay 400ms). ZIP sẽ là phase 2 nếu cần (cần thêm `jszip`). |
| 2 | Dropdown `rev_date` lấy dữ liệu từ đâu? | Lấy từ `registerData.dateColumns`. |
| 3 | Tích hợp filter vào logic nào? | Mở rộng `useMemo` hiện tại ở dòng 746–754, KHÔNG tạo logic lọc riêng. |
| 4 | Khi filter trống, download lấy revision nào? | Duyệt `dateColumns` ngược (mới nhất → cũ nhất) để tìm date chứa `currRev`. |
