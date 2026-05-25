# Hướng dẫn Toàn tập: Tích hợp Google Drive & Supabase Edge Functions

Tài liệu này lưu lại kiến trúc, cách hoạt động và các bước thiết lập chi tiết để kết nối ứng dụng React với Google Drive thông qua Supabase Edge Functions. Dùng để tham khảo khi cần thiết lập lại hoặc chuyển sang dự án mới.

---

## 1. Kiến trúc Hệ thống (Cách hoạt động)

Chúng ta **không** gọi Google Drive API trực tiếp từ giao diện React (Frontend) vì sẽ làm lộ mã khóa bí mật (Secret Key) của Google. Thay vào đó, chúng ta dùng kiến trúc sau:

**`Giao diện React`** ➡️ **`Supabase Edge Functions`** ➡️ **`Google Drive API`**

1. **Giao diện React (Frontend):** Người dùng chọn file, điền thông tin dự án. Trình duyệt gửi file dưới dạng `FormData` lên một API an toàn của Supabase (gọi là Edge Function).
2. **Supabase Edge Functions (Backend):** 
   - Hàm `create-issue-folder`: Nhận tên dự án và tự động tạo cây thư mục theo cấu trúc `[Tên Dự án]/Issue/[YY.MM.DD]`. Nếu thư mục đã có thì trả về ID của thư mục đó.
   - Hàm `upload-issue-attachment`: Nhận file từ Frontend và đẩy thẳng lên thư mục Google Drive đã tạo ở trên.
3. **Google Drive API:** Cấp quyền thông qua một "Tài khoản dịch vụ" (Service Account) của Google.

---

## 2. Các bước Setup từ A-Z (Dành cho môi trường mới)

### Bước 1: Thiết lập Google Service Account
1. Vào **Google Cloud Console** (console.cloud.google.com).
2. Tạo một Project mới (hoặc dùng project có sẵn).
3. Tìm kiếm và bật (Enable) **Google Drive API**.
4. Vào mục **IAM & Admin > Service Accounts**, tạo một Service Account mới.
5. Tạo khóa (Keys) cho Service Account đó dưới dạng **JSON**. Tải file JSON này về máy (đây chính là `GCP_CREDENTIALS`).
6. Mở file JSON lên, copy địa chỉ email trong trường `"client_email"` (ví dụ: `supabase@balmy-gearing...iam.gserviceaccount.com`).
7. Lên Google Drive của bạn, tạo một thư mục gốc (Ví dụ: `Project`). Bấm chuột phải -> **Share** -> Nhập địa chỉ email vừa copy vào và cấp quyền **Editor (Người chỉnh sửa)**.
8. Lấy ID của thư mục đó trên thanh URL (đoạn mã dài sau `folders/`) để lưu vào biến môi trường.

### Bước 2: Thiết lập Supabase CLI trên máy tính
1. Cài đặt **Supabase CLI** (nếu dùng Windows, có thể cài qua `scoop install supabase` hoặc npm).
2. Mở Terminal tại thư mục dự án (`weekly-report-web`), chạy lệnh:
   ```bash
   supabase login
   ```
   (Lấy token từ màn hình Supabase Dashboard của bạn nhập vào).
3. Liên kết dự án cục bộ với dự án Supabase trên mây:
   ```bash
   supabase link --project-ref <mã-project-ref-của-bạn>
   ```

### Bước 3: Cấu hình Biến môi trường (Secrets)
Edge Functions cần đọc file JSON của Google để lấy quyền đăng nhập. Bạn phải set secret này lên Supabase:
1. Nén toàn bộ nội dung file JSON của Google thành 1 chuỗi liên tục (không có khoảng trắng/xuống dòng thừa).
2. Chạy lệnh:
   ```bash
   supabase secrets set GCP_CREDENTIALS='{"type":"service_account","project_id":"..."}'
   ```
3. Khai báo thêm Folder ID gốc của Google Drive (Ví dụ: thư mục "Project" bạn đã tạo):
   ```bash
   supabase secrets set GDRIVE_ROOT_FOLDER_ID='1JeYf62I-cfJPqEFhnq8v1ow4VavYhhNx'
   ```

### Bước 4: Viết và Deploy Edge Functions
1. Khởi tạo function mới (nếu chưa có):
   ```bash
   supabase functions new upload-issue-attachment
   supabase functions new create-issue-folder
   ```
2. Code các function này bằng Deno/TypeScript (như AI đã làm trong thư mục `supabase/functions/`).
3. Deploy (Đẩy code lên mạng):
   ```bash
   supabase functions deploy create-issue-folder
   supabase functions deploy upload-issue-attachment
   ```

### Bước 5: Kết nối Frontend
Trong code React, thay vì fetch HTTP thông thường, sử dụng thư viện Supabase client:
```javascript
import { supabase } from '../supabaseClient';

// Gọi hàm tạo thư mục
const { data, error } = await supabase.functions.invoke('create-issue-folder', {
  body: { projectNo: "12011" }
});

// Gọi hàm upload file (Dùng FormData)
const formData = new FormData();
formData.append('file', fileObject);
formData.append('folderId', data.folderId);

const { data: uploadData, error: uploadErr } = await supabase.functions.invoke('upload-issue-attachment', {
  body: formData
});
```

---

## 3. Các lưu ý Quan trọng (Troubleshooting)
- **Lỗi không tìm thấy file Edge Function:** Đảm bảo thư mục function nằm đúng vị trí `supabase/functions/[tên-hàm]/index.ts`.
- **Lỗi Google Drive "File not found":** Thường là do bạn quên chia sẻ (Share) thư mục gốc cho cái email của Service Account, hoặc nhập sai `GDRIVE_ROOT_FOLDER_ID`.
- **Lỗi CORS khi gọi từ Frontend:** Trong Edge Function, luôn phải trả về Header CORS (Access-Control-Allow-Origin: '*') đặc biệt là cho request method `OPTIONS`.
- **Supabase Cache:** Mọi thay đổi về Secret key bằng lệnh `supabase secrets set` sẽ tự động restart function, mất khoảng vài giây để áp dụng.
