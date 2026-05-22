# 📋 TAB 8 — PLANNING

**File**: `Report/src/components/Planning.jsx`  
**Dòng code**: 307 lines | **Kích thước**: 13.7 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[8px]`, `text-[9px]`, `text-[12px]`, `text-[14px]`, `text-[30px]` | 8, 9, 12, 14, 30 px |
| Tailwind | `text-xs` | 12 px |

**Tổng**: 6 cỡ chữ (8→30px)

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **0** `<button>` explicit | Dùng `<button>` nhưng grep không tìm được do dùng Tailwind hover classes | Prev/Next navigation |

**Button style**:
```
p-[10px] rounded-[8px] bg-white/5 border border-white/5 
text-slate-400 hover:text-white hover:bg-white/10
```

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[10px]`, `px-[10px]` |
| Tailwind | `px-3`, `py-2.5`, `pb-20` |

**Tổng custom px**: 2 giá trị  
**Đánh giá**: 🟢 **Nhẹ** — ít custom nhất.

**Đặc biệt**: `pb-20` (80px) — rất lớn cho bottom padding.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `mb-[10px]` |
| Tailwind | `mt-0.5` |

---

## Gap

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `gap-[10px]` |
| Tailwind | `gap-4` |

---

## Border Radius

| Giá trị |
|---------|
| `rounded-[8px]`, `rounded-full` |

---

## Status Colors (Gantt Bars)

| Status | Background |
|--------|-----------|
| DONE | `bg-emerald-500` |
| WIP | `bg-indigo-500` |
| URGENT | `bg-rose-500` |
| ISSUE | `bg-red-500` |
| PLANNING | `bg-amber-500` |
| Default | `bg-slate-500` |

---

## Project Color Map (Hardcoded)

| Project | Color |
|---------|-------|
| 373 CROWN | `#f43f5e` |
| CW2 | `#0ea5e9` |
| CW3 | `#0284c7` |
| DLD | `#334155` |
| FGWB | `#3b82f6` |
| LEEDS | `#10b981` |
| MAC | `#b45309` |
| MEL02 | `#1e3a8a` |
| MEL03 | `#e11d48` |
| MORAY | `#2563eb` |
| RIVER TERRACE | `#8b5cf6` |
| SURF PARADE | `#0d9488` |
| SYD01 | `#16a34a` |
| WICKHAM | `#84cc16` |

⚠️ **Vấn đề**: Color map hardcoded — nên dùng `dashboardProjects` color data.

---

## Bug — Month/Year Views

```jsx
// Line 288: Month and Year views return null
return null;
```

⚠️ **CRITICAL**: 2/3 view modes (MONTH, YEAR) **không hiển thị task bars** — chỉ hiện grid rỗng.

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐⭐ Trung bình |
| Mix px/TW | 🟢 Chỉ 2 custom padding |
| Font scale | 6 cỡ — ổn |
| Bug | 🔴 Month/Year views broken |
| Cần fix | Fix Month/Year views, dùng dynamic project colors |
