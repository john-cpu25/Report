# 📊 TAB 1 — DASHBOARD

**File**: `Report/src/components/Dashboard.jsx`  
**Dòng code**: 1890 lines | **Kích thước**: 82.9 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[8px]`, `text-[10px]`, `text-[11px]`, `text-[12px]` | 8, 10, 11, 12 px |
| Tailwind | `text-xs`, `text-sm`, `text-lg` | 12, 14, 18 px |
| Inline (chart plugin) | `font: 'bold 12px sans-serif'` | 12px |

**Tổng**: 6 cỡ chữ khác nhau (8→18px)

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **0** `<button>` | Dùng `<div>` + `onClick` | Không có semantic button |

**Vấn đề**: Thiếu accessibility — nên dùng `<button>` thay `<div>` cho các interactive elements.

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `p-0.5`, `p-1.5`, `p-2`, `p-2.5`, `p-4`, `p-10` |
| Tailwind (trục) | `px-1.5`, `py-0.5`, `py-5`, `pl-2`, `pr-1`, `pr-3` |

**Đánh giá**: ✅ **Sạch** — chỉ dùng Tailwind scale, không mix custom px.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `mb-0.5`, `mb-1`, `mr-3`, `mt-0.5`, `mt-1`, `my-0.5`, `my-1` |

**Đánh giá**: ✅ **Sạch** — chỉ dùng Tailwind scale.

---

## Gap (Spacing giữa các phần tử)

| Giá trị | Quy đổi px |
|---------|-----------|
| `gap-1` | 4px |
| `gap-1.5` | 6px |
| `gap-2` | 8px |
| `gap-2.5` | 10px |
| `gap-3` | 12px |
| `gap-4` | 16px |
| `gap-6` | 24px |
| `gap-8` | 32px |
| `gap-12` | 48px |

**Tổng**: 9 giá trị gap — khá nhiều nhưng đều theo Tailwind scale.

---

## Border Radius

| Giá trị | Quy đổi |
|---------|---------|
| `rounded-md` | 6px |
| `rounded-lg` | 8px |
| `rounded-xl` | 12px |
| `rounded-2xl` | 16px |
| `rounded-3xl` | 24px |
| `rounded-full` | 9999px |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐⭐⭐⭐ Rất tốt |
| Mix px/TW | ✅ Chỉ TW |
| Font scale | 6 cỡ — vừa phải |
| Accessibility | ⚠️ Thiếu `<button>` |
