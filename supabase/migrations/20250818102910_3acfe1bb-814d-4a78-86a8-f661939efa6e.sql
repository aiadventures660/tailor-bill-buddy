-- Fix security warnings by setting search_path for functions

-- Update get_user_role function with proper search path
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Update generate_order_number function with proper search path  
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_count INTEGER;
    order_number TEXT;
BEGIN
    SELECT COUNT(*) INTO order_count FROM public.orders;
    order_number := 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD((order_count + 1)::TEXT, 4, '0');
    RETURN order_number;
END;
$$;

-- Update update_updated_at_column function with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;