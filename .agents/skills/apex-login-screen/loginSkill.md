# APEX Login UI — Kích Thước & Thiết Kế Chi Tiết (loginSkill.md)

Tài liệu quy chuẩn thiết kế (Design Specification & Spacing Tokens) cho màn hình đăng nhập APEX Southern Cross Engineering. Dùng làm mẫu chuẩn để tái lập giao diện chính xác 100% trên Web (React, Vue, HTML/CSS), Desktop (WPF, WinForms) và Mobile.

---

## 1. 🔲 THẺ ĐĂNG NHẬP (CARD CONTAINER)

| Thuộc tính (Property) | Giá trị (Value) | Chi tiết CSS / Code |
| :--- | :--- | :--- |
| **Chiều rộng tối đa (Max Width)** | **400px** | `max-w-[400px] w-full` |
| **Chiều cao (Height)** | Auto co giãn (~`535px`) | Tự động ôm sát theo nội dung |
| **Khoảng đệm trong (Padding)** | **20px** (đều 4 phía) | `padding: 20px;` |
| **Bo góc thẻ (Border Radius)** | **10px** | `border-radius: 10px;` |
| **Đường viền thẻ (Border)** | **1px solid** | `border: 1px solid rgba(255, 255, 255, 0.15);` |
| **Độ mờ kính (Backdrop Blur)** | **blur(24px)** | `backdrop-filter: blur(24px);` |
| **Màu nền kính (Gradient)** | Trắng mờ → Trong suốt | Xem mã gradient bên dưới |
| **Đổ bóng thẻ (Box Shadow)** | 2 lớp mềm | `0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08);` |
| **Khoảng cách lề ngoài (Margin)** | Căn giữa ngang, cách mép 16px | `mx-4` (trên mobile) |

### Mã CSS Màu Nền Gradient của Thẻ:
```css
background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.95) 0%,   /* Trắng mờ 95% ở phần logo & tiêu đề */
    rgba(255, 255, 255, 0.85) 35%,  /* Trắng mờ 85% */
    rgba(255, 255, 255, 0.15) 70%,  /* Chuyển mờ dần xuống form */
    rgba(255, 255, 255, 0.00) 100%  /* Trong suốt hoàn toàn ở đáy để lộ video */
);
```

### Vệt Sáng Xanh Đáy Thẻ (Bottom Glow Bar):
```css
position: absolute;
bottom: -24px; /* -bottom-6 */
left: 50%;
transform: translateX(-50%);
width: 75%;
height: 16px;
border-radius: 9999px;
background: linear-gradient(90deg, #1a6fff, #00c8ff);
filter: blur(24px);
opacity: 0.3;
```

---

## 2. 🔷 LOGO & ĐƯỜNG KẺ PHÂN CÁCH (DIVIDER)

### Logo Section:
- **Tên file logo:** `apex-logo.png`
- **Chiều cao logo (`height`):** **`120px`** (chiều rộng tự động co giãn theo tỷ lệ ảnh).
- **Khoảng cách dưới logo (`margin-bottom`):** **`24px`** (`mb-6`).

### Đường Kẻ Phân Cách (Divider):
- **Cấu trúc:** 2 đường kẻ 2 bên và 1 chấm tròn xanh dương ở giữa.
- **Đường kẻ 2 bên:** Chiều cao `1px`, gradient mờ dần ra mép ngoài (`linear-gradient(to right/left, transparent, #e2e8f0)`).
- **Chấm tròn ở giữa:** Kích thước `4px × 4px` (`w-1 h-1`), `border-radius: 50%`, màu `#1a6fff`, `opacity: 0.5`.
- **Khoảng cách giữa chấm và vạch (`gap`):** **`12px`** (`gap-3`).
- **Khoảng cách dưới đường kẻ (`margin-bottom`):** **`24px`** (`mb-6`).

---

## 3. ✍️ TIÊU ĐỀ & PHỤ ĐỀ (HEADINGS)

- **Căn lề:** Căn giữa (`text-align: center;`).
- ⭐ **Khoảng cách từ Tiêu đề xuống Form:** **`50px`** (`margin-bottom: 50px;`).

### Chi tiết Typography:
| Thành phần | Font Family | Size | Weight | Màu sắc | Khoảng cách |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiêu đề chính** (`APEX SOUTHERN CROSS`) | `'Rajdhani', sans-serif` | **24px** | 700 (Bold) | `#111827` (In hoa, giãn chữ `0.12em`) | `margin-bottom: 4px` (`mb-1`) |
| **Phụ đề** (`Sign in with Email & Password`) | `'Inter', sans-serif` | **14px** | 400 (Regular) | `#64748b` (Xám vừa) | — |
| **Ghi chú nhỏ** (`(If this is your first login...)`)| `'Inter', sans-serif` | **11px** | 400 (Italic) | `#94a3b8` (Xám nhạt) | `margin-top: 4px` (`mt-1`) |

---

## 4. 📝 FORM & CÁC Ô NHẬP LIỆU (INPUTS)

- **Khoảng cách giữa các hàng (`gap`):** **`12px`** (`className="flex flex-col gap-3"`).

### Thông số Ô Input (Email & Password):
| Thuộc tính | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| **Chiều rộng (Width)** | `100%` (`w-full`) | Phủ kín bề ngang trong thẻ |
| **Chiều cao (Height)** | **`48px`** | Chuẩn cảm ứng và thẩm mỹ hiện đại |
| **Bo góc (Border Radius)** | **`5px`** | Góc vuông bo nhẹ mềm mại |
| **Khoảng đệm trái (Padding Left)** | **`38px`** | Chừa đủ chỗ cho icon trái |
| **Khoảng đệm phải ô Email** | **`16px`** (`pr-4`) | Khoảng đệm tiêu chuẩn |
| **Khoảng đệm phải ô Mật khẩu** | **`54px`** (`paddingRight: 54px`) | Tránh text đè lên icon con mắt |
| **Màu nền (Background)** | `rgba(255, 255, 255, 0.1)` | Kính mờ trong suốt |
| **Độ mờ kính (Backdrop Filter)** | `blur(8px)` | Làm mờ video nền phía sau |
| **Màu chữ (Text Color)** | `white` (#ffffff) | Font `'Inter'`, size `14px` |
| **Màu placeholder** | `rgba(255, 255, 255, 0.5)` | Trắng mờ 50% |
| **Đường viền mặc định** | `1.5px solid rgba(255, 255, 255, 0.15)` | Viền trắng mờ tinh tế |
| **Đường viền khi Focus** | `1.5px solid rgba(96, 165, 250, 0.6)` | Viền xanh sáng (`blue-400/60`) |
| **Vòng sáng khi Focus (Ring)** | `box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15)` | Hiệu ứng tỏa sáng |

### Vị Trí Icons Trong Ô Nhập:
- **Icon Trái (Mail / Lock):**
  - Kích thước: `18px`.
  - Vị trí: Căn giữa theo chiều dọc, **cách mép trái `10px`** (`paddingLeft: 10px`).
  - Màu sắc: Mặc định `rgba(255, 255, 255, 0.5)`, khi ô được focus đổi thành `#60a5fa`.
- **Icon Con mắt (Show/Hide Password Toggle):**
  - Kích thước: `18px`.
  - Vị trí: Căn giữa theo chiều dọc, **cách mép phải `26px`** (`paddingRight: 26px`).
  - Màu sắc: Mặc định `rgba(255, 255, 255, 0.5)`, khi rê chuột (hover) đổi thành xanh `#60a5fa`.

---

## 5. 🔘 NÚT QUÊN MẬT KHẨU & NÚT ĐĂNG NHẬP

### Nút "Quên mật khẩu?":
- **Căn lề:** Căn sát lề phải (`justify-content: flex-end;`).
- **Font chữ:** `'Inter', sans-serif`, size **`12px`**.
- **Màu sắc:** `#60a5fa` (hover đổi sang `#93c5fd`).

### Nút ĐĂNG NHẬP (Submit Button):
| Thuộc tính | Giá trị | Chi tiết |
| :--- | :--- | :--- |
| **Chiều rộng (Width)** | `100%` | Phủ kín bề ngang |
| **Chiều cao (Height)** | **`44px`** | Cân đối với ô input 48px |
| **Bo góc (Border Radius)** | **`12px`** | Bo tròn mềm hơn so với ô input |
| **Màu nền Gradient** | Xanh dương đậm → Xanh Cyan | `linear-gradient(135deg, #1a6fff 0%, #0ea5ff 100%)` |
| **Đổ bóng (Box Shadow)** | Tỏa sáng xanh | `0 4px 20px rgba(26,111,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12)` |
| **Typography** | `'Rajdhani', sans-serif` | Size **`13px`**, In hoa, In đậm (600), giãn chữ `0.18em` |
| **Icon mũi tên (`ArrowRight`)** | Kích thước **`15px`** | Cách chữ **`8px`** (`gap-2`) |
| **Hiệu ứng nhấn (Active)** | `transform: scale(0.98)` | Lún nhẹ khi click tạo cảm giác bấm thật |

---

## 6. 🎥 VIDEO NỀN (BACKGROUND VIDEO)

- **File video:** `intro_login.mp4` (đặt trong thư mục `/public/`).
- **Cấu hình thẻ `<video>`:**
  - `autoPlay: true`
  - `muted: true`
  - `loop: true`
  - `playsInline: true`
  - `object-fit: cover` (phủ kín 100vw và 100vh)
  - `opacity: 1` (hiển thị trọn vẹn 100%, không dùng lớp phủ đen đè lên).

---

## 7. 💻 MÃ NGUỒN REACT HOÀN CHỈNH (TEMPLATE)

```jsx
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginCard({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  return (
    <div className="relative w-full max-w-[400px] mx-4">
      {/* Glow đáy thẻ */}
      <div 
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-4 rounded-full"
        style={{ background: 'linear-gradient(90deg, #1a6fff, #00c8ff)', filter: 'blur(24px)', opacity: 0.3 }}
      />

      {/* Khung thẻ chính */}
      <div 
        style={{
          padding: '20px',
          borderRadius: '10px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src="/apex-logo.png" alt="APEX Logo" style={{ height: '120px' }} className="w-auto object-contain" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #e2e8f0)' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: '#1a6fff', opacity: 0.5 }} />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #e2e8f0)' }} />
        </div>

        {/* Tiêu đề & phụ đề */}
        <div className="text-center" style={{ marginBottom: '50px' }}>
          <h1 className="text-gray-900 uppercase font-bold mb-1" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '24px', letterSpacing: '0.12em' }}>
            APEX SOUTHERN CROSS
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#64748b' }}>
            Sign in with Email & Password
          </p>
          <p className="mt-1" style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', fontStyle: 'italic', color: '#94a3b8' }}>
            (If this is your first login, the password you enter will become your official password)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }} className="flex flex-col gap-3">
          {/* Email */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '10px' }}>
              <Mail size={18} style={{ color: emailFocused ? '#60a5fa' : 'rgba(255,255,255,0.5)', transition: 'color 0.25s' }} />
            </div>
            <input
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              required
              className="w-full text-white placeholder-white/50 outline-none"
              style={{
                height: '48px',
                borderRadius: '5px',
                paddingLeft: '38px',
                paddingRight: '16px',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                fontSize: '14px',
                border: emailFocused ? '1.5px solid rgba(96,165,250,0.6)' : '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: emailFocused ? '0 0 0 3px rgba(96,165,250,0.15)' : 'none',
                transition: 'border 0.25s, box-shadow 0.25s',
              }}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none" style={{ paddingLeft: '10px' }}>
              <Lock size={18} style={{ color: passFocused ? '#60a5fa' : 'rgba(255,255,255,0.5)', transition: 'color 0.25s' }} />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              required
              className="w-full text-white placeholder-white/50 outline-none"
              style={{
                height: '48px',
                borderRadius: '5px',
                paddingLeft: '38px',
                paddingRight: '54px',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                fontSize: '14px',
                border: passFocused ? '1.5px solid rgba(96,165,250,0.6)' : '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: passFocused ? '0 0 0 3px rgba(96,165,250,0.15)' : 'none',
                transition: 'border 0.25s, box-shadow 0.25s',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-0 flex items-center group cursor-pointer"
              style={{ paddingRight: '26px' }}
            >
              {showPass ? (
                <EyeOff size={18} className="text-white/50 group-hover:text-blue-400 transition-colors" />
              ) : (
                <Eye size={18} className="text-white/50 group-hover:text-blue-400 transition-colors" />
              )}
            </button>
          </div>

          {/* Forgot pass */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => alert('Vui lòng liên hệ Admin để cấp lại mật khẩu.')}
              className="hover:text-blue-300 transition-colors cursor-pointer"
              style={{ fontSize: '12px', color: '#60a5fa', background: 'none', border: 'none' }}
            >
              Quên mật khẩu?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 text-white uppercase font-semibold active:scale-[0.98] transition-transform cursor-pointer"
            style={{
              height: '44px',
              borderRadius: '12px',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '13px',
              letterSpacing: '0.18em',
              background: 'linear-gradient(135deg, #1a6fff 0%, #0ea5ff 100%)',
              boxShadow: '0 4px 20px rgba(26,111,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
              border: 'none',
            }}
          >
            <span>ĐĂNG NHẬP</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
```
