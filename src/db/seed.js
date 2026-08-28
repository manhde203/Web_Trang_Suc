// Script nạp dữ liệu mẫu vào cơ sở dữ liệu MySQL.
// Chạy: npm run seed
require('dotenv').config();
const { query, initializeDatabase, pool } = require('../config/db');

const categories = [
  { slug: 'vong-lac', name: 'Vòng-Lắc', icon: 'bracelet', sort_order: 1 },
  { slug: 'nhan', name: 'Nhẫn', icon: 'ring', sort_order: 2 },
  { slug: 'day-chuyen', name: 'Dây chuyền', icon: 'necklace', sort_order: 3 },
  { slug: 'bong-tai', name: 'Bông tai', icon: 'earring', sort_order: 4 },
  { slug: 'khuyen-xo', name: 'Khuyên xỏ', icon: 'stud', sort_order: 5 },
  { slug: 'phu-kien', name: 'Phụ kiện', icon: 'box', sort_order: 6 },
];

const products = [
  { sku: 'LL-VL-001', name: 'Lắc tay bạc nữ đính đá Trái Tim Đại Dương', category: 'vong-lac', price: 1780000, sale_price: null, material: 'Bạc Ý S925', color_theme: 'rose', is_featured: 1, is_new: 0, rating: 4.9, review_count: 128, description: 'Lắc tay bạc nữ phối đá kết hình trái tim, mạ bạch kim chống xỉn màu, khóa an toàn hai lớp.' },
  { sku: 'LL-VL-002', name: 'Lắc tay bạc nam mắt xích Cuban bản to', category: 'vong-lac', price: 2390000, sale_price: 2150000, material: 'Bạc Ý S925', color_theme: 'graphite', is_featured: 1, is_new: 0, rating: 4.8, review_count: 76, description: 'Thiết kế mắt xích Cuban chắc chắn, nam tính, phù hợp phối cùng đồng hồ hoặc trang phục hằng ngày.' },
  { sku: 'LL-VL-003', name: 'Lắc chân bạc nữ họa tiết cỏ bốn lá', category: 'vong-lac', price: 1250000, sale_price: null, material: 'Bạc S925', color_theme: 'gold', is_featured: 0, is_new: 1, rating: 4.7, review_count: 34, description: 'Lắc chân mảnh nhẹ đính họa tiết cỏ bốn lá may mắn, phù hợp mùa hè.' },
  { sku: 'LL-VL-004', name: 'Lắc tay đôi tình yêu vĩnh cửu (1 cặp)', category: 'vong-lac', price: 2900000, sale_price: null, material: 'Bạc S925', color_theme: 'rose', is_featured: 1, is_new: 0, rating: 5.0, review_count: 52, description: 'Bộ lắc tay dành cho cặp đôi, khắc thông điệp yêu thương, tặng kèm hộp da cao cấp.' },
  { sku: 'LL-NH-001', name: 'Nhẫn bạc nữ đính đá Moissanite Aidan', category: 'nhan', price: 2323000, sale_price: null, material: 'Bạc Ý S925 mạ vàng trắng', color_theme: 'silver', is_featured: 1, is_new: 0, rating: 4.9, review_count: 201, description: 'Nhẫn ổ cao đính đá Moissanite lấp lánh, thiết kế thanh lịch, phù hợp đi làm và dạo phố.' },
  { sku: 'LL-NH-002', name: 'Nhẫn đôi bạc Hiệp Sĩ và Công Chúa', category: 'nhan', price: 2079000, sale_price: null, material: 'Bạc S925', color_theme: 'graphite', is_featured: 0, is_new: 0, rating: 4.8, review_count: 89, description: 'Cặp nhẫn free-size lấy cảm hứng từ câu chuyện cổ tích, biểu tượng cho sự bảo vệ và gắn kết.' },
  { sku: 'LL-NH-003', name: 'Nhẫn bạc nam mặt đá Onyx đen', category: 'nhan', price: 1690000, sale_price: 1490000, material: 'Bạc Ý S925', color_theme: 'graphite', is_featured: 0, is_new: 1, rating: 4.6, review_count: 21, description: 'Nhẫn nam bản dày, mặt đá Onyx đen huyền bí, phong cách cá tính.' },
  { sku: 'LL-NH-004', name: 'Nhẫn bạc nữ hoa bướm đính đá CZ', category: 'nhan', price: 1061000, sale_price: null, material: 'Bạc S925', color_theme: 'rose', is_featured: 0, is_new: 1, rating: 4.7, review_count: 18, description: 'Thiết kế hoa bướm mềm mại, đính đá CZ sáng bóng, size điều chỉnh được.' },
  { sku: 'LL-DC-001', name: 'Dây chuyền bạc nữ mặt tròn Moissanite', category: 'day-chuyen', price: 1780000, sale_price: 1705000, material: 'Bạc Ý S925', color_theme: 'silver', is_featured: 1, is_new: 0, rating: 4.9, review_count: 143, description: 'Mặt dây chuyền tròn cách điệu đính đá Moissanite, dây điều chỉnh 40-45cm.' },
  { sku: 'LL-DC-002', name: 'Dây chuyền đôi hình cá heo Forever Love', category: 'day-chuyen', price: 2720000, sale_price: null, material: 'Bạc S925', color_theme: 'rose', is_featured: 1, is_new: 0, rating: 4.8, review_count: 67, description: 'Bộ dây chuyền đôi hình cá heo dành cho cặp đôi hoặc bạn thân, đính đá CZ.' },
  { sku: 'LL-DC-003', name: 'Dây chuyền bạc nữ phong cách cổ trang cá tiên', category: 'day-chuyen', price: 1346000, sale_price: null, material: 'Bạc S925', color_theme: 'gold', is_featured: 0, is_new: 0, rating: 4.7, review_count: 40, description: 'Thiết kế lấy cảm hứng cổ trang, họa tiết cá tiên tinh xảo, đính đá CZ.' },
  { sku: 'LL-BT-001', name: 'Bông tai bạc nữ đính đá cỏ bốn lá', category: 'bong-tai', price: 842000, sale_price: null, material: 'Bạc S925', color_theme: 'silver', is_featured: 1, is_new: 0, rating: 4.9, review_count: 312, description: 'Bông tai nhỏ xinh hình cỏ bốn lá, đính đá CZ, chốt bạc an toàn cho da nhạy cảm.' },
  { sku: 'LL-BT-002', name: 'Bông tai bạc Ý mạ bạch kim hình trái tim', category: 'bong-tai', price: 1199000, sale_price: null, material: 'Bạc Ý S925', color_theme: 'rose', is_featured: 0, is_new: 1, rating: 4.8, review_count: 55, description: 'Bông tai mạ bạch kim chống xỉn màu, đính đá CZ hình trái tim lãng mạn.' },
  { sku: 'LL-KX-001', name: 'Khuyên rốn bạc nữ đính đá Zircon', category: 'khuyen-xo', price: 620000, sale_price: null, material: 'Bạc Ý S925 chống dị ứng', color_theme: 'silver', is_featured: 0, is_new: 0, rating: 4.6, review_count: 27, description: 'Khuyên rốn chất liệu an toàn cho da, đính đá Zircon lấp lánh.' },
  { sku: 'LL-KX-002', name: 'Khuyên mũi bạc nữ xoắn ốc tối giản', category: 'khuyen-xo', price: 350000, sale_price: null, material: 'Bạc S925', color_theme: 'graphite', is_featured: 0, is_new: 1, rating: 4.5, review_count: 12, description: 'Thiết kế xoắn ốc tối giản, dễ đeo, phù hợp phong cách cá tính hằng ngày.' },
  { sku: 'LL-PK-001', name: 'Hộp đựng trang sức bọc da Royal', category: 'phu-kien', price: 224000, sale_price: null, material: 'Da PU cao cấp', color_theme: 'gold', is_featured: 0, is_new: 0, rating: 4.9, review_count: 88, description: 'Hộp đựng trang sức bọc da sang trọng, nhiều ngăn, phù hợp làm quà tặng kèm.' },
  { sku: 'LL-PK-002', name: 'Dung dịch vệ sinh trang sức bạc chuyên dụng', category: 'phu-kien', price: 129000, sale_price: null, material: 'Dung dịch chuyên dụng', color_theme: 'silver', is_featured: 0, is_new: 0, rating: 4.7, review_count: 45, description: 'Giúp làm sạch, phục hồi độ sáng bóng cho trang sức bạc một cách an toàn.' },
];

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seed() {
  await initializeDatabase();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const category of categories) {
      await query(
        `INSERT INTO categories (slug, name, icon, sort_order) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), sort_order = VALUES(sort_order)`,
        [category.slug, category.name, category.icon, category.sort_order],
        connection
      );
    }

    for (const product of products) {
      const [category] = await query('SELECT id FROM categories WHERE slug = ?', [product.category], connection);
      if (!category) continue;
      await query(
        `INSERT INTO products
          (sku, slug, name, category_id, price, sale_price, material, description, color_theme, stock, is_featured, is_new, rating, review_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), category_id = VALUES(category_id), price = VALUES(price),
           sale_price = VALUES(sale_price), material = VALUES(material), description = VALUES(description),
           color_theme = VALUES(color_theme), is_featured = VALUES(is_featured), is_new = VALUES(is_new),
           rating = VALUES(rating), review_count = VALUES(review_count)`,
        [product.sku, slugify(`${product.name}-${product.sku}`), product.name, category.id, product.price, product.sale_price,
          product.material, product.description, product.color_theme, 25, product.is_featured, product.is_new,
          product.rating, product.review_count],
        connection
      );
    }
    await connection.commit();
    console.log(`Đã nạp ${categories.length} danh mục và ${products.length} sản phẩm mẫu vào MySQL.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Không thể nạp dữ liệu mẫu:', error.message);
  process.exitCode = 1;
});
