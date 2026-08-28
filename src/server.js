require('dotenv').config();
const app = require('./app');
const { initializeDatabase } = require('./config/db');

const PORT = process.env.PORT || 3000;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nLiLi Jewelry đang chạy tại: http://localhost:${PORT}\n`);
      });
  })
  .catch((error) => {
    console.error('Không thể kết nối hoặc khởi tạo MySQL:', error.message);
    process.exitCode = 1;
  });
