const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { requireAuth, requireGuest } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const cartService = require('../services/cart');

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const qFindByEmail = 'SELECT * FROM users WHERE email = ?';
const qInsertUser = `
  INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)
`;
const qBumpFailedAttempts = `
  UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
    locked_until = CASE WHEN failed_login_attempts + 1 >= ? THEN DATE_ADD(NOW(), INTERVAL ? MINUTE) ELSE locked_until END
  WHERE id = ?
`;
const qResetFailedAttempts = `
  UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?
`;

// ---------- GET: trang đăng ký ----------
router.get('/dang-ky', requireGuest, (req, res) => {
  res.render('register', { title: 'Đăng ký tài khoản', errors: [], old: {} });
});

// ---------- POST: xử lý đăng ký ----------
router.post(
  '/dang-ky',
  requireGuest,
  verifyCsrfToken,
  [
    body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự.'),
    body('email').trim().isEmail().withMessage('Email không hợp lệ.').normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().matches(/^[0-9+()\-\s]{8,15}$/).withMessage('Số điện thoại không hợp lệ.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Mật khẩu phải có ít nhất 8 ký tự.')
      .matches(/[A-Za-z]/).withMessage('Mật khẩu phải chứa ít nhất một chữ cái.')
      .matches(/[0-9]/).withMessage('Mật khẩu phải chứa ít nhất một chữ số.'),
    body('confirm_password').custom((value, { req }) => value === req.body.password)
      .withMessage('Mật khẩu xác nhận không khớp.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    const { full_name, email, phone, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render('register', {
        title: 'Đăng ký tài khoản',
        errors: errors.array(),
        old: { full_name, email, phone },
      });
    }

    const [existing] = await query(qFindByEmail, [email]);
    if (existing) {
      return res.status(400).render('register', {
        title: 'Đăng ký tài khoản',
        errors: [{ msg: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.' }],
        old: { full_name, email, phone },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const info = await query(qInsertUser, [email, passwordHash, full_name, phone || null]);

    // Đăng nhập luôn sau khi đăng ký; đổi session id để chống session fixation
    const oldSessionId = req.sessionID;
    req.session.regenerate((err) => {
      if (err) return res.status(500).render('error', { title: 'Lỗi hệ thống', message: 'Không thể tạo phiên đăng nhập.' });
      req.session.userId = info.insertId;
      cartService.mergeGuestCartIntoUser(oldSessionId, info.insertId).catch((mergeError) => console.error(mergeError));
      req.session.flash = { type: 'success', message: `Chào mừng ${full_name} đến với LiLi!` };
      res.redirect('/');
    });
  }
);

// ---------- GET: trang đăng nhập ----------
router.get('/dang-nhap', requireGuest, (req, res) => {
  res.render('login', { title: 'Đăng nhập', errors: [], old: {} });
});

// ---------- POST: xử lý đăng nhập ----------
router.post(
  '/dang-nhap',
  requireGuest,
  verifyCsrfToken,
  [
    body('email').trim().isEmail().withMessage('Email không hợp lệ.').normalizeEmail(),
    body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    const { email, password } = req.body;
    const genericError = 'Email hoặc mật khẩu không chính xác.';

    if (!errors.isEmpty()) {
      return res.status(400).render('login', { title: 'Đăng nhập', errors: errors.array(), old: { email } });
    }

    const [user] = await query(qFindByEmail, [email]);
    if (!user) {
      return res.status(400).render('login', { title: 'Đăng nhập', errors: [{ msg: genericError }], old: { email } });
    }

    if (user.locked_until && new Date(user.locked_until + 'Z') > new Date()) {
      return res.status(423).render('login', {
        title: 'Đăng nhập',
        errors: [{ msg: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${LOCK_MINUTES} phút.` }],
        old: { email },
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await query(qBumpFailedAttempts, [MAX_FAILED_ATTEMPTS, LOCK_MINUTES, user.id]);
      return res.status(400).render('login', { title: 'Đăng nhập', errors: [{ msg: genericError }], old: { email } });
    }

    await query(qResetFailedAttempts, [user.id]);

    // Chống session fixation: tạo session mới khi đăng nhập thành công
    const oldSessionId = req.sessionID;
    req.session.regenerate((err) => {
      if (err) return res.status(500).render('error', { title: 'Lỗi hệ thống', message: 'Không thể tạo phiên đăng nhập.' });
      req.session.userId = user.id;
      cartService.mergeGuestCartIntoUser(oldSessionId, user.id)
        .then(() => {
          req.session.flash = { type: 'success', message: `Chào mừng trở lại, ${user.full_name}!` };
          const redirectTo = req.session.redirectAfterLogin || '/';
          delete req.session.redirectAfterLogin;
          res.redirect(redirectTo);
        })
        .catch(next);
    });
  }
);

// ---------- POST: đăng xuất ----------
router.post('/dang-xuat', verifyCsrfToken, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('lili.sid');
    res.redirect('/');
  });
});

// ---------- GET: trang tài khoản ----------
router.get('/tai-khoan', requireAuth, (req, res) => {
  res.render('account', { title: 'Tài khoản của tôi' });
});

module.exports = router;
