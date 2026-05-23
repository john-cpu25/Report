# 📚 TAB 10 — LIBRARY (Workflows)

**File**: `Report/src/components/Workflows.jsx`  
**Dòng code**: 1610 lines | **Kích thước**: 79.9 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[17px]`, `text-[24px]`, `text-[28px]`, `text-[36px]` | 8→36 px |
| Tailwind | _(không dùng TW font classes)_ | — |

**Tổng**: 11 cỡ chữ — **nhiều nhất** cùng với Projects.  
**Đặc biệt**: `text-[17px]` chỉ dùng ở Library.

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **~5+** | Mix `<button>` + `<div>` onClick | Page navigation, Admin edit, Add/Delete spread |

**Button styles**:
```
# Page Navigation
px-6 py-2.5 rounded-xl text-[11px] font-black uppercase

# Admin Actions  
p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded

# Add Step
mt-4 w-full py-2.5 border-2 border-dashed border-stone-300 
hover:border-indigo-400 hover:bg-indigo-50/20 rounded-lg text-[10px]
```

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[10px]` |
| Tailwind | `p-2`→`p-10`, `px-0.5`→`px-10`, `py-0.5`→`py-12` |

**Tổng custom px**: 1 giá trị  
**Đánh giá**: 🟢 **Nhẹ** — gần như 100% Tailwind.

**Range rộng**: `py-12` (48px) là padding lớn nhất.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `mb-1`→`mb-8`, `ml-4.5`, `mr-6`, `mt-0.5`→`mt-3`, `mx-2`, `my-2`, `my-3` |

**Đặc biệt**: `ml-4.5` — giá trị lẻ hiếm dùng.

---

## Gap

| Giá trị | Quy đổi px |
|---------|-----------|
| `gap-1`→`gap-4` | 4→16px |
| `gap-10` | 40px |
| `gap-12` | 48px |

---

## Border Radius

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `rounded-[6px]`, `rounded-[8px]`, `rounded-[12px]` |
| Tailwind | `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` |

---

## PageFlip Configuration

```js
const pageFlip = new PageFlip(bookRef.current, {
  width: 480,           // Base page width (single page)
  height: 600,          // Base page height
  size: 'stretch',
  minWidth: 320,
  maxWidth: 480,
  minHeight: 400,
  maxHeight: 600,
  drawShadow: true,
  maxShadowOpacity: 0.3,
  showCover: false,
  usePortrait: false,   // Forces dual-page spread
  flippingTime: 1200,   // Animation duration ms
  swipeDistance: 30,
  clickEventForward: true,
  disableFlipByClick: true,
})
```

---

## Book Page Layout (Vintage Style)

| Element | Style |
|---------|-------|
| **Paper background** | `bg-[#FAF3E8]` (warm parchment) |
| **Header font** | `font-serif` (Georgia), stone colors |
| **Body text** | `text-stone-600`, `text-stone-800` |
| **Accent** | Dynamic per-workflow `color` |
| **Footer** | `text-[9px]`, `tracking-[0.25em]`, `uppercase` |
| **First letter** | `text-[36px]`, `float-left`, `font-serif` (drop cap) |

---

## Admin Inline Editing (EditableField)

```jsx
const EditableField = ({ value, onSave, className, tag, multiline, style }) => {
  // contentEditable with onBlur save
  // Stops event propagation to prevent PageFlip interference
}
```

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐⭐ Trung bình |
| Mix px/TW | 🟢 Chỉ 1 custom padding |
| Font scale | 🔴 11 cỡ — nhiều nhất cùng Projects |
| Innovation | ⭐⭐⭐⭐⭐ PageFlip book metaphor |
| Cần refactor | Tách thành `LibraryShelf`, `BookViewer`, `SpreadPage` (1610 dòng) |
