# Kế hoạch triển khai: API Admin cho System Notification (Thông báo hệ thống)

Tài liệu này là kế hoạch chi tiết để phát triển hai API quản lý thông báo hệ thống dành cho Admin trong folder `src/api/admin/notification/`.

---

## 1. Mục tiêu và Yêu cầu
1. **API 1: Lấy danh sách các thông báo hệ thống**
   * **Endpoint**: `GET /api/admin/notifications`
   * **Chi tiết**: Lấy ra toàn bộ thông báo có `type` là `system` từ bảng `Notifications` trong cơ sở dữ liệu. Hỗ trợ phân trang (`page`, `limit`) và sắp xếp theo thời gian giảm dần (mới nhất lên đầu).
2. **API 2: Tạo thông báo hệ thống và gửi đến tất cả người dùng**
   * **Endpoint**: `POST /api/admin/notifications`
   * **Chi tiết**: Nhận các trường `title` và `body` từ request body để tạo một bản ghi thông báo mới có `type` là `system` trong bảng `Notifications`. Sau đó, tạo liên kết đến tất cả người dùng đang hoạt động (`is_active: true`) và gửi thông báo qua Server-Sent Events (SSE) và Firebase Cloud Messaging (FCM) thông qua hàm dùng chung trong hệ thống.

---

## 2. Thiết kế Chi tiết & File Cần Chỉnh Sửa

### 1. `src/api/admin/notification/notification.service.ts`
Triển khai logic tương tác cơ sở dữ liệu (sử dụng Prisma):
* **Hàm `getSystemNotifications`**:
  * Nhận tham số `page` và `limit` để thực hiện phân trang.
  * Sử dụng `prisma.notifications.findMany` với điều kiện lọc `where: { type: 'system' }`.
  * Trả về danh sách thông báo kèm theo thông tin phân trang (`total`, `page`, `limit`, `hasMore`).
* **Hàm `createSystemNotification`**:
  * Nhận tham số `title` và `body`.
  * Truy vấn cơ sở dữ liệu lấy danh sách ID của tất cả người dùng có trạng thái hoạt động (`is_active: true`).
  * Gọi hàm `createNotification(userIds, 'system', title, body)` được nhập từ `src/api/notification/notification.service.ts` để lưu vào DB và tự động gửi thời gian thực tới người dùng.

### 2. `src/api/admin/notification/notification.controller.ts`
Đảm nhận vai trò xử lý HTTP Request và Response:
* **Hàm `getSystemNotifications`**:
  * Đọc `page` và `limit` từ `req.query`.
  * Gọi service và trả về mã `200 OK` kèm dữ liệu và metadata phân trang.
* **Hàm `createSystemNotification`**:
  * Đọc `title` và `body` từ `req.body`.
  * Xác thực dữ liệu đầu vào: Cả hai trường đều bắt buộc và phải là chuỗi không rỗng.
  * Gọi service để tạo và gửi thông báo, sau đó trả về `201 Created` kèm dữ liệu thông báo vừa tạo.

### 3. `src/api/admin/notification/notification.route.ts`
Định nghĩa các route và tích hợp tài liệu Swagger (nếu có):
* Đường dẫn `GET /` -> liên kết đến `getSystemNotifications` của Controller.
* Đường dẫn `POST /` -> liên kết đến `createSystemNotification` của Controller.

### 4. `src/api/admin/index.ts`
Đăng ký router này vào hệ thống Admin:
* Nhập router mới:
  ```typescript
  import notificationRouter from './notification/notification.route.js';
  ```
* Khai báo sử dụng:
  ```typescript
  router.use('/notifications', notificationRouter);
  ```

---

## 3. Cách thức Xác thực & Phân quyền
* API được đặt trong group `/api/admin/*`, do đó sẽ tự động được bảo vệ bởi hai middleware ở tầng cha (`src/api/index.ts`):
  * `Authenticate`: Xác thực JWT token của người dùng.
  * `Authorize('admin')`: Kiểm tra quyền truy cập, chỉ cho phép tài khoản có `role: 'admin'` truy cập.
