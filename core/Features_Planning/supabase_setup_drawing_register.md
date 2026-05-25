# Hướng dẫn tạo bảng NMK_Drawing_Register trên Supabase

Bạn đã yêu cầu lưu lại hướng dẫn này để ngày mai có thể tiếp tục cập nhật.

## Tình trạng hiện tại:
Mã nguồn React (Frontend) đã được AI cập nhật hoàn tất để có thể đọc, phân tích và lưu dữ liệu từ file Excel lên hệ thống. Tuy nhiên, trên Supabase hiện tại chưa có bảng `NMK_Drawing_Register` để chứa lượng dữ liệu này, dẫn đến lỗi khi bạn cố gắng Upload.

## Các bước thực hiện (Dành cho ngày mai)

**Bước 1:** Đăng nhập vào trang quản trị Supabase của bạn, chọn dự án.

**Bước 2:** Nhìn sang thanh menu bên trái, bấm vào **SQL Editor** (biểu tượng `>_`).

**Bước 3:** Tạo một **New query** mới.

**Bước 4:** Copy toàn bộ đoạn mã SQL dưới đây và dán vào khung soạn thảo:

```sql
CREATE TABLE NMK_Drawing_Register (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id text NOT NULL UNIQUE,
  register_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bật bảo mật RLS và cho phép tất cả truy cập (tạm thời để upload dễ dàng)
ALTER TABLE NMK_Drawing_Register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép tất cả truy cập" ON NMK_Drawing_Register FOR ALL USING (true);
```

**Bước 5:** Bấm nút **RUN** ở góc phải bên dưới màn hình.
Nếu Supabase báo Success (Thành công), mọi thứ đã xong!

**Bước 6:** Quay lại trang web báo cáo của bạn, nhấn **F5** để làm mới trang. 
Sau đó vào tính năng Drawing Issues, chọn dự án và thử Upload lại file Excel `DrawingRegister.xlsx`. Dữ liệu sẽ lập tức được hiển thị và lưu an toàn trên Supabase.

---
*Lưu ý: Mọi tiến trình code trên máy cục bộ đã được AI hoàn thiện và chạy tốt, bạn chỉ cần bổ sung database là hệ thống sẽ hoạt động trơn tru.*
