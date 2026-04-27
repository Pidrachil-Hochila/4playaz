-- Размер товара(ов) в заказе. Формат: "XL ×1" или для нескольких: "XL ×1, M ×2"
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS product_size text;
