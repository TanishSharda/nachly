-- Add Razorpay payment tracking fields
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS order_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS payment_payload JSONB;

ALTER TABLE public.purchases
  DROP CONSTRAINT IF EXISTS purchases_status_check;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_status_check
  CHECK (status IN ('pending', 'completed', 'refunded', 'failed'));

CREATE INDEX IF NOT EXISTS idx_purchases_order_id ON public.purchases(order_id);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON public.purchases(payment_id);
