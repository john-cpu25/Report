# 🏢 TAB 5 — ORGANIZATION

**File**: `Report/src/components/OrgChart.jsx`  
**Dòng code**: 1539 lines | **Kích thước**: 64.6 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Vị trí |
|------|---------|--------|
| Inline CSS | `fontSize: 9` | Position label trên card |
| Inline CSS | `fontSize: 13` | Tên nhân viên trên card |
| Inline CSS | `fontSize: 32` | Zodiac emoji trên avatar |

**Đặc biệt**: **Không dùng Tailwind font classes** — toàn bộ inline `style={{ fontSize: N }}`.

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **~10+** `<button>` | Inline styles via `actionBtnStyle()` | Edit, Add, Delete, Toggle Layout, Align, Reset |

**Button style function**:
```js
const actionBtnStyle = (color) => ({
  width: 32, height: 32, borderRadius: '50%',
  border: `1.5px solid ${color}30`, background: `${color}10`,
  color, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'all 0.15s',
})
```
→ Tất cả button tròn 32×32px, viền nhạt, nền trong suốt.

---

## Padding

| Loại | Giá trị | Vị trí |
|------|---------|--------|
| Inline CSS | `paddingLeft: 36` | Card info area |
| Inline CSS | `paddingRight: 8` | Card info area |
| Inline CSS | `padding: 4` | Action overlay |

**Đặc biệt**: **Không dùng Tailwind padding** — toàn bộ inline.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Inline CSS | Không có margin rõ ràng — dùng absolute positioning |

---

## Layout Constants (Quan trọng)

| Hằng số | Giá trị | Mô tả |
|---------|---------|-------|
| `CARD_W` | 210 px | Chiều rộng card |
| `CARD_H` | 76 px | Chiều cao card |
| `H_SEP` | 40 px | Khoảng cách ngang giữa các nhánh |
| `V_SEP` | 40 px | Khoảng cách dọc giữa parent → child |
| `V_STACK_SEP` | 16 px | Khoảng cách dọc giữa siblings (vertical layout) |
| `INDENT` | 40 px | Thụt đầu dòng cho vertical children |
| `R` | 12 px | Corner radius cho đường nối SVG |

---

## Border Radius

| Loại | Giá trị | Vị trí |
|------|---------|--------|
| Inline CSS | `borderRadius: 12` | Card container |
| Tailwind | `rounded-full` | Avatar circle |

---

## Gap / Spacing

| Loại | Giá trị | Vị trí |
|------|---------|--------|
| Inline CSS | `gap: 6` | Action buttons rows |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⚪ Riêng biệt — 100% inline CSS |
| Mix px/TW | ⚪ Không dùng Tailwind (trừ `rounded-full`) |
| Font scale | 3 cỡ — đơn giản |
| Lý do inline | Layout engine cần pixel chính xác cho SVG connectors |
| Cần refactor | Tách thành `OrgCard`, `OrgCanvas`, `OrgToolbar` (1539 dòng quá lớn) |
