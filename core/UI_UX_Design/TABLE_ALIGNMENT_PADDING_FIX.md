# TABLE ALIGNMENT & PADDING RENDER FIX

This document records the design decision, problem statement, and standard implementation for handling table column padding and alignment in the project. It serves as a guide to prevent layout bugs such as "dính khung" (text touching table cell borders) or misalignments.

---

## 1. Problem Statement
When developing HTML tables (`<table>`) styled with Tailwind CSS, two main issues can occur:
1. **Universal CSS Padding Reset:** The reset rule `* { padding: 0; }` is active in `index.css`. If a custom Tailwind padding class (like `pl-8` or arbitrary `pl-[50px]`) is not compiled yet or ignored due to Tailwind v4 compiler caching/JIT limits, the cell padding falls back to `0px`. This causes the text inside headers and cells to touch the borders.
2. **"Dính Khung" with `border-collapse: collapse`:** Collapsing table borders merges cell and table borders together. When cells use background colors (e.g., `bg-indigo-500/[0.05]` or `bg-emerald-500/[0.02]`), the background runs directly into the merged border, worsening the visual feeling of the text touching the boundaries.

---

## 2. The Solution (Best Practices)

To guarantee consistent spacing, perfect vertical alignment, and completely avoid the "dính khung" issue, follow these three rules:

### Rule 1: Use `border-separate` and `border-spacing-0` ONLY on specific tables
Instead of `border-collapse` (which merges borders), configure the table to use separate borders with zero spacing:
* **Tailwind classes:** `<table className="border-separate border-spacing-0">`
* **Inline Style:** `<table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>`
* **CRITICAL WARNING:** **DO NOT** use global raw CSS like `table { border-collapse: separate; }` in `index.css`. Doing so will break all other tables in the application that rely on Tailwind's default `border-collapse: collapse` (which will cause them to lose their horizontal `<tr className="border-b">` lines). Always apply it per-component.
* **Why:** This isolates background colors to the inner boundary of the cell and ensures that padding is strictly respected by the browser's layout engine without breaking other components.

### Rule 2: Bypass Tailwind compiler caches with Inline Styles
For critical horizontal padding where alignment between `<th>` and `<td>` must be 100% exact (such as table indents), use React's inline styles:
* **Style definition:** `style={{ paddingLeft: '32px', paddingRight: '32px' }}` (this is the exact equivalent of `px-8`).
* **Why:** Inline styles have the highest specificity and do not rely on Tailwind CSS build files, JIT compilation, or browser stylesheet updates.

### Rule 3: Avoid redundant wrapper divs for simple padding
Do not wrap cell text in `<div className="pl-X">` just to push text away from the border. Apply padding directly on the `<th>` and `<td>` tags.

### Rule 4: Apply horizontal borders on `<td>`, not `<tr>`
When `border-collapse: separate` is active, browsers **ignore borders defined on `<tr>` elements**.
* **Action:** Remove any `border-b` from the `<tr>` element, and instead add `border-b border-[var(--border)]` directly to every `<td>` cell inside the row.
* **Why:** This ensures that horizontal lines between table rows remain visible and render correctly.

---

## 3. Standard Code Template

### Header Columns (`<th>`):
```jsx
<th 
  className="sticky z-[35] text-left py-[14px] text-[14px] font-black text-[var(--text-muted)] uppercase tracking-widest border-b border-r border-[var(--border)] bg-[var(--bg-card)]" 
  style={{ top: '0px', paddingLeft: '32px', paddingRight: '32px' }}
>
  Team
</th>
```

### Data Columns (`<td>`):
```jsx
<td
  rowSpan={team.totalRows}
  className="py-3 text-[14px] text-indigo-500 uppercase tracking-tight border-r border-b border-[var(--border)] bg-indigo-500/[0.05] min-w-[140px]"
  style={{ paddingLeft: '32px', paddingRight: '32px' }}
>
  {team.name}
</td>
```

### Sticky Columns (LIST Tab `<th>` / `<td>`):
For sticky columns (e.g., PROJECT, TASK NAME), use `sticky left-X z-Z` combined with inline padding:
```jsx
<th 
  rowSpan={2} 
  className="py-[2px] text-[var(--text-contrast)] text-center border-r-2 border-b border-[var(--border)] sticky left-0 z-30 min-w-[140px] backdrop-blur-md bg-[var(--bg-card)]" 
  style={{ top: stickyOffset, paddingLeft: '32px', paddingRight: '32px' }}
>
  PROJECT
</th>
```

## 4. Applied Tabs

| Tab | File | Columns with 32px Padding |
|-----|------|---------------------------|
| DAILY | `TimesheetView.jsx` | Team, Member, Project |
| PROJECT | `ProjectView.jsx` | Team, Project, Member |
| LIST | `UnifiedTable.jsx` | PROJECT, TASK NAME, USER_ID |
| WEEKLY PLANNER | `WeeklyReport.jsx` | PROJECT, TASK ANALYSIS |

