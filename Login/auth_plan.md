# Kế hoạch triển khai Hệ thống Đăng nhập (Auth)

Tài liệu này lưu trữ kế hoạch thiết lập hệ thống đăng nhập chuyên nghiệp sử dụng Supabase Auth cho ứng dụng Weekly Report.

## 1. Mục tiêu
- Bảo mật dữ liệu báo cáo.
- Cá nhân hóa trải nghiệm người dùng dựa trên Team và Vai trò.
- Duy trì phiên đăng nhập (Session) ổn định.

## 2. Các thành phần chính
- **Trang Login**: Giao diện hiện đại, hỗ trợ theme Galaxy/News.
- **Auth Context**: Quản lý trạng thái đăng nhập toàn cục.
- **Middleware**: Kiểm tra quyền truy cập trước khi vào các tab dashboard.

## 4. Tích hợp Microsoft / Outlook SSO (Kế hoạch Mới)
Hệ thống sẽ ưu tiên sử dụng tài khoản Outlook đang đăng nhập trên máy tính để tối ưu trải nghiệm người dùng.

### A. Cơ chế hoạt động:
1. **Silent Login (SSO)**: Khi mở ứng dụng, hệ thống sử dụng thư viện `MSAL.js` để kiểm tra phiên đăng nhập Microsoft trên trình duyệt hoặc hệ điều hành.
2. **Auto-Fetch Email**: Nếu tìm thấy tài khoản (đã đăng nhập Outlook/Office 365), hệ thống tự động lấy Email mà không yêu cầu người dùng nhập mật khẩu.
3. **Interactive Fallback**: Nếu không tìm thấy phiên đăng nhập sẵn có, hệ thống hiển thị nút "Đăng nhập với Outlook" để người dùng tự xác thực.
4. **Link với Supabase**: Email lấy được từ Microsoft sẽ được đối soát với cột `email` trong bảng `NMK_User` để xác định quyền hạn (Team/Role).

### B. Công nghệ sử dụng:
- **Library**: `@azure/msal-react` & `@azure/msal-browser`.
- **Identity Platform**: Microsoft Entra ID (Azure AD).
- **Scope**: `user.read`, `openid`, `profile`, `email`.

### C. Các bước triển khai cụ thể:
1. Đăng ký ứng dụng (App Registration) trên Azure Portal để lấy `ClientId` và `TenantId`.
2. Cấu hình `Redirect URI` trỏ về trang web hiện tại.
3. Cài đặt `MsalProvider` bao bọc toàn bộ ứng dụng React.
4. Triển khai logic `ssoSilent` để lấy thông tin tài khoản tự động.

---
*Ghi chú: Bản kế hoạch chi tiết hơn về cấu hình Azure sẽ được bổ sung sau khi có thông tin ClientId.*
