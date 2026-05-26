# Hướng dẫn thiết lập Google OAuth 2.0 cho Tích hợp Google Drive

Tài liệu này lưu lại toàn bộ quy trình mà chúng ta đã thực hiện để cấu hình Google Cloud Console (Google OAuth 2.0) để người dùng có thể đăng nhập và tải file trực tiếp lên Google Drive qua ứng dụng Web.

## 1. Tạo Project trên Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Đăng nhập bằng tài khoản Google (tài khoản chứa Google Drive dùng để lưu trữ).
3. Nhấp vào menu **Select a project** (hoặc tên dự án hiện tại) ở thanh điều hướng trên cùng, chọn **New Project**.
4. Đặt tên cho dự án (ví dụ: `Report System`) và nhấn **Create**.
5. Sau khi tạo xong, đảm bảo bạn đang chọn (active) dự án vừa tạo.

## 2. Kích hoạt Google Drive API
1. Mở menu điều hướng (dấu 3 gạch ngang góc trái trên cùng) > **APIs & Services** > **Library**.
2. Tìm kiếm **"Google Drive API"**.
3. Nhấp vào kết quả và nhấn nút **Enable**.

## 3. Cấu hình Màn hình chấp thuận OAuth (OAuth Consent Screen)
1. Trong menu điều hướng, chọn **APIs & Services** > **OAuth consent screen**.
2. Chọn **User Type** là **External** (nếu bạn không dùng Google Workspace nội bộ công ty) hoặc **Internal** (nếu dùng chung tên miền công ty). Nhấn **Create**.
3. Điền các thông tin bắt buộc:
   - **App name**: Tên hiển thị khi người dùng đăng nhập (ví dụ: `Report App`).
   - **User support email**: Email hỗ trợ của bạn.
   - **Developer contact information**: Email của nhà phát triển.
4. Chuyển sang bước **Scopes**:
   - Nhấn **Add or Remove Scopes**.
   - Tìm và tích vào quyền `https://www.googleapis.com/auth/drive.file` (cho phép ứng dụng xem/tạo các file mà chính ứng dụng đã tạo ra). *(Lưu ý: Không nên xin toàn quyền drive để tránh bị Google cảnh báo bảo mật)*.
5. Chuyển sang bước **Test users** (nếu App đang ở chế độ Testing):
   - Nhấn **Add Users** và thêm địa chỉ email của bạn (email mà bạn sẽ dùng để test tính năng upload).
6. Nhấn **Save and Continue** cho đến khi hoàn tất.

## 4. Tạo Thông tin xác thực (Credentials)
1. Trong menu điều hướng, chọn **APIs & Services** > **Credentials**.
2. Nhấn nút **+ CREATE CREDENTIALS** ở trên cùng > Chọn **OAuth client ID**.
3. **Application type**: Chọn **Web application**.
4. **Name**: Đặt tên (ví dụ: `Web Client 1`).
5. **Authorized JavaScript origins** (RẤT QUAN TRỌNG):
   - Thêm URL của môi trường dev: `http://localhost:5173`
   - Thêm URL của môi trường production (GitHub Pages): `https://john-cpu25.github.io`
   - *(Lưu ý: Không được có dấu `/` ở cuối đường dẫn)*
6. **Authorized redirect URIs**: (Có thể để trống nếu dùng chế độ popup/implicit flow như `gapi.auth2` hoặc `google.accounts.oauth2`).
7. Nhấn **Create**.
8. Bảng thông báo sẽ hiện ra `Client ID` và `Client Secret`.
   - Lưu trữ `Client ID` vào file cấu hình của ứng dụng web. (Ứng dụng Frontend thường chỉ cần `Client ID`).

## 5. Cấu hình Frontend (React/Vite)
- Dùng thẻ `<script>` của thư viện Google Identity Services (GIS): `<script src="https://accounts.google.com/gsi/client" async defer></script>` (Đã tích hợp trong `index.html`).
- Sử dụng hàm `google.accounts.oauth2.initTokenClient` với `client_id` vừa tạo và scope `https://www.googleapis.com/auth/drive.file`.

## 6. Xử lý lỗi thường gặp
- **Lỗi `idpiframe_initialization_failed`**: Thường do trình duyệt chặn cookie bên thứ 3. Cần tắt tính năng chặn cookie trong cài đặt trình duyệt.
- **Lỗi `redirect_uri_mismatch` / Nút đăng nhập không phản hồi**: Do cấu hình **Authorized JavaScript origins** trên Google Console chưa đúng với tên miền hiện tại đang chạy code. Nhớ cập nhật cả `localhost` và domain production.
- **Lỗi Access Denied (403) khi tạo file**: Đảm bảo tài khoản đăng nhập là một trong những **Test Users** đã add, hoặc App đã được Publish.
