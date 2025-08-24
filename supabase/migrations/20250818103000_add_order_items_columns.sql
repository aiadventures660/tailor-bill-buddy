-- Add missing columns to order_items table for billing functionality
ALTER TABLE public.order_items 
ADD COLUMN hsn_code TEXT,
ADD COLUMN measurements JSONB;

-- Add comment for clarity
COMMENT ON COLUMN public.order_items.hsn_code IS 'HSN code for tax classification';
COMMENT ON COLUMN public.order_items.measurements IS 'JSON object containing item-specific measurements';
