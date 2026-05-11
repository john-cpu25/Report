# Chiến lược Quản trị & Tối ưu hóa Hệ thống (Senior IT Roadmap)

Tài liệu này trình bày tầm nhìn chiến lược của một Senior IT Engineer về việc duy trì, nâng cấp và tối ưu hóa ứng dụng Weekly Report để đảm bảo tính bền vững, hiệu năng cao và khả năng mở rộng.

## 1. Kế hoạch Review Code & Tiêu chuẩn Chất lượng
Mục tiêu: Đảm bảo mã nguồn sạch (Clean Code), dễ đọc và không có lỗi logic tiềm ẩn.

- **Tiêu chuẩn hóa (Linting & Formatting)**: Áp dụng ESLint và Prettier nghiêm ngặt để mọi file code đều có cấu trúc đồng nhất.
- **Quy trình Review**: 
    - Kiểm tra tính tái sử dụng của Component.
    - Phát hiện các biến không sử dụng hoặc các đoạn code dư thừa.
    - Đảm bảo xử lý lỗi (Error Handling) đầy đủ ở mọi tầng API.
- **Tài liệu hóa**: Yêu cầu comment JSDoc cho các hàm xử lý logic phức tạp (đặc biệt là trong `CSVProcessor` và `PerformanceEngine`).

## 2. Bảo trì Code (Maintenance Strategy)
Mục tiêu: Giảm thiểu nợ kỹ thuật (Technical Debt) và đảm bảo hệ thống luôn ổn định.

- **Refactoring định kỳ**: Dành 20% thời lượng mỗi phiên làm việc để tái cấu trúc các module cũ (Legacy Code) sang các Hook hiện đại.
- **Dependency Management**: Kiểm tra và cập nhật các thư viện (`npm audit fix`) hàng tháng để tránh lỗ hổng bảo mật.
- **Modulization**: Tiếp tục tách nhỏ các component lớn thành các sub-component chuyên biệt để dễ dàng bảo trì và viết Unit Test.

## 3. Đề xuất Nâng cấp Hệ thống (Web Upgrades)
Mục tiêu: Áp dụng các công nghệ mới nhất để cải thiện trải nghiệm người dùng.

- **Chuyển đổi sang Next.js**: Nếu hệ thống phát triển lớn hơn, cân nhắc chuyển sang Next.js để tận dụng Server Side Rendering (SSR) giúp tải dữ liệu báo cáo nhanh hơn.
- **State Management**: Nâng cấp từ `Context API` sang `TanStack Query (React Query)` để quản lý cache dữ liệu từ Supabase chuyên nghiệp hơn.
- **Micro-interactions**: Tích hợp các thư viện như `Framer Motion` (đang sử dụng) sâu hơn vào các tab Data Analyst để tạo cảm giác mượt mà khi lọc dữ liệu.

## 4. Tối ưu hóa Hệ thống (Performance Optimization)
Mục tiêu: Đạt chỉ số Performance tối đa trên Lighthouse.

- **Data Fetching Optimization**:
    - Sử dụng **Pagination** hoặc **Infinite Scroll** triệt để (đã bắt đầu với 300 record limit).
    - Chỉ fetch các cột dữ liệu cần thiết thay vì chọn `*` từ Supabase.
- **Assets Optimization**:
    - Lazy loading cho các biểu đồ nặng.
    - Tối ưu hóa kích thước bundle thông qua Code Splitting.
- **Security**: 
    - Triển khai **Row Level Security (RLS)** trên Supabase để bảo vệ dữ liệu ở tầng DB.
    - Kiểm tra và ngăn chặn các cuộc tấn công XSS/CSRF thông qua việc sanitize dữ liệu đầu vào.

---
*Ghi chú: Tài liệu này sẽ được cập nhật liên tục dựa trên quy mô phát triển thực tế của dự án.*
