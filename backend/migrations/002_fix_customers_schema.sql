-- Убираем NOT NULL с phone (форма не собирает телефон)
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

-- Добавляем недостающие колонки для orders.js и payment.js
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS link_sent   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_id  text,
  ADD COLUMN IF NOT EXISTS payment_id  text,
  ADD COLUMN IF NOT EXISTS paid_at     timestamptz;
