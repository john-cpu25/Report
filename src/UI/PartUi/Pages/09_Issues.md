# 🎨 TAB 9 — ISSUES (Drawing Manager)

**File**: `Report/src/components/DrawingsManager.jsx`  
**Dòng code**: 717 lines | **Kích thước**: 35.4 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[9px]`, `text-[10px]`, `text-[11px]` | 9, 10, 11 px |
| Tailwind | `text-xs`, `text-sm`, `text-base`, `text-xl`, `text-2xl` | 12, 14, 16, 20, 24 px |

**Tổng**: 8 cỡ chữ (9→24px) — dùng cả px lẫn TW.

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **1** `<button>` detected | TW styled | "New Drawing" button |

**Thêm nhiều button** dùng `<button>` nhưng inline className:
- Canvas / Register toggle
- Plus (add drawing)
- Edit / Delete (hover actions trên drawing cards)
- "Log New Markup" button

**Button styles**:
```
bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-indigo-600
bg-indigo-500 text-white shadow-md  (active toggle)
text-slate-400 hover:text-white  (inactive toggle)
```

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `p-1`→`p-8`, `px-2`→`px-4`, `py-0.5`→`py-4`, `pl-2`→`pl-10`, `pr-2`→`pr-12` |
| Inline CSS | `padding: '24px 20px 24px 24px'` (drawing cards), `padding: '32px'` (modal), `paddingLeft: '64px'` (project cards), `paddingLeft: '30px'` (project list) |

**Đánh giá**: ✅ **Tailwind sạch** cho classes, nhưng có inline padding cho layout đặc biệt.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `mb-2`→`mb-6`, `mt-1.5`→`mt-4` |

---

## Gap

| Giá trị | Quy đổi px |
|---------|-----------|
| `gap-1.5` | 6px |
| `gap-2` | 8px |
| `gap-3` | 12px |
| `gap-4` | 16px |
| `gap-10` | 40px |

---

## Border Radius

| Giá trị |
|---------|
| `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` |

---

## Layout Constants

| Giá trị | Mô tả |
|---------|-------|
| `margin: '24px'` | Container outer margin |
| `width: 'calc(100% - 48px)'` | Container width |
| `height: 'calc(100vh - 140px)'` | Container height |
| `maxHeight: 'calc(100vh - 300px)'` | Project list scroll |
| `maxHeight: 'calc(100vh - 220px)'` | Drawing/Markup columns |

---

## SVG Connector Animation

```css
@keyframes comet {
  0% { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
}
```
Curved paths: `drawCurve(x1, y1, x2, y2)` với cubic bezier.

---

## Mock Data (Chưa kết nối Supabase)

| Biến | Mô tả |
|------|-------|
| `MOCK_PROJECTS` | 3 projects hardcoded |
| `MOCK_DRAWINGS` | Drawings per project |
| `MOCK_MARKUPS` | Markups per drawing |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐⭐⭐ Tốt |
| Mix px/TW | ✅ TW cho classes, inline chỉ cho layout đặc biệt |
| Font scale | 8 cỡ — vừa phải |
| SVG | ✅ Animated connector lines rất đẹp |
| Cần fix | Migrate mock data → Supabase |
