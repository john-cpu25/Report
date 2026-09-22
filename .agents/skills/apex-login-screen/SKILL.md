---
name: apex-login-screen
description: >-
  Skill chứa toàn bộ thông tin UI/UX cho màn hình đăng nhập và Preloader APEX Southern Cross Engineering.
  Sử dụng khi cần tạo, chỉnh sửa, hoặc đồng bộ giao diện Login/Preloader sang ứng dụng khác
  (WPF, WinForms, Mobile, Web). Bao gồm: layout, typography, color palette, spacing,
  animations, component specs, design tokens, full source code, và cross-platform implementation.
---

# APEX Login Screen & Preloader — Complete UI Skill (v3 — Latest)

## 1. KIẾN TRÚC & FLOW

```
User mở app → <Login /> (video background) → Đăng nhập → <Preloader /> (video intro + logo99) → Main App
```

### Files
| File | Vai trò |
|------|---------|
| `src/components/Login.jsx` | Màn hình đăng nhập (video background + glassmorphic card) |
| `src/Preloader.jsx` | Màn hình chờ sau đăng nhập (video intro + logo + loading %) |
| `src/App.jsx` | `if (authLoading || !user) return <Login />` |

### Dependencies
- `react`, `framer-motion`, `lucide-react` (Mail, Lock, Eye, EyeOff, ArrowRight, SkipForward)

### Assets
| File | Mô tả | Đường dẫn |
|------|--------|-----------|
| `apex-logo.png` | Logo trên Login card | `/public/apex-logo.png` |
| `logo99.png` | Logo Preloader (nền trong suốt) | `/public/logo99.png` |
| `intro_login.mp4` | Video nền Login + Preloader | `/public/intro_login.mp4` |

---

## 2. LOGIN SCREEN

### Layer System
| Layer | Mô tả |
|-------|--------|
| **0** | Background Video (`intro_login.mp4`) — full-screen, autoPlay, muted, loop, full opacity |
| **1** | Pulse Circles — 2 vòng tròn glow (blue #1a6fff + cyan #00c8ff) |
| **2** | Circuit Board Pattern — SVG 80×80px repeat, opacity 0.07 |
| **3** | Scanline Overlay — horizontal lines, opacity 0.03 |
| **4** | Error Toast — slide-down notification (z-50) |
| **5** | Login Card — Gradient glassmorphic card (z-10) |

### Login Card
| Thuộc tính | Giá trị |
|------------|---------|
| Max Width | `400px` |
| Padding | `20px` |
| Border Radius | `10px` |
| Background | `linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0) 100%)` |
| Backdrop Filter | `blur(24px)` |
| Border | `1px solid rgba(255,255,255,0.15)` |
| Box Shadow | `0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)` |

### Logo (Login card)
| Thuộc tính | Giá trị |
|------------|---------|
| Height | `120px` |
| File | `apex-logo.png` |

### Detailed Dimensions & Spacing (Thông số kích thước & khoảng cách chi tiết)
| Phần tử / Vị trí | Thuộc tính | Giá trị | Code mẫu |
|------------------|-----------|---------|----------|
| **Thẻ đăng nhập (Card)** | Max Width | `400px` | `max-w-[400px] w-full` |
| | Padding | `20px` (4 phía) | `padding: '20px'` |
| | Border Radius | `10px` | `borderRadius: '10px'` |
| | Border | `1px solid rgba(255,255,255,0.15)` | `border: '1px solid ...'` |
| | Margin 2 bên | `16px` | `mx-4` (căn giữa) |
| | Bottom Glow Bar | Cao 16px, rộng 75%, cách đáy `-24px` | `-bottom-6 w-3/4 h-4 blur(24px)` |
| **Logo Section** | Logo Height | `120px` | `style={{ height: '120px' }}` |
| | Margin Bottom | `24px` | `mb-6` |
| **Divider (Vạch phân cách)** | Cao 1px, Chấm 4×4px | Cách dưới `24px`, Gap `12px` | `gap-3 mb-6` |
| **Headings (Tiêu đề)** | Tiêu đề chính | Size `24px`, margin-bottom `4px` | `font-bold mb-1` |
| | Phụ đề | Size `14px` | `fontSize: '14px'` |
| | Ghi chú mật khẩu | Size `11px`, italic, margin-top `4px` | `mt-1 italic` |
| | **Khoảng cách xuống Form** | **`50px`** | `style={{ marginBottom: '50px' }}` |
| **Form Container** | Gap giữa các dòng | `12px` | `className="flex flex-col gap-3"` |
| **Ô Nhập Liệu (Input)** | Height | `48px` | `height: '48px'` |
| | Border Radius | `5px` | `borderRadius: '5px'` |
| | Padding Left | `38px` | Chừa khoảng trống cho icon trái |
| | Padding Right (Email) | `16px` | `pr-4` |
| | Padding Right (Password)| `54px` | `paddingRight: '54px'` (chừa chỗ cho con mắt) |
| | Icon trái (Mail/Lock) | Size `18px`, cách lề trái `10px` | `paddingLeft: '10px'` |
| | **Icon con mắt (Show/Hide)** | Size `18px`, **cách lề phải `26px`** | `paddingRight: '26px'` |
| **Nút Quên mật khẩu** | Font Size | `12px`, màu `#60a5fa`, căn phải | `flex justify-end` |
| **Nút ĐĂNG NHẬP** | Height | `44px` | `height: '44px'` |
| | Border Radius | `12px` | `borderRadius: '12px'` |
| | Font Size / Spacing | `13px`, uppercase, `letter-spacing: 0.18em` | `tracking-widest font-semibold` |
| | Icon mũi tên | Size `15px`, cách text `8px` | `ArrowRight size={15} gap-2` |
| **Khu vực DEV ngoài thẻ** | Margin Top | `32px` bên dưới thẻ, cách nhau `8px` | `mt-8 flex flex-col gap-2` |

### Input Fields (Glassmorphic)
| Thuộc tính | Giá trị |
|------------|---------|
| Height | `48px` |
| Border Radius | `5px` |
| Padding Left | `38px` |
| Padding Right (Password) | `54px` |
| Background | `rgba(255,255,255,0.1)` + `backdrop-filter: blur(8px)` |
| Text Color | `white` |
| Placeholder Color | `rgba(255,255,255,0.5)` |
| Border default | `1.5px solid rgba(255,255,255,0.15)` |
| Border focus | `1.5px solid rgba(96,165,250,0.6)` |
| Focus ring | `0 0 0 3px rgba(96,165,250,0.15)` |
| Icon default | `rgba(255,255,255,0.5)` |
| Icon focus | `#60a5fa` |
| Transition | `border 0.25s, box-shadow 0.25s, color 0.25s` |

### Login Button
| Thuộc tính | Giá trị |
|------------|---------|
| Height | `44px` |
| Border Radius | `12px` |
| Background | `linear-gradient(135deg, #1a6fff 0%, #0ea5ff 100%)` |
| Shadow | `0 4px 20px rgba(26,111,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12)` |
| Active | `scale(0.98)` |

### Bottom Glow Bar
```css
width: 75%; height: 16px; border-radius: 9999px;
background: linear-gradient(90deg, #1a6fff, #00c8ff);
filter: blur(24px); opacity: 0.3;
```

---

## 3. PRELOADER SCREEN

### Structure
```
Fixed fullscreen (z-9999, bg: #020617)
├── Skip Button (top-right, z-50)
├── Background Video (intro_login.mp4, z-0)
├── Blueprint Grid Overlay (z-10, opacity 0.10)
└── Center Container (z-20)
    ├── Logo (logo99.png, h-32/40/52 responsive)
    └── Loading Text ("LOADING : XX%")
```

### Skip Button
| Thuộc tính | Giá trị |
|------------|---------|
| Position | absolute top-6 right-6 |
| Background | black/60 → hover: black/90 |
| Border | white/25 → hover: white/50 |
| Text | "Bỏ qua / Skip" + SkipForward icon |
| Keyboard | Escape hoặc Space |

### Logo (Preloader)
| Thuộc tính | Giá trị |
|------------|---------|
| File | `logo99.png` (nền trong suốt) |
| Size | h-32 (mobile) / h-40 (sm) / h-52 (md+) |
| Animation | scale pulse [1→1.02→1], drop-shadow pulse |
| Transition | scale 3.5s infinite, filter 3.5s infinite |

### Loading Text
```css
font-size: 11px; font-family: monospace; font-weight: bold;
color: white; letter-spacing: 0.25em; text-transform: uppercase;
text-shadow: 0 2px 8px rgba(0,0,0,0.95);
```

### Video Sync
- Progress syncs with video currentTime/duration
- Fallback timer: if video doesn't play within 2.5s, simulate loading
- onEnded → 400ms delay → onLoadingComplete

---

## 4. TYPOGRAPHY

### Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Font Usage
| Thành phần | Font | Size | Weight | Spacing | Color |
|------------|------|------|--------|---------|-------|
| Title "APEX SOUTHERN CROSS" | Rajdhani | 24px | 700 | 0.12em | #111827 |
| Subtitle "Sign in with..." | Inter | 14px | 400 | normal | #64748b |
| Note "(If this is your first...)" | Inter | 11px | 400 italic | normal | #94a3b8 |
| Input text | Inter | 14px | 400 | normal | white |
| Button "ĐĂNG NHẬP" | Rajdhani | 13px | 600 | 0.18em | white |
| Link "Quên mật khẩu?" | Inter | 12px | 400 | normal | #60a5fa |
| Loading text | Monospace | 11px | bold | 0.25em | white |

---

## 5. COLOR PALETTE

### Background & Card
| Tên | Giá trị |
|-----|---------|
| Login screen bg | `#04091a` + radial gradient |
| Preloader bg | `#020617` |
| Card gradient | white(0.95) → white(0.85) → white(0.15) → transparent |

### Brand
| Tên | Hex |
|-----|-----|
| Primary Blue | `#1a6fff` |
| Cyan Accent | `#00c8ff` |
| Gradient End | `#0ea5ff` |
| Focus Blue | `#60a5fa` |

---

## 6. ANIMATIONS

### Card Entrance
```js
initial:    { opacity: 0, y: 24, scale: 0.97 }
animate:    { opacity: 1, y: 0,  scale: 1 }
transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
```

### Logo Pulse (Preloader)
```js
animate: { scale: [1, 1.02, 1], filter: [shadow-dark, shadow-blue, shadow-dark] }
transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
```

### Preloader Exit
```js
exit: { opacity: 0, scale: 1.05 }
```

### Spinner SVG (Login loading)
```html
<svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
  <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
  <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
</svg>
```

---

## 7. DESIGN TOKENS

```css
:root {
  --login-bg:             #04091a;
  --preloader-bg:         #020617;
  --login-primary:        #1a6fff;
  --login-cyan:           #00c8ff;
  --login-gradient-end:   #0ea5ff;
  --login-focus:          #60a5fa;
  --login-card-top:       rgba(255, 255, 255, 0.95);
  --login-card-bottom:    rgba(255, 255, 255, 0);
  --login-input-bg:       rgba(255, 255, 255, 0.1);
  --login-input-border:   rgba(255, 255, 255, 0.15);
  --login-text-dark:      #111827;
  --login-text-muted:     #64748b;
  --login-text-dim:       #94a3b8;
  --shadow-card:          0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08);
  --shadow-btn:           0 4px 20px rgba(26,111,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12);
  --shadow-focus:         0 0 0 3px rgba(96,165,250,0.15);
}
```

---

## 8. ICONS (Lucide)

| Vị trí | Icon | Size | Default | Focus/Hover |
|--------|------|------|---------|-------------|
| Email | Mail | 18px | white/50 | #60a5fa |
| Password | Lock | 18px | white/50 | #60a5fa |
| Show | Eye | 18px | white/50 | blue-400 |
| Hide | EyeOff | 18px | white/50 | blue-400 |
| Submit | ArrowRight | 15px | white | — |
| Skip | SkipForward | 14px | white | — |

---

## 9. STATES

### Input
| State | Border | Shadow | Icon |
|-------|--------|--------|------|
| Default | `rgba(255,255,255,0.15)` | none | white/50 |
| Focus | `rgba(96,165,250,0.6)` | `0 0 0 3px rgba(96,165,250,0.15)` | #60a5fa |

### Button
| State | Background | Opacity | Other |
|-------|-----------|---------|-------|
| Default | gradient | 1 | shadow |
| Active | gradient | 1 | scale(0.98) |
| Loading | rgba(26,111,255,0.5) | 0.7 | spinner |
| Disabled | rgba(26,111,255,0.5) | 0.7 | not-allowed |

---

## 10. ACCOUNT / AUTH SYSTEM

### Kiến trúc
| Thành phần | Chi tiết |
|------------|----------|
| **Database** | Supabase → bảng `NMK_User` |
| **Auth Context** | `src/context/AuthContext.jsx` (React Context) |
| **Password Hash** | SHA-256 client-side (`crypto.subtle.digest`) |
| **Session** | `localStorage` key `last_login_email` → auto-login lần sau |
| **Supabase Client** | `src/supabaseClient.js` |

### Bảng NMK_User (Supabase)
| Cột | Kiểu | Mô tả |
|-----|------|--------|
| `id` | int | Primary key |
| `email` | text | Email đăng nhập (unique, lowercase) |
| `password` | text | SHA-256 hash (hoặc null nếu lần đầu) |
| `name` | text | Tên hiển thị |
| `full_name` | text | Tên đầy đủ |
| `user_role` | text | "admin", "leader", hoặc trống |
| `team` | text | Team/phòng ban |
| `location` | text | Vị trí (VIETNAM, AUSTRALIA...) |
| `position` | text | Chức vụ (Engineer, Manager...) |
| `image` | text | Avatar (base64 compressed) |

### Login Flow
```
1. User nhập email + password
2. Query: NMK_User WHERE email = ?
3. Email không tồn tại → báo lỗi
4. User chưa có password (lần đầu) → hash(password) → lưu DB → login
5. Có password → so sánh hash → đúng → login
6. Password đang lưu plain-text → tự nâng cấp SHA-256
7. Lưu email vào localStorage → auto-login lần sau
```

### Roles & Permissions
| Role | Xác định | Quyền |
|------|----------|-------|
| **Admin** | `user_role` chứa "admin" | Full access + reset password user khác |
| **Leader** | `user_role` chứa "leader" | Quản lý team |
| **User** | Mặc định | Xem/tạo report |

### API Methods (useAuth hook)
```js
const { user, loading, error, login, logout, 
        updateUserProfile, changePassword, 
        adminResetUserPassword, isAdmin, isLeader } = useAuth();
```

| Method | Params | Quyền | Mô tả |
|--------|--------|-------|--------|
| `login(email, pwd)` | string, string | All | Đăng nhập |
| `logout()` | — | All | Đăng xuất, xóa localStorage |
| `changePassword(old, new)` | string, string | Logged in | Đổi mật khẩu |
| `adminResetUserPassword(email, newPwd)` | string, string | Admin | Reset password user khác |
| `updateUserProfile({...})` | object | All | Cập nhật name, image, location, team, position |

### User Object (sau login)
```js
{
  id, email, name, full_name, image,
  location, team, position, user_role, password,
  isAdmin: boolean,   // computed từ user_role
  isLeader: boolean   // computed từ user_role
}
```

### Bypass Modes (DEV only)
| Mode | URL Param | User giả |
|------|-----------|---------|
| Admin | `?admin_mode=true` | Super Admin (Bypass) |
| Leader | `?leader_mode=true` | Nhân Nguyễn (Leader) |

### Password Hashing
```js
export const hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
```

---

## 11. FULL SOURCE CODE

- [Login.jsx](./references/Login.jsx) — Màn hình đăng nhập
- [Preloader.jsx](./references/Preloader.jsx) — Màn hình chờ/intro
- [AuthContext.jsx](./references/AuthContext.jsx) — Hệ thống xác thực
- [ACCOUNTS.md](./ACCOUNTS.md) — Danh sách tài khoản & hướng dẫn Auth Database

---

## 12. CROSS-PLATFORM

### WPF/XAML
```xml
<Color x:Key="LoginPrimary">#FF1A6FFF</Color>
<Color x:Key="LoginCyan">#FF00C8FF</Color>
<Color x:Key="LoginFocus">#FF60A5FA</Color>
<Color x:Key="LoginCardTop">#F2FFFFFF</Color>
<Color x:Key="LoginInputBg">#1AFFFFFF</Color>
<Color x:Key="PreloaderBg">#FF020617</Color>
<LinearGradientBrush x:Key="LoginButtonGradient" StartPoint="0,0" EndPoint="1,1">
  <GradientStop Color="#FF1A6FFF" Offset="0"/>
  <GradientStop Color="#FF0EA5FF" Offset="1"/>
</LinearGradientBrush>
```

### C# WinForms
```csharp
public static class LoginColors {
    public static readonly Color Background     = Color.FromArgb(255, 4, 9, 26);
    public static readonly Color PreloaderBg    = Color.FromArgb(255, 2, 6, 23);
    public static readonly Color Primary        = Color.FromArgb(255, 26, 111, 255);
    public static readonly Color Cyan           = Color.FromArgb(255, 0, 200, 255);
    public static readonly Color Focus          = Color.FromArgb(255, 96, 165, 250);
    public static readonly Color CardTop        = Color.FromArgb(242, 255, 255, 255);
    public static readonly Color InputBg        = Color.FromArgb(26, 255, 255, 255);
    public static readonly Color InputBorder    = Color.FromArgb(38, 255, 255, 255);
    public static readonly Color TextDark       = Color.FromArgb(255, 17, 24, 39);
    public static readonly Color TextMuted      = Color.FromArgb(255, 100, 116, 139);
    public const string FontHeading = "Rajdhani";
    public const string FontBody    = "Inter";
}
```
