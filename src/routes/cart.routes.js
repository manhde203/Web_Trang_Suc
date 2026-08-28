const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/db');
const cartService = require('../services/cart');
const { verifyCsrfToken } = require('../middleware/csrf');

const router = express.Router();

const qCategories = 'SELECT * FROM categories ORDER BY sort_order ASC';
const qProduct = 'SELECT * FROM products WHERE id = ?';
const qInsertOrder = `
  INSERT INTO orders (user_id, guest_name, guest_email, guest_phone, shipping_address, total_amount)
  VALUES (?, ?, ?, ?, ?, ?)
`;
const qInsertOrderItem = `
  INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)
`;
const qDecrementStock = 'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?';
const qOrderById = 'SELECT * FROM orders WHERE id = ?';
const qOrderItems = 'SELECT * FROM order_items WHERE order_id = ?';

// Xem giỏ hàng
router.get('/gio-hang', async (req, res, next) => {
  try {
  const owner = cartService.ownerKey(req);
  const summary = await cartService.getCartSummary(owner);
  res.render('cart', { title: 'Giỏ hàng', categories: await query(qCategories), ...summary });
  } catch (error) { next(error); }
});

// Thêm vào giỏ hàng
router.post(
  '/gio-hang/them',
  verifyCsrfToken,
  [body('product_id').isInt({ min: 1 }), body('quantity').optional().isInt({ min: 1, max: 20 })],
  async (req, res, next) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).redirect('back');

    const owner = cartService.ownerKey(req);
    const productId = parseInt(req.body.product_id, 10);
    const quantity = parseInt(req.body.quantity, 10) || 1;

    try {
      await cartService.addItem(owner, productId, quantity);
      req.session.flash = { type: 'success', message: 'Đã thêm sản phẩm vào giỏ hàng.' };
    } catch (e) {
      req.session.flash = { type: 'error', message: 'Không thể thêm sản phẩm vào giỏ hàng.' };
    }
    res.redirect(req.body.redirect_to || '/gio-hang');
    } catch (error) { next(error); }
  }
);

// Cập nhật số lượng
router.post(
  '/gio-hang/cap-nhat',
  verifyCsrfToken,
  [body('item_id').isInt({ min: 1 }), body('quantity').isInt({ min: 0, max: 20 })],
  async (req, res, next) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).redirect('/gio-hang');

    const owner = cartService.ownerKey(req);
    await cartService.updateItemQuantity(owner, parseInt(req.body.item_id, 10), parseInt(req.body.quantity, 10));
    res.redirect('/gio-hang');
    } catch (error) { next(error); }
  }
);

// Xóa sản phẩm khỏi giỏ
router.post('/gio-hang/xoa', verifyCsrfToken, [body('item_id').isInt({ min: 1 })], async (req, res, next) => {
  try {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).redirect('/gio-hang');

  const owner = cartService.ownerKey(req);
  await cartService.removeItem(owner, parseInt(req.body.item_id, 10));
  res.redirect('/gio-hang');
  } catch (error) { next(error); }
});

// Trang thanh toán
router.get('/thanh-toan', async (req, res, next) => {
  try {
  const owner = cartService.ownerKey(req);
  const summary = await cartService.getCartSummary(owner);
  if (summary.items.length === 0) return res.redirect('/gio-hang');

  res.render('checkout', {
    title: 'Thanh toán',
    categories: await query(qCategories),
    errors: [],
    old: {},
    ...summary,
  });
  } catch (error) { next(error); }
});

// Xử lý đặt hàng
router.post(
  '/thanh-toan',
  verifyCsrfToken,
  [
    body('full_name').trim().isLength({ min: 2, max: 100 }).withMessage('Vui lòng nhập họ tên hợp lệ.'),
    body('email').trim().isEmail().withMessage('Email không hợp lệ.').normalizeEmail(),
    body('phone').trim().matches(/^[0-9+()\-\s]{8,15}$/).withMessage('Số điện thoại không hợp lệ.'),
    body('province').trim().isLength({ min: 2, max: 100 }).withMessage('Vui lòng chọn Tỉnh / Thành phố.'),
    body('district').trim().isLength({ min: 2, max: 100 }).withMessage('Vui lòng nhập Quận / Huyện.'),
    body('ward').trim().isLength({ min: 2, max: 100 }).withMessage('Vui lòng nhập Phường / Xã.'),
    body('address').trim().isLength({ min: 5, max: 300 }).withMessage('Vui lòng nhập địa chỉ giao hàng đầy đủ.'),
  ],
  async (req, res, next) => {
    try {
    const owner = cartService.ownerKey(req);
    const summary = await cartService.getCartSummary(owner);

    if (summary.items.length === 0) return res.redirect('/gio-hang');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('checkout', {
        title: 'Thanh toán',
        categories: await query(qCategories),
        errors: errors.array(),
        old: req.body,
        ...summary,
      });
    }

    const { full_name, email, phone, address, ward, district, province } = req.body;
    const shippingAddress = [address, ward, district, province].map((part) => part.trim()).join(', ');

    // Kiểm tra lại tồn kho ngay trước khi tạo đơn để tránh bán vượt tồn kho
    for (const item of summary.items) {
      const [product] = await query(qProduct, [item.product_id]);
      if (!product || product.stock < item.quantity) {
        return res.status(400).render('checkout', {
          title: 'Thanh toán',
          categories: await query(qCategories),
          errors: [{ msg: `Sản phẩm "${item.name}" không đủ số lượng tồn kho.` }],
          old: req.body,
          ...summary,
        });
      }
    }

    const orderId = await transaction(async (connection) => {
      const orderInfo = await query(qInsertOrder,
        [
        req.user ? req.user.id : null,
        full_name,
        email,
        phone,
        shippingAddress,
        summary.total,
        ], connection);
      const newOrderId = orderInfo.insertId;

      for (const item of summary.items) {
        await query(qInsertOrderItem, [newOrderId, item.product_id, item.name, item.unitPrice, item.quantity], connection);
        await query(qDecrementStock, [item.quantity, item.product_id], connection);
      }
      await cartService.clearCart(owner, connection);
      return newOrderId;
    });

    res.redirect(`/don-hang/${orderId}/thanh-cong`);
    } catch (error) { next(error); }
  }
);

// Trang xác nhận đơn hàng thành công
router.get('/don-hang/:id/thanh-cong', async (req, res, next) => {
  try {
  const [order] = await query(qOrderById, [req.params.id]);
  if (!order) return res.status(404).render('404', { title: 'Không tìm thấy đơn hàng' });

  const items = await query(qOrderItems, [order.id]);
  res.render('order-success', {
    title: 'Đặt hàng thành công',
    categories: await query(qCategories),
    order,
    items,
  });
  } catch (error) { next(error); }
});

module.exports = router;
