-- src/migrations/schema.sql
-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  user_type VARCHAR(20) DEFAULT 'client',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  subtitle VARCHAR(100),
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES users(id),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  is_delivery BOOLEAN DEFAULT false,
  delivery_address TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  status VARCHAR(30) DEFAULT 'pending',
  payment_method VARCHAR(30),
  payment_status VARCHAR(30) DEFAULT 'pending',
  payment_proof TEXT,
  payment_proof_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  method VARCHAR(30) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  reference VARCHAR(100),
  proof TEXT,
  proof_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_payments_order_id ON payments(order_id);

-- Políticas RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY users_select_own ON users FOR SELECT USING (id = auth.uid() OR user_type IN ('kitchen', 'delivery'));
CREATE POLICY users_update_own ON users FOR UPDATE USING (id = auth.uid());

-- Políticas para products
CREATE POLICY products_select_all ON products FOR SELECT USING (true);
CREATE POLICY products_insert_kitchen ON products FOR INSERT WITH CHECK (current_setting('request.jwt.claims')::json->>'user_type' = 'kitchen');
CREATE POLICY products_update_kitchen ON products FOR UPDATE USING (current_setting('request.jwt.claims')::json->>'user_type' = 'kitchen');
CREATE POLICY products_delete_kitchen ON products FOR DELETE USING (current_setting('request.jwt.claims')::json->>'user_type' = 'kitchen');

-- Políticas para orders
CREATE POLICY orders_select_own ON orders FOR SELECT USING (client_id = auth.uid());
CREATE POLICY orders_select_kitchen_delivery ON orders FOR SELECT USING (current_setting('request.jwt.claims')::json->>'user_type' IN ('kitchen', 'delivery'));
CREATE POLICY orders_insert_own ON orders FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY orders_update_own ON orders FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY orders_update_kitchen_delivery ON orders FOR UPDATE USING (current_setting('request.jwt.claims')::json->>'user_type' IN ('kitchen', 'delivery'));

-- Políticas para payments
CREATE POLICY payments_select_own ON payments FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE client_id = auth.uid()));
CREATE POLICY payments_select_kitchen_delivery ON payments FOR SELECT USING (current_setting('request.jwt.claims')::json->>'user_type' IN ('kitchen', 'delivery'));
CREATE POLICY payments_insert_own ON payments FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE client_id = auth.uid()));
CREATE POLICY payments_update_kitchen ON payments FOR UPDATE USING (current_setting('request.jwt.claims')::json->>'user_type' = 'kitchen');