const { query } = require('../config/db');

// Gắn thông tin người dùng hiện tại (nếu đã đăng nhập) vào req.user và res.locals
async function attachUser(req, res, next) {
  try {
  if (req.session && req.session.userId) {
    const [user] = await query('SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?', [req.session.userId]);
    req.user = user || null;
    if (!user) req.session.userId = null; // tài khoản không còn tồn tại
  } else {
    req.user = null;
  }
  res.locals.currentUser = req.user;
  next();
  } catch (error) { next(error); }
}

// Bắt buộc đăng nhập mới được truy cập
function requireAuth(req, res, next) {
  if (!req.user) {
    req.session.flash = { type: 'error', message: 'Vui lòng đăng nhập để tiếp tục.' };
    req.session.redirectAfterLogin = req.originalUrl;
    return res.redirect('/dang-nhap');
  }
  next();
}

// Chỉ dành cho khách chưa đăng nhập (vd: trang đăng nhập/đăng ký)
function requireGuest(req, res, next) {
  if (req.user) return res.redirect('/');
  next();
}

module.exports = { attachUser, requireAuth, requireGuest };
