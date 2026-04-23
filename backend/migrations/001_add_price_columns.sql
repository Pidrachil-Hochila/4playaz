-- Миграция: добавить колонки стоимости товара и доставки в таблицу customers
-- Выполнить в Supabase → SQL Editor

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS product_price  numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_price numeric(10,2) DEFAULT 0;

-- Комментарии для ясности
COMMENT ON COLUMN customers.product_price  IS 'Стоимость товара на момент заказа (руб)';
COMMENT ON COLUMN customers.delivery_price IS 'Стоимость доставки СДЭК (руб), рассчитанная по API';
