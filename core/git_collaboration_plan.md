# RINCOVITCH REPORT - GIT COLLABORATION & BRANCHING PLAN

## 1. Branch Structure (Mô hình 3 Nhánh)

### 🟢 Nhánh `main` (Production Branch)
- **Mục đích**: Chứa mã nguồn ổn định nhất đang chạy thực tế.
- **Quy tắc**: 
    - Không bao giờ code trực tiếp trên nhánh này.
    - Chỉ gộp code (Merge) từ các nhánh cá nhân sau khi đã Review kỹ.
    - Gắn Tag phiên bản (v4.8, v4.9...) tại đây.

### 🔵 Nhánh `nhan-workspace` (Developer: Nhan Nguyen & AI)
- **Mục đích**: Khu vực phát triển tính năng mới, giao diện và logic cao cấp.
- **Quy tắc**:
    - Là nhánh làm việc hàng ngày của Nhan.
    - Thường xuyên `git pull origin main` để cập nhật code mới từ cộng sự (nếu có).

### 🟡 Nhánh `partner-workspace` (Developer: Cộng sự)
- **Mục đích**: Khu vực làm việc riêng của cộng sự.
- **Quy tắc**:
    - Chỉ làm việc trên nhánh này.
    - Gửi **Pull Request** cho Nhan khi muốn gộp code vào `main`.

---

## 2. Phân biệt Code (Authorship)

- **Commit Message Standard**: `UPDATE_VERSION_MODULE_CONTENT`
    - Ví dụ: `UPDATE_V4.9.0_SECURITY_RBAC`
- **GitLens/Git Blame**: Sử dụng để kiểm tra người viết từng dòng code trong VS Code.
- **Update Logs**: Mỗi người khi update xong nên tạo 1 file log trong thư mục `/core/` (Ví dụ: `UPDATE_V4.9.0_NHAN_LOG.md`).

---

## 3. Quy trình gộp Code (Merge Workflow)

1. **Task Assignment**: Thỏa thuận trước ai làm file nào/module nào để tránh conflict.
2. **Feature Development**: Code trên nhánh cá nhân.
3. **Pull Request (PR)**: Tạo PR trên GitHub để so sánh sự thay đổi.
4. **Code Review**: Admin (Nhan) kiểm tra code trong PR.
5. **Merge**: Gộp vào `main` nếu đạt yêu cầu.
6. **Sync**: Tất cả mọi người `git checkout main` -> `git pull` để lấy bản mới nhất về nhánh cá nhân của mình.

---

## 4. Build & Deployment Pipeline (Quy trình đẩy lên Web)

Dựa trên sơ đồ quy trình hệ thống:

1. **Local Development**: Mỗi developer làm việc trên Localhost thuộc nhánh riêng.
2. **Push/Pull**: Code được đẩy lên GitHub định kỳ.
3. **Merging**: Sau khi Pull Request được duyệt, code từ các nhánh cá nhân sẽ được gộp vào `main`.
4. **Build & Deploy**: 
    - GitHub sẽ kích hoạt lệnh `Build` (Vite Build).
    - Sau khi Build thành công, code sẽ được `Deploy` tự động lên môi trường Web (Production).

**Lưu ý**: Chỉ thực hiện Merge khi đảm bảo code trên Localhost đã chạy ổn định, tránh làm hỏng bản Web đang hoạt động.

---
*Vị trí file này: /core/git_collaboration_plan.md*
