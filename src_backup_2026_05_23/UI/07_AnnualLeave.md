# 🏖️ TAB 7 — ANNUAL LEAVE

**File**: `Report/src/components/AnnualLeave.jsx`  
**Dòng code**: 595 lines | **Kích thước**: 30.3 KB

---

## Cỡ chữ (Font Size)

| Loại | Giá trị | Quy đổi |
|------|---------|---------|
| Custom px | `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[14px]`, `text-[28px]`, `text-[40px]` | 9→40 px |
| Tailwind | _(không dùng)_ | — |

**Tổng**: 7 cỡ chữ (9→40px)  
**Đặc biệt**: `text-[40px]` — **lớn nhất** toàn app (Total Team Reserve number).

---

## Nút Button

| Số lượng | Kiểu | Ghi chú |
|----------|------|---------|
| **0** `<button>` explicit | Dùng `neu-button` class trên `<button>` | Personal/Team toggle, Year/Team selectors |

**Button classes sử dụng**:
```
neu-button px-6 py-2.5 text-[11px] gap-2
neu-button neu-square p-4 text-indigo-500
```

---

## Padding

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `p-[8px]`, `p-[10px]`, `p-[15px]`, `p-[20px]`, `p-[40px]`, `px-[8px]`, `px-[10px]`, `px-[12px]`, `px-[20px]`, `py-[3px]`, `py-[4px]`, `py-[5px]`, `py-[12px]`, `py-[15px]` |
| Tailwind | `p-1.5`, `p-4`, `p-6`, `px-4`, `px-6`, `py-2`→`py-4`, `pb-1`, `pb-12`, `pl-4`, `pr-4` |

**Tổng custom px**: 14 giá trị  
**Đánh giá**: 🔴 **Mix nặng** — bằng Personal, nhiều nhất app.

---

## Margin

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `m-[10px]`, `mb-[10px]`, `mb-[15px]` |
| Tailwind | `mb-1`, `mb-2`, `mb-4`, `ml-2`, `mt-1`, `mt-3` |

---

## Gap

| Loại | Giá trị | Quy đổi px |
|------|---------|-----------|
| Custom `[px]` | `gap-[10px]`, `gap-[15px]`, `gap-[20px]` | 10, 15, 20 px |
| Tailwind | `gap-2`, `gap-3`, `gap-4`, `gap-6`, `gap-8` | 8, 12, 16, 24, 32 px |

---

## Border Radius

| Loại | Giá trị |
|------|---------|
| Custom `[px]` | `rounded-[4px]`, `rounded-[6px]`, `rounded-[8px]` |
| Tailwind | `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` |

---

## Component đặc biệt

- **EnergyBar**: Component con cho hiển thị vertical energy gauge
- **Chart.js Bar**: Stacked bar chart cho team distribution
- **Holidays**: Hardcoded `VN_HOLIDAYS_2026` array

---

## Tổng kết

| Tiêu chí | Đánh giá |
|----------|----------|
| Consistency | ⭐⭐ Yếu |
| Mix px/TW | 🔴 14 custom padding — bằng Personal |
| Font scale | 7 cỡ — range rộng (9→40px) |
| Features | ✅ EnergyBar, Team analytics rất đẹp |
| Cần fix | Chuẩn hóa padding, migrate startDate từ localStorage → Supabase |
