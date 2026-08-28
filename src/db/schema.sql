CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          VARCHAR(20) NOT NULL DEFAULT 'customer',
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  icon        VARCHAR(50) NOT NULL DEFAULT 'gem',
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sku           VARCHAR(100) NOT NULL UNIQUE,
  slug          VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  category_id   INT UNSIGNED NOT NULL,
  price         INT NOT NULL,
  sale_price    INT NULL,
  material      VARCHAR(255) NOT NULL DEFAULT 'Bạc S925',
  description   TEXT NOT NULL,
  color_theme   VARCHAR(50) NOT NULL DEFAULT 'silver',
  stock         INT NOT NULL DEFAULT 20,
  is_featured   TINYINT(1) NOT NULL DEFAULT 0,
  is_new        TINYINT(1) NOT NULL DEFAULT 0,
  rating        DECIMAL(3, 1) NOT NULL DEFAULT 5.0,
  review_count  INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cart_owner  VARCHAR(255) NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cart_owner_product (cart_owner, product_id),
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id           INT UNSIGNED NULL,
  guest_name        VARCHAR(255),
  guest_email       VARCHAR(255),
  guest_phone       VARCHAR(50),
  shipping_address  VARCHAR(500) NOT NULL,
  total_amount      INT NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  unit_price  INT NOT NULL,
  quantity    INT NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT
);
