# Kế hoạch Tự động hóa Commit & Deploy (GitHub Automation)

Tài liệu này mô tả quy trình tự động hóa việc đóng gói (Build), ghi nhận thay đổi (Commit) và đẩy dữ liệu lên GitHub (Push) để tối ưu hóa tốc độ triển khai.

## 1. Mục tiêu
- Loại bỏ các thao tác thủ công khi cập nhật phiên bản.
- Đảm bảo mã nguồn trên GitHub luôn đồng bộ với trạng thái Build thành công mới nhất.
- Tự động hóa việc ghi nhận nhật ký thay đổi (Auto-changelog).

## 2. Quy trình thực hiện (Automation Pipeline)

### Bước 1: Kiểm tra & Build (Pre-commit)
Trước khi commit, hệ thống phải chạy lệnh:
- `npm run build`
- Nếu build thất bại, quy trình tự động sẽ dừng lại để tránh đẩy mã lỗi lên server.

### Bước 2: Tự động tạo Commit Message
Thay vì viết tay, hệ thống sẽ sử dụng các template dựa trên nội dung đã thay đổi:
- Định dạng: `[VERSION] [MODULE] - [SHORT_DESC] - [TIMESTAMP]`
- Ví dụ: `v4.7.5 DASHBOARD - Adjusted 3D numbers layout - 2026-05-11 18:30`

### Bước 3: Đẩy dữ liệu (Auto-Push)
Sử dụng script để thực hiện chuỗi lệnh:
1. `git add .`
2. `git commit -m "Auto-generated message"`
3. `git push origin main`

## 3. Các giải pháp tích hợp

### Giải pháp A: Script nội bộ (Local Automation)
Tạo file `.bat` hoặc `.sh` trong thư mục gốc để chạy bằng 1 click:
```bash
# auto_update.sh
npm run build && \
git add . && \
git commit -m "System auto-update: $(date +'%Y-%m-%d %H:%M')" && \
git push origin main
```

### Giải pháp B: GitHub Actions (CI/CD)
Thiết lập file `.github/workflows/deploy.yml` để:
- Tự động deploy lên Host (Vercel/Netlify) mỗi khi có push mới.
- Tự động chạy test bảo mật.

## 4. Quản lý Phiên bản (Auto-Versioning)
- Tự động cập nhật số phiên bản trong `package.json`.
- Tự động ghi nhận thông tin vào `core/update_plan.md` sau mỗi lần auto-commit thành công.

---
*Ghi chú: Đây là khung kế hoạch để bắt đầu triển khai các công cụ hỗ trợ tự động hóa.*
