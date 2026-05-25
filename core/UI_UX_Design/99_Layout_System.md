# Kế hoạch Tái cấu trúc Layout — Mô hình Container/Child

## Mục tiêu

Áp dụng mô hình layout nhất quán cho **tất cả 9 tab** trong navigation:

```
TỔNG (Container)  →  KHÔNG padding, KHÔNG margin, KHÔNG gap
└── CON (Block)   →  margin: 10px, padding: 10px, gap: 10px (giữa các con)
```

---

## Nguyên tắc Thiết kế

### Layer 1 — Container (`.tab-*`)
- **Vai trò**: chỉ là background + định nghĩa vùng chiếm chỗ
- **Rules**: `padding: 0`, `margin: 0`, `gap: 0`
- **CSS class pattern**: `.tab-{name}` (đã có sẵn)

### Layer 2 — Block (`.blk`)
- **Vai trò**: mỗi khối nội dung độc lập (toolbar, filters, stats, table, card...)
- **Rules**: `margin: 10px`, `padding: 10px`
- Các block xếp theo chiều dọc với `gap: 10px` (do container flex column)

### Layer 3 — Sub-block (`.blk__row`, `.blk__col`)
- **Vai trò**: nhóm trong một block (row của filters, row của stats...)
- **Rules**: `gap: 10px` nội bộ

---

## CSS Classes Cần Tạo — `00_tokens.css`

```css
/* ════════════════════════════════════════════════════════════
   LAYOUT BLOCK SYSTEM
   Áp dụng cho tất cả tab trong navigation
   ════════════════════════════════════════════════════════════ */

/* Container (tab root) — KHÔNG spacing */
/* Áp dụng cho: .tab-dashboard, .tab-personal, .tab-neural,
               .tab-projects, .tab-org, .tab-weekly, .tab-leave,
               .tab-issues, .tab-library */
[class^="tab-"] {
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-height: 100vh;
}

/* Block — mỗi khối nội dung độc lập */
/* Áp dụng cho: toolbar, filters, stats bar, table card, chart... */
.blk {
  margin: 10px;
  padding: 10px;
}

/* Block không padding — cho table/canvas flush cạnh */
.blk--no-pad {
  margin: 10px;
  padding: 0;
  overflow: hidden;
}

/* Block row — các phần tử ngang */
.blk__row {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
}

/* Block col — các phần tử dọc */
.blk__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
```

---

## Mapping Tab → Block

### Tab 1: DASHBOARD (`Dashboard.jsx` → `.tab-dashboard`)
| Block Class | Nội dung |
|---|---|
| `blk-dashboard-header` | Tiêu đề + ngày tháng |
| `blk-dashboard-stats` | Thẻ số liệu tổng |
| `blk-dashboard-charts` | Biểu đồ |
| `blk-dashboard-table` | Bảng tasks |

### Tab 2: PERSONAL (`PersonalSpace.jsx` → `.tab-personal`)
| Block Class | Nội dung |
|---|---|
| `blk-personal-nav` | Toolbar (LIST, DAILY, PROJECT...) |
| `blk-personal-filters` | Search + Filters |
| `blk-personal-stats` | Total Hours, Tasks, Date Picker |
| `blk-personal-view` | View content (table / gantt / ...) |

### Tab 3: NEURAL BRAIN (`NeuralBrain.jsx` → `.tab-neural`)
| Block Class | Nội dung |
|---|---|
| `blk-neural-canvas` | Canvas chính |
| `blk-neural-toolbar` | Side toolbar |

> ⚠️ Hiện có `h-[calc(100vh-140px)]` — cần giữ chiều cao cố định, không phá vỡ.

### Tab 4: PROJECTS (`Projects.jsx` → `.tab-projects`)
| Block Class | Nội dung |
|---|---|
| `blk-projects-header` | Tiêu đề + actions |
| `blk-projects-list` | Danh sách project cards |

### Tab 5: ORGANIZATION (`OrgChart.jsx` → `.tab-org`)
| Block Class | Nội dung |
|---|---|
| `blk-org-filters` | Bộ lọc nhân sự |
| `blk-org-chart` | Biểu đồ tổ chức |

### Tab 6: WEEKLY PLANNER (`WeeklyReport.jsx` → `.tab-weekly`)
| Block Class | Nội dung |
|---|---|
| `blk-weekly-nav` | Toolbar (LIST / GANTT) |
| `blk-weekly-filters` | Status filter |
| `blk-weekly-table` | Bảng tasks |

> ⚠️ Hiện có `pt-[10px] pr-[10px] pb-[10px] pl-[20px]` → cần về 0.

### Tab 7: ANNUAL LEAVE (`AnnualLeave.jsx` → `.tab-leave`)
| Block Class | Nội dung |
|---|---|
| `blk-leave-header` | Tiêu đề + summary |
| `blk-leave-calendar` | Lịch nghỉ |
| `blk-leave-table` | Danh sách nghỉ |

> ⚠️ Hiện có `space-y-[10px] pb-12` → cần về 0, dùng gap block.

### Tab 8: ISSUES (`DrawingsManager.jsx` → `.tab-issues`)
| Block Class | Nội dung |
|---|---|
| `blk-issues-header` | Tiêu đề + actions |
| `blk-issues-table` | Bảng issues |

### Tab 9: LIBRARY (`Workflows.jsx` → `.tab-library`)
| Block Class | Nội dung |
|---|---|
| `blk-library-header` | Tiêu đề |
| `blk-library-grid` | Grid of workflow cards |

---

## Thứ tự Thực hiện

### Phase 1 — CSS Foundation
- [ ] Thêm `.blk`, `.blk--no-pad`, `.blk__row`, `.blk__col` vào `00_tokens.css`
- [ ] Chuẩn hóa tất cả `.tab-*` containers về `padding:0, margin:0, gap:0`

### Phase 2 — Tab PERSONAL *(ưu tiên — đã có base)*
- [ ] Sửa `.tab-personal` về `padding: 0`
- [ ] Wrap các khối trong `PersonalSpace.jsx` bằng `.blk` / `.blk--no-pad`
- [ ] Cập nhật `02_personal.css`

### Phase 3 — Tab WEEKLY PLANNER
- [ ] Sửa `.tab-weekly` bỏ `pt/pr/pb/pl`
- [ ] Wrap blocks trong `WeeklyReport.jsx`
- [ ] Cập nhật `06_weeklyplanner.css`

### Phase 4 — Tab DASHBOARD
- [ ] Sửa `.tab-dashboard` về `padding: 0`
- [ ] Wrap blocks trong `Dashboard.jsx`
- [ ] Cập nhật `01_dashboard.css`

### Phase 5 — Các Tab còn lại
- [ ] PROJECTS, ORGANIZATION, ANNUAL LEAVE, ISSUES, LIBRARY, NEURAL BRAIN

> **Mỗi tab commit riêng lên git để dễ rollback.**

---

## Quy tắc Bảng (Table)

Bảng cần flush ra cạnh container → dùng `.blk--no-pad`:

```jsx
<div className="blk--no-pad ocd-card">
  <div className="personal-scroll">
    <table>...</table>
  </div>
</div>
```

---

## File Index

| CSS File | Tab | Wrapper Class |
|---|---|---|
| `01_dashboard.css` | Dashboard | `.tab-dashboard` |
| `02_personal.css` | Personal Space | `.tab-personal` |
| `03_neuralbrain.css` | Neural Brain | `.tab-neural` |
| `04_projects.css` | Projects | `.tab-projects` |
| `05_organization.css` | Organization | `.tab-org` |
| `06_weeklyplanner.css` | Weekly Planner | `.tab-weekly` |
| `07_annualleave.css` | Annual Leave | `.tab-leave` |
| `09_issues.css` | Issues | `.tab-issues` |
| `10_library.css` | Library | `.tab-library` |
