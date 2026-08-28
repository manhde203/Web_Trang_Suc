function formatVnd(amount) {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('vi-VN').format(amount) + '\u20ab'; // ₫
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = { formatVnd, slugify };
