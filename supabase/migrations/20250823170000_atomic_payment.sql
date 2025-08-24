-- Atomic payment insert and order update
CREATE OR REPLACE FUNCTION public.add_payment_and_update_order(
  p_order_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_created_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(success boolean, error text) AS $$
DECLARE
  v_order RECORD;
  v_new_advance numeric;
  v_new_balance numeric;
BEGIN
  -- Validate order exists
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Order not found';
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 OR p_amount > v_order.balance_amount THEN
    RETURN QUERY SELECT false, 'Invalid payment amount';
    RETURN;
  END IF;

  -- Insert payment
  INSERT INTO payments (order_id, amount, payment_method, created_by, notes)
  VALUES (p_order_id, p_amount, p_payment_method, p_created_by, p_notes);

  -- Update order
  v_new_advance := v_order.advance_amount + p_amount;
  v_new_balance := v_order.total_amount - v_new_advance;
  UPDATE orders SET
    advance_amount = v_new_advance,
    balance_amount = v_new_balance,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN QUERY SELECT true, NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
