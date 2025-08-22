-- Add missing DELETE policy for measurements table
-- This allows admin, cashier, and tailor to delete measurements

CREATE POLICY "Allow admin, cashier, and tailor to delete measurements" ON public.measurements
FOR DELETE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier', 'tailor'));

-- Also add DELETE policy for customers table if missing
CREATE POLICY "Allow admin and cashier to delete customers" ON public.customers
FOR DELETE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier'));
