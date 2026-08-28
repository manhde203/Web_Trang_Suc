const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

const qCategories = 'SELECT * FROM categories ORDER BY sort_order ASC';
const qFeatured = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.is_featured = 1 ORDER BY p.created_at DESC LIMIT 8
`;
const qNewArrivals = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.is_new = 1 ORDER BY p.created_at DESC LIMIT 8
`;
const qCategoryBySlug = 'SELECT * FROM categories WHERE slug = ?';
const qProductsByCategory = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.category_id = ? ORDER BY p.created_at DESC
`;
const qProductBySlug = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.slug = ?
`;
const qRelatedProducts = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.category_id = ? AND p.id != ? ORDER BY RAND() LIMIT 4
`;
const qSearch = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.name LIKE ? ORDER BY p.created_at DESC LIMIT 40
`;

// Trang chủ
router.get('/', async (req, res, next) => {
  try {
  res.render('home', {
    title: 'LiLi Jewelry - Trang sức bạc cao cấp',
    categories: await query(qCategories),
    featured: await query(qFeatured),
    newArrivals: await query(qNewArrivals),
  });
  } catch (error) { next(error); }
});

// Trang danh mục
router.get('/danh-muc/:slug', async (req, res, next) => {
  try {
  const [category] = await query(qCategoryBySlug, [req.params.slug]);
  if (!category) return res.status(404).render('404', { title: 'Không tìm thấy trang' });

  const products = await query(qProductsByCategory, [category.id]);
  res.render('category', {
    title: `${category.name} - LiLi Jewelry`,
    categories: await query(qCategories),
    category,
    products,
  });
  } catch (error) { next(error); }
});

// Trang chi tiết sản phẩm
router.get('/san-pham/:slug', async (req, res, next) => {
  try {
  const [product] = await query(qProductBySlug, [req.params.slug]);
  if (!product) return res.status(404).render('404', { title: 'Không tìm thấy sản phẩm' });

  const related = await query(qRelatedProducts, [product.category_id, product.id]);
  res.render('product', {
    title: `${product.name} - LiLi Jewelry`,
    categories: await query(qCategories),
    product,
    related,
  });
  } catch (error) { next(error); }
});

// Tìm kiếm
router.get('/tim-kiem', async (req, res, next) => {
  try {
  const q = (req.query.q || '').trim();
  const products = q ? await query(qSearch, [`%${q}%`]) : [];
  res.render('search', {
    title: q ? `Kết quả cho "${q}" - LiLi Jewelry` : 'Tìm kiếm',
    categories: await query(qCategories),
    query: q,
    products,
  });
  } catch (error) { next(error); }
});

module.exports = router;
