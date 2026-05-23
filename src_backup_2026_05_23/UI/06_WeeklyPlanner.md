# 📅 TAB 6 — WEEKLY PLANNER

**File**: `Report/src/WeeklyReport.jsx`  
⚠️ **Lưu ý**: File nằm ở `src/` root thay vì `src/components/` — cần di chuyển.

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]` | 10→14 px |
| Tailwind | `text-xs`, `text-sm`, `text-xl`, `text-3xl` | 12, 14, 20, 30 px |

**Tổng**: 9 cỡ chữ (10→30px)

---

## Nút Button

| Số lượng | Kiểu | Tên |
|----------|------|-----|
| **3** `<button>` | `neu-button` class | EXPAND ALL, COLLAPSE ALL, RESET FOCUS |

**Button classes sử dụng**:
```
neu-button px-6 py-2 text-[14px]
```

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[5px]`, `p-[10px]`, `px-[8px]`, `px-[10px]`, `px-[15px]`, `py-[2px]`, `py-[4px]`, `py-[10px]`, `py-[12px]`, `pb-[10px]`, `pl-[20px]`, `pr-[10px]`, `pt-[10px]` |
| Tailwind | `p-1.5`, `p-2`, `p-4`, `px-2`, `px-6`, `py-0.5`→`py-3`, `pt-4` |
| Inline CSS | `paddingLeft: '32px'`, `paddingRight: '32px'` (table cells) |

**Tổng custom px**: 13 giá trị + 2 inline  
**Đánh giá**: 🔴 **Mix nặng**

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `m-[10px]`, `mr-[10px]` |
| Tailwind | `mb-1`, `mb-2`, `mb-4`, `mt-1` |

---

## Gap

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `gap-[10px]` |
| Tailwind | `gap-1`, `gap-2`, `gap-3`, `gap-6` |

---

## Border Radius

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `rounded-[4px]`, `rounded-[6px]`, `rounded-[8px]` |
| Tailwind | `rounded-md`, `rounded-xl`, `rounded-2xl`, `rounded-full` |

---

## Status Badge Colors

| Status | Text Color | Background | Border |
|--------|-----------|------------|--------|
| DONE | `text-emerald-400` | `bg-emerald-500/10` | `border-emerald-500/20` |
| WIP | `text-indigo-400` | `bg-indigo-500/10` | `border-indigo-500/20` |
| PENDING | `text-slate-400` | `bg-slate-500/10` | `border-slate-500/20` |
| TMR | `text-orange-400` | `bg-orange-500/10` | `border-orange-500/20` |
| URGENT | `text-rose-400` | `bg-rose-500/10` | `border-rose-500/20` |
| PLANNING | `text-amber-400` | `bg-amber-500/10` | `border-amber-500/20` |
| HIGH PRIORITY | `text-violet-400` | `bg-violet-500/10` | `border-violet-500/20` |
| ISSUE | `text-red-400` | `bg-red-500/10` | `border-red-500/20` |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐ Yếu |
| Mix px/TW | 🔴 13 custom padding + 2 inline |
| Font scale | 9 cỡ — nhiều |
| Button | ✅ 3 `<button>` semantic |
| Cần fix | Di chuyển file, chuẩn hóa padding |
