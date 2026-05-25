# 👤 TAB 2 — PERSONAL

**File**: `Report/src/components/PersonalSpace.jsx`

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[10px]`, `text-[11px]`, `text-[14px]`, `text-[28px]` | 10, 11, 14, 28 px |
| Tailwind | _(không dùng TW font classes)_ | — |

**Tổng**: 4 cỡ chữ (10→28px)

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **0** `<button>` | Dùng `<div>` + `onClick` | Không có semantic button |

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[3px]`, `p-[10px]`, `p-[12px]`, `p-[20px]`, `p-[38px]`, `p-[64px]` |
| Custom (trục) | `px-[12px]`, `px-[16px]`, `px-[20px]`, `py-[4px]`, `py-[10px]`, `py-[12px]`, `py-[14px]`, `py-[16px]` |
| Tailwind | `p-0`, `p-1`, `p-1.5`, `px-1`→`px-6`, `py-1.5`, `py-4`, `pb-20` |

**Tổng custom px**: 14 giá trị  
**Đánh giá**: 🔴 **Mix nặng** — quá nhiều giá trị px tùy chỉnh.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `mb-[10px]`, `mt-[12px]` |
| Tailwind | `mb-1`, `mr-2`, `mx-2` |

---

## Gap

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `gap-[10px]`, `gap-[12px]` |
| Tailwind | `gap-1`, `gap-1.5`, `gap-2`, `gap-3`, `gap-4` |

---

## Border Radius

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `rounded-[10px]`, `rounded-[12px]` |
| Tailwind | `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full` |

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐ Yếu |
| Mix px/TW | 🔴 14 custom padding — nặng nhất app |
| Font scale | 4 cỡ — ổn |
| Cần fix | Chuẩn hóa padding sang TW scale |
