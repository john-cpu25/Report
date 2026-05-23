# 📁 TAB 4 — PROJECTS

**File**: `Report/src/components/Projects.jsx`

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]`, `text-[20px]`, `text-[26px]`, `text-[30px]`, `text-[36px]` | 8→36 px |
| Tailwind | _(không dùng)_ | — |

**Tổng**: 11 cỡ chữ — **nhiều nhất** cùng với Library. Range rất rộng (8→36px).

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **0** `<button>` | Dùng `<div>` + `onClick` | Không semantic |

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[5px]`, `p-[10px]`, `p-[15px]`, `p-[50px]`, `p-[80px]`, `pb-[5px]`, `pb-[10px]`, `pt-[10px]` |
| Tailwind | `p-1`, `p-4`, `p-6`, `p-10`, `px-0.5`→`px-10`, `py-0.5`→`py-10` |

**Tổng custom px**: 8 giá trị  
**Đặc biệt**: `p-[80px]` — rất lớn (empty state padding).

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `m-[5px]`, `mx-[10px]` |
| Tailwind | `mb-1`, `mb-3`, `mb-6`, `mr-10`, `mt-1`, `mt-1.5`, `my-3`, `my-6` |

---

## Gap

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `gap-[5px]`, `gap-[10px]`, `gap-[15px]`, `gap-[50px]` |
| Tailwind | `gap-0.5`, `gap-1`, `gap-2`, `gap-3` |

**Đặc biệt**: `gap-[50px]` — **lớn nhất** toàn app.

---

## Border Radius

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `rounded-[4px]`, `rounded-[6px]`, `rounded-[8px]`, `rounded-[12px]` |
| Tailwind | `rounded-md`, `rounded-lg`, `rounded-2xl`, `rounded-full` |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐ Yếu |
| Mix px/TW | 🟡 8 custom padding |
| Font scale | 🔴 11 cỡ — quá nhiều |
| Đặc biệt | `p-[80px]`, `gap-[50px]` — giá trị outlier |
