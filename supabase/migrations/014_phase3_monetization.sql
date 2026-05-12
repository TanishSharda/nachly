-- Phase 3: Monetization, subscriptions, workshops

-- Routine monetization
ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'free'
    CHECK (access_type IN ('free', 'ppv', 'subscription')),
  ADD COLUMN IF NOT EXISTS price_inr INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

ALTER TABLE public.choreo_submissions
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'free'
    CHECK (access_type IN ('free', 'ppv', 'subscription')),
  ADD COLUMN IF NOT EXISTS price_inr INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Subscription plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  interval_months INTEGER NOT NULL DEFAULT 1,
  price_inr INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  amount_inr INTEGER NOT NULL DEFAULT 0,
  order_id TEXT,
  payment_id TEXT,
  payment_provider TEXT DEFAULT 'razorpay',
  payment_payload JSONB,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON public.subscriptions(order_id);

-- Routine purchases (pay-per-view)
CREATE TABLE IF NOT EXISTS public.routine_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  amount_inr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  order_id TEXT,
  payment_id TEXT,
  payment_provider TEXT DEFAULT 'razorpay',
  payment_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, routine_id)
);

CREATE INDEX IF NOT EXISTS idx_routine_purchases_user ON public.routine_purchases(user_id, routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_purchases_order_id ON public.routine_purchases(order_id);

-- Workshops
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  choreographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_inr INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
