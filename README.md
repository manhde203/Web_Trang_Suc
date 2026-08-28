# LiLi Jewelry — Website trang sức (chạy trên XAMPP + MySQL)

Website thương mại điện tử trang sức bạc. Backend Node.js + Express, giao diện EJS, dữ liệu lưu trong **MySQL** (dùng chung với MySQL đi kèm XAMPP) — phù hợp để quản lý qua phpMyAdmin và dễ triển khai lên hosting thật sau này.

## 1. Công nghệ sử dụng

| Thành phần        | Công nghệ                                  |
|--------------------|---------------------------------------------|
| Backend            | Node.js, Express                            |
| View / giao diện   | EJS (server-side render) + CSS thuần        |
| Cơ sở dữ liệu       | **MySQL** (`mysql2`) — dùng MySQL đi kèm XAMPP |
| Session            | `express-session` lưu trong MySQL (`express-mysql-session`), bảng `sessions` tự tạo |
| Mật khẩu           | `bcryptjs` (băm, không lưu plaintext)       |
| Bảo mật HTTP header | `helmet`                                    |
| Giới hạn request    | `express-rate-limit`                        |
| Validate dữ liệu    | `express-validator`                         |

> **Lưu ý quan trọng:** XAMPP's Apache **không** chạy được Node.js. Đặt dự án trong `htdocs` chỉ để tiện quản lý file — bạn vẫn phải khởi động dự án bằng `npm start`, không phải qua Apache. XAMPP ở đây chỉ đóng vai trò cung cấp **MySQL server** + **phpMyAdmin**.

## 2. Chuẩn bị XAMPP

1. Mở **XAMPP Control Panel**, bấm **Start** ở dòng **MySQL** (không cần Start Apache).
2. Đợi đến khi dòng MySQL chuyển màu xanh — vậy là MySQL đã sẵn sàng ở cổng mặc định `3306`.
3. Cấu hình mặc định của XAMPP: user `root`, **không có mật khẩu**. Nếu bạn đã tự đặt mật khẩu cho root trước đó, nhớ điền vào file `.env` ở bước bên dưới.

## 3. Cài đặt & chạy dự án

Yêu cầu: đã cài **Node.js phiên bản 18 trở lên** (kiểm tra bằng `node -v`).

```bash
# 1. Di chuyển vào thư mục dự án
cd lili-jewelry

# 2. Cài dependency
npm install

# 3. Tạo file cấu hình môi trường từ mẫu
cp .env.example .env
```

Mở file `.env` vừa tạo:
- Đổi `SESSION_SECRET` thành một chuỗi ngẫu nhiên, dài (sinh nhanh bằng lệnh `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- Kiểm tra `DB_USER` / `DB_PASSWORD` khớp với cấu hình MySQL của XAMPP (mặc định `root` / không mật khẩu, không cần sửa gì nếu bạn dùng cấu hình gốc của XAMPP).
- **Không cần tự tạo database trước** — dự án sẽ tự tạo database `lili_jewelry` (và toàn bộ bảng) khi chạy lần đầu.

```bash
# 4. Nạp dữ liệu mẫu (danh mục + sản phẩm) — chỉ cần chạy 1 lần
npm run seed

# 5. Khởi chạy server
npm start
```

Mở trình duyệt tại: **http://localhost:3000**

Trong lúc phát triển, có thể dùng `npm run dev` (tự khởi động lại khi sửa code).

## 4. Xem / quản lý dữ liệu qua phpMyAdmin

Mở `http://localhost/phpmyadmin` (Apache của XAMPP cần Start để truy cập trang này), chọn database **`lili_jewelry`** ở danh sách bên trái — bạn sẽ thấy các bảng `users`, `products`, `categories`, `cart_items`, `orders`, `order_items`, `sessions`.

## 5. Các chức năng chính

- **Trang chủ**: banner, danh mục nổi bật, sản phẩm được yêu thích, sản phẩm mới.
- **Danh mục / tìm kiếm**: liệt kê sản phẩm theo danh mục hoặc từ khóa.
- **Chi tiết sản phẩm**: mô tả, giá, đánh giá, tồn kho, sản phẩm liên quan.
- **Giỏ hàng**: thêm / sửa số lượng / xóa sản phẩm — lưu trong bảng `cart_items` của MySQL.
- **Tài khoản**: đăng ký, đăng nhập, đăng xuất. Giỏ hàng khách tự động gộp vào tài khoản khi đăng nhập/đăng ký.
- **Thanh toán**: chọn Tỉnh/Thành - Quận/Huyện - Phường/Xã (dữ liệu địa chỉ Việt Nam lấy từ API công khai provinces.open-api.vn), tạo đơn hàng thật trong bảng `orders`/`order_items`, trừ tồn kho. (Bản demo — không kết nối cổng thanh toán thật.)

## 6. Các lớp bảo mật đã áp dụng

- **Mật khẩu**: băm bằng `bcrypt` (12 rounds).
- **Khóa tài khoản tạm thời**: sau 5 lần đăng nhập sai, khóa 15 phút.
- **CSRF protection**: mỗi form POST mang theo token gắn với session.
- **Session an toàn**: cookie `httpOnly`, `sameSite=lax`, tự đổi session ID khi đăng nhập (chống session fixation), lưu trong MySQL nên không mất khi restart server.
- **HTTP security headers**: `helmet` (Content-Security-Policy, chống clickjacking...).
- **Rate limiting**: giới hạn request chung + nghiêm ngặt hơn cho `/dang-nhap`, `/dang-ky`.
- **Validate & sanitize input**: `express-validator` cho mọi dữ liệu người dùng nhập.
- **Prepared statements** (`mysql2` với tham số `?`) — chống SQL injection.
- **Thông báo lỗi chung chung khi đăng nhập sai** — tránh dò tài khoản.

## 7. Xử lý sự cố thường gặp

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL của XAMPP chưa được Start | Mở XAMPP Control Panel, Start MySQL |
| `ER_ACCESS_DENIED_ERROR` | Sai `DB_USER`/`DB_PASSWORD` trong `.env` | Kiểm tra lại thông tin đăng nhập MySQL |
| `npm` không được nhận diện | Chưa cài Node.js hoặc chưa nạp lại PATH | Cài Node.js từ nodejs.org, khởi động lại VS Code |

## 8. Reset dữ liệu

Muốn xóa hết dữ liệu và bắt đầu lại từ đầu, mở phpMyAdmin và xóa (Drop) database `lili_jewelry`, sau đó chạy lại:

```bash
npm run seed
```
