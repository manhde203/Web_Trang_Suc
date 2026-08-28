const { query, transaction } = require('../config/db');

function ownerKey(req) {
  return req.user ? `user:${req.user.id}` : `guest:${req.sessionID}`;
}

const qGetItems = `
  SELECT ci.id, ci.product_id, ci.quantity, p.name, p.slug, p.price, p.sale_price,
         p.color_theme, p.stock
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  WHERE ci.cart_owner = ?
  ORDER BY ci.id DESC
`;

const qFindItem = `SELECT * FROM cart_items WHERE cart_owner = ? AND product_id = ?`;
const qInsertItem = `INSERT INTO cart_items (cart_owner, product_id, quantity) VALUES (?, ?, ?)`;
const qUpdateQty = `UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_owner = ?`;
const qDeleteItem = `DELETE FROM cart_items WHERE id = ? AND cart_owner = ?`;
const qClearOwner = `DELETE FROM cart_items WHERE cart_owner = ?`;
const qProductStock = `SELECT stock FROM products WHERE id = ?`;

async function getCartItems(owner, connection) {
  const rows = await query(qGetItems, [owner], connection);
  return rows.map((r) => ({
    ...r,
    unitPrice: r.sale_price || r.price,
    lineTotal: (r.sale_price || r.price) * r.quantity,
  }));
}

async function getCartSummary(owner) {
  const items = await getCartItems(owner);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { items, itemCount, total };
}

async function addItem(owner, productId, quantity = 1) {
  const [product] = await query(qProductStock, [productId]);
  if (!product) throw new Error('Sản phẩm không tồn tại.');

  const [existing] = await query(qFindItem, [owner, productId]);
  const newQty = Math.min((existing ? existing.quantity : 0) + quantity, product.stock, 20);

  if (existing) {
    await query(qUpdateQty, [newQty, existing.id, owner]);
  } else {
    await query(qInsertItem, [owner, productId, Math.max(1, Math.min(quantity, product.stock, 20))]);
  }
}

async function updateItemQuantity(owner, itemId, quantity) {
  if (quantity <= 0) {
    await query(qDeleteItem, [itemId, owner]);
    return;
  }
  await query(qUpdateQty, [Math.min(quantity, 20), itemId, owner]);
}

async function removeItem(owner, itemId) {
  await query(qDeleteItem, [itemId, owner]);
}

async function clearCart(owner, connection) {
  await query(qClearOwner, [owner], connection);
}

// Khi khách đăng nhập/đăng ký thành công: gộp giỏ hàng khách (theo sessionID) vào giỏ hàng tài khoản
async function mergeGuestCartIntoUser(sessionId, userId) {
  const guestOwner = `guest:${sessionId}`;
  const userOwner = `user:${userId}`;
  const guestItems = await query(`SELECT product_id, quantity FROM cart_items WHERE cart_owner = ?`, [guestOwner]);

  await transaction(async (connection) => {
    for (const item of guestItems) {
      const [product] = await query(qProductStock, [item.product_id], connection);
      const [existing] = await query(qFindItem, [userOwner, item.product_id], connection);
      if (existing) {
        await query(qUpdateQty, [Math.min(existing.quantity + item.quantity, product.stock, 20), existing.id, userOwner], connection);
      } else {
        await query(qInsertItem, [userOwner, item.product_id, Math.min(item.quantity, product.stock, 20)], connection);
      }
    }
    await query(qClearOwner, [guestOwner], connection);
  });
}

module.exports = {
  ownerKey,
  getCartItems,
  getCartSummary,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  mergeGuestCartIntoUser,
};
