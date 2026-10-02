# 🧠 TAB 3 — NEURAL BRAIN

**File**: `Report/src/components/NeuralBrain.jsx`

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]` | 8, 9, 10, 11 px |
| Tailwind | `text-xs`, `text-sm` | 12, 14 px |

**Tổng**: 6 cỡ chữ (8→14px) — range hẹp, phù hợp chat UI.

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **1** `<button>` | Tailwind classes | Send message button |

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `p-1`, `p-2`, `p-2.5`, `p-3`, `p-3.5`, `p-4` |
| Tailwind (trục) | `px-1.5`→`px-4`, `py-0.5`→`py-6`, `pl-1`, `pl-2`, `pr-1`, `pt-2` |

**Đánh giá**: ✅ **Sạch** — 100% Tailwind scale.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | **Không có** |
| Tailwind | `mb-0.5`, `ml-1`, `mt-0.5`, `mt-1`, `mt-1.5`, `mt-4` |

**Đánh giá**: ✅ **Sạch**.

---

## Gap

| Giá trị | Quy đổi px |
|---------|-----------|
| `gap-1` | 4px |
| `gap-1.5` | 6px |
| `gap-2` | 8px |
| `gap-2.5` | 10px |
| `gap-3` | 12px |
| `gap-3.5` | 14px |

---

## Border Radius

| Giá trị |
|---------|
| `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full` |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐⭐⭐⭐ Rất tốt |
| Mix px/TW | ✅ Chỉ TW — 0 custom px |
| Font scale | 6 cỡ — range hẹp, phù hợp |
| Button | ✅ Có semantic `<button>` |
