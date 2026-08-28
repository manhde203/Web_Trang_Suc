const crypto = require('crypto');

// Middleware CSRF đơn giản dựa trên session: sinh một token ngẫu nhiên cho mỗi
// phiên, nhúng vào form (input ẩn), và đối chiếu khi có yêu cầu thay đổi dữ liệu.
function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const tokenFromForm = req.body && req.body._csrf;
  const tokenFromSession = req.session && req.session.csrfToken;

  if (!tokenFromSession || !tokenFromForm || tokenFromForm !== tokenFromSession) {
    return res.status(403).render('error', {
      title: 'Yêu cầu không hợp lệ',
      message: 'Phiên làm việc đã hết hạn hoặc yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.',
    });
  }
  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken };
