# 📊 TỔNG HỢP TOÀN BỘ — Cross-Tab Comparison

---

## Cấu trúc thư mục UI/

```
UI/
├── 00_Sidebar_TopBar.md    ← Navigation components
├── 01_Dashboard.md         ← Tab 1
├── 02_Personal.md          ← Tab 2
├── 03_NeuralBrain.md       ← Tab 3
├── 04_Projects.md          ← Tab 4
├── 05_Organization.md      ← Tab 5
├── 06_WeeklyPlanner.md     ← Tab 6
├── 07_AnnualLeave.md       ← Tab 7
├── 08_Planning.md          ← Tab 8
├── 09_Issues.md            ← Tab 9
├── 10_Library.md           ← Tab 10
└── 99_Overview.md          ← File này
```

---

## FONT SIZE — So sánh

| Tab | Số cỡ chữ | Min | Max | Dùng TW classes? |
|-----|:---------:|:---:|:---:|:-----------------:|
| Dashboard | 6 | 8px | 18px | ✅ Có |
| Personal | 4 | 10px | 28px | ❌ Không |
| Neural Brain | 6 | 8px | 14px | ✅ Có |
| Projects | **11** | 8px | 36px | ❌ Không |
| Organization | 3 | 9px | 32px | ❌ Inline CSS |
| Weekly Planner | 9 | 10px | 30px | ✅ Có |
| Annual Leave | 7 | 9px | **40px** | ❌ Không |
| Planning | 6 | 8px | 30px | ✅ Có |
| Issues | 8 | 9px | 24px | ✅ Có |
| Library | **11** | 8px | 36px | ❌ Không |

---

## PADDING — Mức độ mix Custom px vs Tailwind

| Tab | Custom `[px]` | TW Scale | Đánh giá |
|-----|:-------------:|:--------:|:--------:|
| Dashboard | **0** | 12 | ✅ Sạch |
| Personal | **14** | 16 | 🔴 Nặng |
| Neural Brain | **0** | 20 | ✅ Sạch |
| Projects | **8** | 18 | 🟡 TB |
| Organization | **inline** | 0 | ⚪ Riêng |
| Weekly Planner | **13** | 11 | 🔴 Nặng |
| Annual Leave | **14** | 10 | 🔴 Nặng |
| Planning | **2** | 3 | 🟢 Nhẹ |
| Issues | **0** | 21 | ✅ Sạch |
| Library | **1** | 30 | 🟢 Nhẹ |

---

## MARGIN — Mức độ mix

| Tab | Custom `[px]` | TW Scale |
|-----|:-------------:|:--------:|
| Dashboard | 0 | 7 |
| Personal | 2 | 3 |
| Neural Brain | 0 | 6 |
| Projects | 2 | 8 |
| Organization | inline | 0 |
| Weekly Planner | 2 | 4 |
| Annual Leave | 3 | 6 |
| Planning | 1 | 1 |
| Issues | 0 | 6 |
| Library | 0 | 14 |

---

## BUTTON — Phân tích

| Tab | `<button>` | Kiểu style | Semantic? |
|-----|:----------:|-----------|:---------:|
| Dashboard | 0 | div+onClick | ❌ |
| Personal | 0 | div+onClick | ❌ |
| Neural Brain | 1 | TW classes | ✅ |
| Projects | 0 | div+onClick | ❌ |
| Organization | 10+ | inline `actionBtnStyle()` | ✅ |
| Weekly Planner | 3 | `neu-button` class | ✅ |
| Annual Leave | ~4 | `neu-button` class | ✅ |
| Planning | ~2 | TW hover classes | ✅ |
| Issues | ~5 | TW classes | ✅ |
| Library | ~5 | TW + inline | ✅ |

---

## BORDER RADIUS — So sánh

| Giá trị | Dashboard | Personal | Neural | Projects | Weekly | Leave | Planning | Issues | Library |
|---------|:---------:|:--------:|:------:|:--------:|:------:|:-----:|:--------:|:------:|:-------:|
| `4px` | | | | ✅ | ✅ | ✅ | | | |
| `6px` (md) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ |
| `8px` (lg) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `10px` | | ✅ | | | | | | | |
| `12px` (xl) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | ✅ | ✅ |
| `16px` (2xl) | ✅ | | | ✅ | ✅ | ✅ | | ✅ | ✅ |
| `24px` (3xl) | ✅ | | | | | ✅ | | ✅ | |
| `full` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## RANKING — Consistency Score

| Rank | Tab | Score | Lý do |
|:----:|-----|:-----:|-------|
| 🥇 | **Dashboard** | ⭐⭐⭐⭐⭐ | 0 custom px, chỉ TW, 6 font sizes |
| 🥇 | **Neural Brain** | ⭐⭐⭐⭐⭐ | 0 custom px, chỉ TW, range hẹp |
| 🥈 | **Issues** | ⭐⭐⭐⭐ | 0 custom padding, TW + inline layout |
| 🥈 | **Library** | ⭐⭐⭐⭐ | 1 custom padding, nhưng 11 font sizes |
| 🥉 | **Planning** | ⭐⭐⭐ | 2 custom padding, nhưng bug Month/Year |
| 4 | **Projects** | ⭐⭐ | 8 custom padding, 11 font sizes |
| 5 | **Personal** | ⭐⭐ | 14 custom padding, mix nặng |
| 5 | **Weekly Planner** | ⭐⭐ | 13 custom padding + inline |
| 5 | **Annual Leave** | ⭐⭐ | 14 custom padding |
| — | **Organization** | ⚪ | 100% inline — system riêng |

---

## ĐỀ XUẤT — Chuẩn hóa

### Ưu tiên 1: Tabs cần fix ngay
1. **Personal** — 14 custom padding → chuẩn hóa TW
2. **Annual Leave** — 14 custom padding → chuẩn hóa TW
3. **Weekly Planner** — 13 custom padding + di chuyển file

### Ưu tiên 2: Giảm font sizes
1. **Projects** — giảm từ 11 → ~7 cỡ
2. **Library** — giảm từ 11 → ~7 cỡ

### Ưu tiên 3: Fix bugs
1. **Planning** — Month/Year views return null
2. **Issues** — Mock data → Supabase
