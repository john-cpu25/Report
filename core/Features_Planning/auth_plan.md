# Kế hoạch triển khai Hệ thống Đăng nhập & Phân quyền (Auth & RBAC)

Tài liệu này lưu trữ kế hoạch thiết lập hệ thống xác thực chuyên nghiệp và phân quyền người dùng dựa trên Supabase và Microsoft SSO cho ứng dụng Weekly Report.

## 1. Mục tiêu
- Bảo mật dữ liệu báo cáo theo từng cấp độ.
- Cá nhân hóa trải nghiệm người dùng dựa trên **Team** và **Vai trò (Role)**.
- Duy trì phiên đăng nhập (Session) ổn định qua Microsoft SSO.

## 2. Các thành phần chính
- **Trang Login**: Giao diện hiện đại (Galaxy/News theme), hỗ trợ nút đăng nhập Outlook.
- **Auth Context**: Quản lý trạng thái đăng nhập, thông tin User và quyền hạn toàn cục.
- **Middleware/Security Hooks**: Kiểm tra quyền truy cập và lọc dữ liệu tự động.

## 3. Tích hợp Microsoft / Outlook SSO
Hệ thống ưu tiên sử dụng tài khoản Outlook doanh nghiệp để tối ưu trải nghiệm.

### A. Cơ chế hoạt động:
1. **Silent Login (SSO)**: Tự động kiểm tra phiên đăng nhập Microsoft khi mở App.
2. **Auto-Fetch Email**: Lấy Email từ Microsoft để đối soát với hệ thống.
3. **Interactive Fallback**: Hiển thị nút đăng nhập thủ công nếu không tìm thấy phiên tự động.
4. **Link với Supabase**: Email từ MS được khớp với cột `email` trong bảng `NMK_User` để lấy thông tin `role` và `team`.

### B. Công nghệ:
- `@azure/msal-react`, `@azure/msal-browser`.
- Microsoft Entra ID (Azure AD).

## 4. Mô hình Phân quyền (RBAC) & Lọc dữ liệu theo Team
Quyền hạn được xác định dựa trên cột `role` và phạm vi dữ liệu dựa trên cột `team` trong bảng `NMK_User`.

### A. Phân bổ quyền hạn:
| Quyền (Role) | Phạm vi dữ liệu | Chức năng chính |
| :--- | :--- | :--- |
| **Admin** | Toàn hệ thống | Xem tất cả Dashboard, quản lý User, cấu hình Core hệ thống. |
| **Leader** | Theo Team | Xem Dashboard và Task của tất cả thành viên trong cùng `team`. Phê duyệt báo cáo. |
| **User** | Cá nhân | Xem/Sửa báo cáo và Task của chính mình. Xem tóm tắt chung của `team`. |

### B. Cơ chế lọc dữ liệu Dashboard (Core Logic):
- **User/Leader**: Khi Query dữ liệu từ Supabase, luôn đính kèm điều kiện `WHERE team = user.team`. Điều này đảm bảo tính riêng tư giữa các bộ phận.
- **Admin**: Bỏ qua điều kiện lọc `team` để có cái nhìn tổng thể toàn công ty.

## 5. Các bước triển khai cụ thể
1. **Azure Portal**: Đăng ký App để lấy `ClientId` và `TenantId`. Cấu hình Redirect URI.
2. **Supabase Schema**: Kiểm tra và chuẩn hóa bảng `NMK_User` (Cột: `email`, `role`, `team`).
3. **React Auth Layer**: 
   - Triển khai `MsalProvider`.
   - Tạo `AuthContext` để lưu thông tin user sau khi đối soát thành công.
4. **Dashboard Update**: Cập nhật logic fetching dữ liệu để hỗ trợ lọc theo `team` và `role`.

---
*Ghi chú: Bản cập nhật tiếp theo sẽ tập trung vào việc tích hợp logic lọc dữ liệu vào tầng Core của Dashboard.*
