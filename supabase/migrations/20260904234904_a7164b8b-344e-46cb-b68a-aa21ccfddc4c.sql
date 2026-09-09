-- Atomic SMS credit reservation / refund and idempotent payment crediting

CREATE OR REPLACE FUNCTION public.reserve_sms_credits(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET sms_credits = sms_credits - _amount
   WHERE id = _user_id
     AND sms_credits >= _amount
  RETURNING sms_credits INTO _remaining;

  RETURN _remaining; -- NULL when insufficient credits
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_sms_credits(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _remaining integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET sms_credits = sms_credits + _amount
   WHERE id = _user_id
  RETURNING sms_credits INTO _remaining;

  RETURN _remaining;
END;
$$;

-- Marks an order paid exactly once and credits the matching SMS volume.
-- Returns the credited amount (0 when the order was already paid => replay-safe).
CREATE OR REPLACE FUNCTION public.settle_paid_order(
  _order_id uuid,
  _provider_transaction_id text DEFAULT NULL,
  _provider_payload jsonb DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _volume integer;
BEGIN
  UPDATE public.orders
     SET status = 'paid',
         provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id),
         provider_payload = COALESCE(_provider_payload, provider_payload)
   WHERE id = _order_id
     AND status <> 'paid'
  RETURNING user_id, sms_volume INTO _user_id, _volume;

  IF _user_id IS NULL THEN
    RETURN 0; -- unknown order or already settled
  END IF;

  IF _volume IS NOT NULL AND _volume > 0 THEN
    UPDATE public.profiles
       SET sms_credits = sms_credits + _volume
     WHERE id = _user_id;
    RETURN _volume;
  END IF;

  RETURN 0;
END;
$$;

-- Server-side only: these are called with the service role from server code.
REVOKE ALL ON FUNCTION public.reserve_sms_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_sms_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_paid_order(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_sms_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_sms_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_paid_order(uuid, text, jsonb) TO service_role;