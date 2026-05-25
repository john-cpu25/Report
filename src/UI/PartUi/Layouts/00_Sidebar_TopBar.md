# 🧭 SIDEBAR + TOPBAR — Navigation Components

---

## SIDEBAR
**File**: `Report/src/components/Sidebar.jsx`

### Cỡ chữ
| Giá trị | Mô tả |
|---------|-------|
| `text-[11px]` | Menu item labels |
| `text-[13px]` | Section headers |
| `text-[14px]` | Active menu item |
| `text-[24px]` | Logo text |

### Padding
| Loại | Giá trị |
|------|---------|
| Custom | `p-[10px]`, `pt-[10px]`, `px-[10px]` |
| Tailwind | `p-2` |

### Margin
| Loại | Giá trị |
|------|---------|
| Custom | `mb-[10px]` |
| Tailwind | `mb-1`, `mt-8` |

### Gap
| Loại | Giá trị |
|------|---------|
| Custom | `gap-[10px]` |
| Tailwind | `gap-0`, `gap-2` |

### Border Radius
`rounded-[8px]`, `rounded-2xl`, `rounded-full`

---

## TOPBAR
**File**: `Report/src/components/TopBar.jsx`  
**Chiều cao cố định**: `h-[80px]`

### Cỡ chữ
| Giá trị | Mô tả |
|---------|-------|
| `text-[7px]` | "Live" badge — **nhỏ nhất toàn app** |
| `text-[8px]` | Project key labels |
| `text-[9px]` | Notification badges, filter buttons |
| `text-[10px]` | Notification timestamps, dropdown headers |
| `text-[11px]` | Notification titles, dropdown items |
| `text-[12px]` | Stat labels, team switcher buttons |
| `text-[14px]` | User name display |
| `text-[28px]` | "RINCOVITCH" brand name |
| `text-2xl` | Stat numbers |

### Padding
| Loại | Giá trị |
|------|---------|
| Custom | `p-[10px]`, `px-[10px]` |
| Tailwind | `p-1`, `p-1.5`, `p-3`, `px-1`→`px-6`, `py-0.5`→`py-4`, `pt-5` |

### Margin
| Tailwind | `mb-0.5`, `mb-1`, `mb-2.5`, `ml-1`, `ml-10`, `mr-2`, `mt-0.5` |

### Gap
| Loại | Giá trị |
|------|---------|
| Custom | `gap-[10px]` |
| Tailwind | `gap-1`, `gap-1.5`, `gap-2`, `gap-3`, `gap-6`, `gap-12` |

### Button
| Số lượng | Chức năng |
|----------|----------|
| **2** | ADMIN/TEAM switcher, Team filter (SM/PR/SE/LE) |

### Admin/Team Switcher Style
```
w-16 h-8 text-[12px] font-black uppercase rounded-xl
Active: bg-[var(--bg-surface)] text-indigo-500 shadow
Inactive: text-[var(--text-muted)] hover:text-[var(--text-main)]
```
