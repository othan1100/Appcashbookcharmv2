
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cashbook_id uuid NOT NULL REFERENCES public.cashbooks(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier text NOT NULL,
  status text NOT NULL DEFAULT 'ordered',
  total numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  order_date timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cashbook_id uuid NOT NULL,
  purchase_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL,
  total numeric NOT NULL
);
CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cashbook_id uuid NOT NULL,
  purchase_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  transaction_id uuid UNIQUE REFERENCES public.transactions(id),
  amount numeric NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  payment_date timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.purchase_orders, public.purchase_order_items, public.supplier_payments TO authenticated;
GRANT ALL ON public.purchase_orders, public.purchase_order_items, public.supplier_payments TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (public.can_access_owner_data(user_id, auth.uid()));
CREATE POLICY "Team can view purchase items" ON public.purchase_order_items FOR SELECT TO authenticated USING (public.can_access_owner_data(user_id, auth.uid()));
CREATE POLICY "Team can view supplier payments" ON public.supplier_payments FOR SELECT TO authenticated USING (public.can_access_owner_data(user_id, auth.uid()));
CREATE TRIGGER purchase_orders_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.receive_purchase_order(_po uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE po public.purchase_orders%ROWTYPE; it record; p public.products%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po FOR UPDATE;
  IF NOT FOUND OR NOT public.can_write_owner_data(po.user_id, auth.uid()) THEN RAISE EXCEPTION 'Purchase order unavailable'; END IF;
  IF po.status <> 'ordered' THEN RAISE EXCEPTION 'Only open orders can be received'; END IF;
  PERFORM 1 FROM public.products WHERE id IN (SELECT product_id FROM public.purchase_order_items WHERE purchase_id = po.id) ORDER BY id FOR UPDATE;
  PERFORM set_config('app.inventory_write','yes',true);
  FOR it IN SELECT * FROM public.purchase_order_items WHERE purchase_id = po.id LOOP
    SELECT * INTO p FROM public.products WHERE id = it.product_id;
    UPDATE public.products SET current_stock = current_stock + it.quantity, buying_price = it.unit_cost WHERE id = p.id;
    INSERT INTO public.inventory_movements (user_id, cashbook_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, note)
    VALUES (po.user_id, po.cashbook_id, p.id, 'stock_in', it.quantity, p.current_stock, p.current_stock + it.quantity, 'purchase', po.id, concat('Received ', po.po_number));
  END LOOP;
  PERFORM set_config('app.inventory_write','',true);
  UPDATE public.purchase_orders SET status = 'received', received_at = now() WHERE id = po.id;
  RETURN jsonb_build_object('purchase_id', po.id);
END $$;

CREATE OR REPLACE FUNCTION public.create_purchase_order(_cashbook uuid, _supplier text, _items jsonb, _notes text DEFAULT NULL, _receive boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; po_id uuid := gen_random_uuid(); line jsonb; qty numeric; cost numeric; tot numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT user_id INTO owner_id FROM public.cashbooks WHERE id = _cashbook;
  IF owner_id IS NULL OR NOT public.can_write_owner_data(owner_id, auth.uid()) THEN RAISE EXCEPTION 'Cashbook unavailable'; END IF;
  IF _supplier IS NULL OR btrim(_supplier) = '' THEN RAISE EXCEPTION 'Supplier is required'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Add at least one product'; END IF;
  INSERT INTO public.purchase_orders (id, user_id, cashbook_id, po_number, supplier, notes)
  VALUES (po_id, owner_id, _cashbook, 'PO-' || upper(substr(replace(po_id::text,'-',''),1,8)), btrim(_supplier), _notes);
  FOR line IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := (line->>'quantity')::numeric; cost := (line->>'unit_cost')::numeric;
    IF qty IS NULL OR qty <= 0 OR cost IS NULL OR cost < 0 OR NOT EXISTS (
      SELECT 1 FROM public.products WHERE id = (line->>'product_id')::uuid AND user_id = owner_id AND cashbook_id = _cashbook) THEN
      RAISE EXCEPTION 'Invalid product, quantity or cost';
    END IF;
    INSERT INTO public.purchase_order_items (user_id, cashbook_id, purchase_id, product_id, quantity, unit_cost, total)
    VALUES (owner_id, _cashbook, po_id, (line->>'product_id')::uuid, qty, cost, round(qty*cost,2));
    tot := tot + round(qty*cost,2);
  END LOOP;
  UPDATE public.purchase_orders SET total = tot WHERE id = po_id;
  IF _receive THEN PERFORM public.receive_purchase_order(po_id); END IF;
  RETURN jsonb_build_object('purchase_id', po_id, 'total', tot);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_purchase_order(_po uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE po public.purchase_orders%ROWTYPE;
BEGIN
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_write_owner_data(po.user_id, auth.uid()) THEN RAISE EXCEPTION 'Purchase order unavailable'; END IF;
  IF po.status <> 'ordered' OR po.paid > 0 THEN RAISE EXCEPTION 'Only unpaid open orders can be cancelled'; END IF;
  UPDATE public.purchase_orders SET status = 'cancelled' WHERE id = po.id;
END $$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(_po uuid, _amount numeric, _method payment_method DEFAULT 'Cash', _date timestamptz DEFAULT now(), _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE po public.purchase_orders%ROWTYPE; txn uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO po FROM public.purchase_orders WHERE id = _po FOR UPDATE;
  IF NOT FOUND OR NOT public.can_write_owner_data(po.user_id, auth.uid()) THEN RAISE EXCEPTION 'Purchase order unavailable'; END IF;
  IF po.status = 'cancelled' OR _amount IS NULL OR _amount <= 0 OR _amount > po.total - po.paid THEN
    RAISE EXCEPTION 'Payment exceeds what is owed to the supplier';
  END IF;
  INSERT INTO public.transactions (user_id, cashbook_id, type, amount, category, note, payment_method, date)
  VALUES (po.user_id, po.cashbook_id, 'out', _amount, 'Supplier payment', concat(po.po_number, ' · ', po.supplier, CASE WHEN _note IS NULL OR _note = '' THEN '' ELSE ': ' || _note END), _method, coalesce(_date, now()))
  RETURNING id INTO txn;
  INSERT INTO public.supplier_payments (user_id, cashbook_id, purchase_id, transaction_id, amount, payment_method, payment_date, note)
  VALUES (po.user_id, po.cashbook_id, po.id, txn, _amount, _method, coalesce(_date, now()), _note);
  UPDATE public.purchase_orders SET paid = paid + _amount WHERE id = po.id;
  RETURN jsonb_build_object('purchase_id', po.id, 'balance', po.total - po.paid - _amount);
END $$;

CREATE OR REPLACE FUNCTION public.update_invoice_details(_invoice uuid, _due timestamptz, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice FOR UPDATE;
  IF NOT FOUND OR auth.uid() IS NULL OR NOT public.can_write_owner_data(inv.user_id, auth.uid()) THEN RAISE EXCEPTION 'Invoice unavailable'; END IF;
  UPDATE public.invoices SET due_date = _due WHERE id = inv.id;
  UPDATE public.sales SET notes = _notes WHERE id = inv.sale_id;
END $$;

REVOKE ALL ON FUNCTION public.receive_purchase_order(uuid), public.create_purchase_order(uuid,text,jsonb,text,boolean), public.cancel_purchase_order(uuid), public.record_supplier_payment(uuid,numeric,payment_method,timestamptz,text), public.update_invoice_details(uuid,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid), public.create_purchase_order(uuid,text,jsonb,text,boolean), public.cancel_purchase_order(uuid), public.record_supplier_payment(uuid,numeric,payment_method,timestamptz,text), public.update_invoice_details(uuid,timestamptz,text) TO authenticated;
