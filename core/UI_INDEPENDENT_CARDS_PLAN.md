# KHẮC PHỤC HIỆN TƯỢNG CHỒNG CHÉO UI (INDEPENDENT CARDS)

Mục tiêu: Đảm bảo các khối (blocks), thẻ (cards) hiển thị độc lập, không bị tình trạng cha/con dính vào nhau hoặc chồng chéo nội dung (overlapping) do xung đột margin/padding và z-index.

## ⚠️ User Review Required

> [!IMPORTANT]
> Việc loại bỏ `margin` mặc định của các thẻ `.ocd-card` sẽ ảnh hưởng đến khoảng cách của toàn bộ hệ thống. Khoảng cách (spacing) sau này sẽ được quyết định hoàn toàn bởi các container chứa chúng (thông qua `flex` và `gap`). Bạn có đồng ý với sự thay đổi về kiến trúc layout này không?

---

## 1. Phân Tích Nguyên Nhân Gốc Rễ (Root Causes)

Hiện tượng "khối hay thẻ không độc lập, bị lấn lướt" trong hệ thống hiện tại đến từ 3 thói quen thiết kế CSS:

1. **Lỗi tư duy về Margin (Margin lạm quyền / Margin Collapse):** 
   - Hiện tại, class `.ocd-card` trong `index.css` tự mang trong mình thuộc tính `margin: var(--mar-std)` (10px). Theo nguyên tắc thiết kế Component hiện đại, một thẻ con không được phép tự quyết định khoảng cách bên ngoài của nó. 
   - Khi thẻ này lồng vào trong vùng chứa dùng `flex` hoặc `grid` có sử dụng `gap`, khoảng cách bị nhân đôi hoặc tự "nuốt" (collapse) lẫn nhau gây ra sự khó kiểm soát, thẻ con phá vỡ cấu trúc của thẻ cha.

2. **Lạm dụng Margin âm (Negative Margins):** 
   - Trong `PersonalSpace.jsx`, thanh công cụ trên cùng đang bị ép vị trí bằng `mt-[-10px]`. Margin âm bẻ cong dòng chảy tự nhiên của thẻ (Document flow), khiến thẻ bên dưới bị kéo tuột lên và chui vào trong / nằm dưới thanh header.

3. **Thiếu giới hạn ranh giới (Missing Boundaries / Overflow):**
   - Các thẻ không có `position: relative` và `overflow: hidden`. Điều này có nghĩa là nếu nội dung bên trong to hơn thẻ cha hoặc sử dụng hiệu ứng bóng đổ / lật trang (`absolute`), nó sẽ "tràn" ra khỏi thẻ cha và đè lên các khối kế cận.

---

## 2. Giải Pháp: Kiến Trúc Thẻ Độc Lập (Independent Architecture)

Thay đổi tư duy Layout theo hướng **Lắp ráp module độc lập**:

### Bước 1: "Thiến" quyền Margin của thẻ Card
- **[MODIFY] `index.css` & `00_tokens.css`**: Xóa bỏ hoàn toàn `margin: var(--mar-std)` khỏi `.ocd-card` và `.card`. 
- Thẻ `.ocd-card` giờ chỉ như một viên gạch (chỉ quy định màu sắc, bo góc, đệm bên trong). Nó không tự đẩy các viên gạch khác ra xa.

### Bước 2: Bàn giao quyền quản lý khoảng cách cho Container
- Khoảng cách giữa các khối sẽ do Container cha quyết định thông qua `flex` và `gap` (ví dụ: `flex flex-col gap-[10px]`). 
- **[MODIFY] `PersonalSpace.jsx`**: Thay thế `space-y-x` bằng `flex flex-col gap-x` để đảm bảo lưới vững chắc.

### Bước 3: Đóng hộp khép kín (Encapsulation)
- **[MODIFY] `index.css`**: Thêm `position: relative` và `overflow: hidden` vào các class thẻ. Bất kể nội dung con bên trong "quậy phá" thế nào, nó cũng bị cắt gọn gàng ngay tại viền. Thẻ cha trở thành một pháo đài độc lập.

### Bước 4: Làm sạch không gian Sticky
- **[MODIFY] Các file UI (PersonalSpace, Dashboard)**: Gỡ bỏ các dòng code rác như `mt-[-10px]`. Đảm bảo z-index và background được set rõ ràng để nội dung cuộn trượt mượt mà dưới Header.

---

## 3. Đánh Giá Rủi Ro (Risk Assessment)

> [!WARNING]
> **Tác động lan rộng (Global Impact):** Vì chúng ta sửa class dùng chung ở `index.css`, giao diện của toàn bộ các trang (Dashboard, WeeklyPlanner, v.v.) sẽ bị tác động ngay lập tức. Có thể một số trang cũ đang phụ thuộc vào `margin` mặc định này sẽ bị dính sát vào nhau.
> 
> **Cách khắc phục:** Sẽ cần lướt qua các component chính để thêm class `gap-[10px]` vào các thẻ flex cha chứa nó nhằm bù đắp lại khoảng cách vừa bị xóa.

---

## 4. Kế Hoạch Triển Khai (Execution Plan)

1. **Phase 1:** Chỉnh sửa các file CSS gốc (`index.css`, `00_tokens.css`) để đóng gói chuẩn mực `.ocd-card` và `.card`.
2. **Phase 2:** Cấu trúc lại `PersonalSpace.jsx`: gỡ bỏ margin âm, chuẩn hóa wrapper sang flex/gap.
3. **Phase 3:** Rà soát và cập nhật layout trên `Dashboard.jsx`.
4. **Phase 4:** Kiểm tra thủ công (Manual Testing) để đảm bảo không bị lỗi tràn viền và scroll mượt mà ở các trang chính.
