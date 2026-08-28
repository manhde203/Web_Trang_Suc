const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const rateLimit = require('express-rate-limit');

const { attachUser } = require('./middleware/auth');
const { ensureCsrfToken } = require('./middleware/csrf');
const cartService = require('./services/cart');
const { formatVnd } = require('./utils/format');
const { pool } = require('./config/db');
const path = require('path');

const shopRoutes = require('./routes/shop.routes');
const authRoutes = require('./routes/auth.routes');
const cartRoutes = require('./routes/cart.routes');

const isProduction = process.env.NODE_ENV === 'production';

const app = express();
const sessionStore = new MySQLStore({}, pool);

// Ẩn header tiết lộ công nghệ backend
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Giá trị mặc định cho các biến dùng trong view — đặt SỚM NHẤT có thể (trước cả
// session/helmet) để nếu có lỗi xảy ra ở middleware phía sau (vd: mất kết nối
// MySQL), trang error.ejs/404.ejs vẫn render được bình thường thay vì crash
// thêm lần nữa vì thiếu biến (currentUser, csrfToken, cartCount...).
app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.csrfToken = '';
  res.locals.cartCount = 0;
  res.locals.flash = null;
  res.locals.currentPath = req.path;
  next();
});

// ----- View engine -----
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.locals.formatVnd = formatVnd;

// ----- Bảo mật HTTP headers -----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://provinces.open-api.vn'],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ----- Giới hạn tần suất request (chống brute-force / spam) -----
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.',
});
app.use(['/dang-nhap', '/dang-ky'], authLimiter);

// ----- Body parsing -----
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(express.json({ limit: '50kb' }));

// ----- Session lưu trong MySQL -----
app.use(
  session({
    store: sessionStore,
    name: 'lili.sid',
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-.env',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction, // chỉ gửi cookie qua HTTPS khi chạy production
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
    },
  })
);

// ----- Static assets -----
app.use('/public', express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d' }));

// ----- Middleware dùng chung -----
app.use(attachUser);
app.use(ensureCsrfToken);

// Đếm số sản phẩm trong giỏ hàng để hiển thị ở header, và lấy/xóa flash message
app.use(async (req, res, next) => {
  try {
  const owner = cartService.ownerKey(req);
  const { itemCount } = await cartService.getCartSummary(owner);
  res.locals.cartCount = itemCount;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentPath = req.path;
  next();
  } catch (error) { next(error); }
});

// ----- Routes -----
app.use('/', shopRoutes);
app.use('/', authRoutes);
app.use('/', cartRoutes);

// ----- 404 -----
app.use((req, res) => {
  res.status(404).render('404', { title: 'Không tìm thấy trang' });
});

// ----- Xử lý lỗi tập trung (không lộ chi tiết lỗi ra ngoài) -----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Đã có lỗi xảy ra',
    message: 'Rất tiếc, hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  });
});

module.exports = app;
