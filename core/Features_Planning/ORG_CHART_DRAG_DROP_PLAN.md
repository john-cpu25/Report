# Kế hoạch Nâng cấp: Sơ đồ Tổ chức (OrgChart) - Kéo Thả & Căn Chỉnh Lưu Vĩnh Viễn
**Ngày lập:** Cập nhật mới nhất
**Mục tiêu:** Cung cấp tính năng sắp xếp sơ đồ tổ chức (kéo thả tự do) và chuyển đổi giao diện thẻ con (ngang/dọc), đồng thời lưu trữ các cấu hình này vào cơ sở dữ liệu để đồng bộ cho tất cả người dùng.

---

## 1. Yêu cầu Cập nhật Cơ sở dữ liệu (Supabase)
Để lưu trữ vị trí tùy chỉnh và hướng hiển thị, bảng `NMK_User` cần được bổ sung thêm 2 cột.
Người quản trị hệ thống cần đăng nhập vào **Supabase Dashboard**, mở **SQL Editor** và chạy đoạn mã sau:

```sql
-- 1. Thêm cột lưu trữ hướng hiển thị của các thẻ con (horizontal/vertical)
ALTER TABLE "NMK_User" ADD COLUMN layout text DEFAULT NULL;

-- 2. Thêm cột lưu trữ độ lệch tọa độ khi kéo thả (Lưu dưới dạng JSON string)
ALTER TABLE "NMK_User" ADD COLUMN offset_xy text DEFAULT NULL;
```
*Ghi chú:* 
- Nếu `layout` bị null, hệ thống sẽ tiếp tục sử dụng logic mặc định (tự động phân bổ dọc/ngang).
- `offset_xy` lưu trữ dữ liệu dạng chuỗi JSON `{"x": 100, "y": -50}`.

---

## 2. Các Bước Triển khai Mã nguồn (Frontend)
*Lưu ý: Chỉ thực hiện bước này SAU KHI đã chạy xong script cập nhật Database.*

### Bước 2.1: Cập nhật `src/services/supabaseService.js`
- Sửa hàm `fetchOrgChartData` để lấy thêm 2 trường `layout` và `offset_xy`.
  ```javascript
  // Cũ: .select('id, full_name, position, is_assistant, level, manager_id, team_name, location')
  // Mới: .select('id, full_name, position, is_assistant, level, manager_id, team_name, location, layout, offset_xy')
  ```
- Thêm hàm `updateUserOrgNode` để gửi dữ liệu lưu xuống DB:
  ```javascript
  export const updateUserOrgNode = async (userId, updates) => {
    const { error } = await supabase
      .from('NMK_User')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
  };
  ```

### Bước 2.2: Tích hợp Kéo thả vào `src/components/OrgChart.jsx`
- **State quản lý:** Thêm biến `dragOffset` để tạo trải nghiệm kéo mượt mà trên giao diện (60fps) mà không cần chờ API.
- **Tính toán Layout (useMemo):** 
  - Khôi phục `offset_xy` từ database (JSON.parse).
  - Cộng `offset_x` và `offset_y` vào biến `_x` và `_y` trước khi gọi hàm vẽ đường nối (edges).
- **Thao tác chuột (Mouse Events):**
  - Trên `OrgCard`, thêm sự kiện `onMouseDown` bắt đầu theo dõi tọa độ kéo.
  - Trên `Container`, thêm `onMouseMove` để dịch chuyển thẻ và cập nhật đường nối theo thời gian thực.
  - Thêm `onMouseUp` để dừng kéo và gọi hàm `updateUserOrgNode(id, { offset_xy: JSON.stringify(...) })`.

### Bước 2.3: Thêm Nút Toggle Layout (Dọc/Ngang)
- Trong component `OrgCard` (ở phần Hover actions), thêm một nút (ví dụ dùng icon `AlignCenter` hoặc `AlignEndHorizontal`).
- Bấm nút này sẽ gọi hàm `updateUserOrgNode(id, { layout: 'horizontal' })` (hoặc 'vertical' tùy trạng thái hiện tại).

---

## 3. Quy trình Kiểm thử (QA & Testing)
1. **Kiểm tra DB:** Mở tab Network/Console, đảm bảo API gọi xuống bảng `NMK_User` trả về không bị lỗi `Column offset_xy does not exist`.
2. **Kéo thả:** Thử kéo một thẻ "Trưởng phòng". Quan sát thẻ và tất cả đường thẳng kết nối đến nhân viên cấp dưới phải di chuyển mượt theo chuột.
3. **Lưu trữ:** Kéo thẻ đi vị trí khác. Ấn F5 tải lại trình duyệt. Thẻ phải xuất hiện ở đúng vị trí mới kéo.
4. **Layout:** Đổi layout thẻ con từ Dọc thành Ngang. Ấn F5. Layout ngang phải được giữ nguyên.
