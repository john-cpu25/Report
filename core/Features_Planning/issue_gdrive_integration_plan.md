# Kế hoạch Tích hợp Google Drive API bằng Supabase Edge Functions (Tính năng Issues)

Tài liệu này vạch ra chiến lược triển khai Kịch bản 2 (Chuẩn doanh nghiệp) để upload file đính kèm của Issue thẳng lên thư mục Google Drive của công ty, đồng thời giữ metadata tại Supabase.

> [!IMPORTANT]
> **Yêu cầu phê duyệt từ User:** Kế hoạch này đòi hỏi bạn phải có quyền truy cập vào Google Cloud Console và thao tác với command line để cài đặt Supabase CLI. Vui lòng đọc kỹ và xác nhận trước khi tôi tiến hành code.

## 1. Mở đầu & Kiến trúc hoạt động

Thay vì nhúng Key bảo mật vào React (frontend) gây rủi ro, chúng ta sẽ xây dựng một **Edge Function** nằm trên máy chủ của Supabase.
- **Quy trình:** Frontend React (User) ➔ Gửi File ➔ Supabase Edge Function (Server) ➔ Dùng Service Account Key ẩn ➔ Push lên Google Drive ➔ Lấy Link ➔ Lưu vào Supabase DB ➔ Trả kết quả về cho React.

## 2. Các thay đổi và công việc dự kiến

### 2.1 Cấu hình phía Google Cloud & Supabase (Thao tác tay của bạn)
Đây là các bước bắt buộc bạn phải chuẩn bị trước khi tôi có thể ghép nối code:
1. **Google Cloud:** Tạo Service Account, cấp quyền Editor cho một thư mục Drive cụ thể, và xuất file `credentials.json`.
2. **Supabase CLI:** Bạn cần cài đặt Supabase CLI trên máy tính, chạy `supabase init` và `supabase login` để liên kết dự án.

### 2.2 Viết Code Supabase Edge Function
#### [NEW] `supabase/functions/upload-issue-attachment/index.ts`
- Khởi tạo một Deno Serverless Function.
- Nhận file binary/multipart từ React Frontend.
- Ký JWT (JSON Web Token) bằng thông tin từ Service Account.
- Đẩy file trực tiếp lên Google Drive API (`https://www.googleapis.com/upload/drive/v3/files`).
- Cấp quyền đọc công khai (hoặc giới hạn) cho file và lấy Web View Link.

### 2.3 Cập nhật Database Schema
- Bổ sung (hoặc tạo mới) bảng `issues`.
- Cần một mảng `attachments jsonb[]` hoặc `text[]` để lưu các đường link Google Drive trả về.

### 2.4 Giao diện UI React
#### [NEW] `src/components/Issues/IssueUploader.jsx` (Dự kiến)
- Tạo component tải file đính kèm với tính năng Kéo-Thả (Drag & Drop) hiện đại.
- Hiển thị thanh tiến trình (Progress bar) khi đang upload.
- Gọi API an toàn: `supabase.functions.invoke('upload-issue-attachment', { ... })`.

---

## 3. Câu hỏi mở (Open Questions)

> [!WARNING]
> **Vui lòng giải đáp các câu hỏi sau để chốt phương án code:**

1. **Về Supabase CLI:** Bạn đã từng sử dụng Command Line (Terminal) để deploy code lên Supabase bao giờ chưa? Nếu chưa, bạn có muốn tôi viết một hướng dẫn "cầm tay chỉ việc" từng lệnh một không?
2. **Về Thư mục Drive:** Bạn muốn các file ảnh báo lỗi được phân loại thư mục thế nào? (Ví dụ: Gom chung hết vào thư mục "Issues", hay mỗi Project có một thư mục Issues riêng biệt?)
3. **Về Database:** Bạn đã thiết kế bảng Database cho phần "Issues" này chưa? Nếu có, vui lòng cung cấp schema (hoặc tên các cột) để tôi map code chính xác.

## 4. Kế hoạch kiểm thử (Verification Plan)
- **Bước 1:** Test function cục bộ bằng lệnh `supabase functions serve`. Dùng Postman hoặc React local để upload file mẫu.
- **Bước 2:** Lên Google Drive kiểm tra xem file đã xuất hiện và mở ra xem bình thường được không.
- **Bước 3:** Deploy function lên production và test thử tải file nặng (PDF bản vẽ ~20MB).
