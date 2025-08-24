-- Sample data for testing the Payment Management System
-- This script populates the database with sample customers, orders, and payments

-- Insert sample customers
INSERT INTO public.customers (id, name, mobile, email, address) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Rajesh Kumar', '9876543210', 'rajesh@example.com', '123 Main Street, Mumbai'),
('550e8400-e29b-41d4-a716-446655440002', 'Priya Sharma', '9876543211', 'priya@example.com', '456 Park Avenue, Delhi'),
('550e8400-e29b-41d4-a716-446655440003', 'Amit Patel', '9876543212', 'amit@example.com', '789 Garden Road, Bangalore'),
('550e8400-e29b-41d4-a716-446655440004', 'Sunita Singh', '9876543213', 'sunita@example.com', '321 Lake View, Pune'),
('550e8400-e29b-41d4-a716-446655440005', 'Vikram Rao', '9876543214', 'vikram@example.com', '654 Hill Station, Chennai');

-- Insert sample measurements
INSERT INTO public.measurements (id, customer_id, clothing_type, measurements, notes) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'shirt', '{"chest": 40, "waist": 32, "length": 28, "shoulder": 16}', 'Regular fit'),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'blouse', '{"chest": 36, "waist": 30, "length": 24, "shoulder": 14}', 'Fitted style'),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'pant', '{"waist": 34, "length": 40, "hip": 38, "thigh": 22}', 'Straight cut'),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'kurta_pajama', '{"chest": 42, "waist": 36, "length": 44, "shoulder": 17}', 'Traditional style'),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'suit', '{"chest": 44, "waist": 38, "length": 30, "shoulder": 18}', 'Business formal');

-- Note: You'll need to get actual user IDs from your auth.users table for created_by field
-- For now, using placeholder values - replace with actual user IDs from your system

-- Insert sample orders (you'll need to replace the created_by UUID with actual user ID)
INSERT INTO public.orders (id, order_number, customer_id, created_by, status, due_date, total_amount, advance_amount, balance_amount, notes) VALUES
-- Replace 'YOUR_USER_ID_HERE' with actual user ID from auth.users table
('750e8400-e29b-41d4-a716-446655440001', 'ORD20250823001', '550e8400-e29b-41d4-a716-446655440001', 'YOUR_USER_ID_HERE', 'pending', '2025-08-30', 2500.00, 1000.00, 1500.00, 'Custom shirt with embroidery'),
('750e8400-e29b-41d4-a716-446655440002', 'ORD20250823002', '550e8400-e29b-41d4-a716-446655440002', 'YOUR_USER_ID_HERE', 'in_progress', '2025-08-25', 1800.00, 800.00, 1000.00, 'Designer blouse'),
('750e8400-e29b-41d4-a716-446655440003', 'ORD20250823003', '550e8400-e29b-41d4-a716-446655440003', 'YOUR_USER_ID_HERE', 'ready', '2025-08-28', 3200.00, 1500.00, 1700.00, 'Formal pants set'),
('750e8400-e29b-41d4-a716-446655440004', 'ORD20250823004', '550e8400-e29b-41d4-a716-446655440004', 'YOUR_USER_ID_HERE', 'pending', '2025-08-20', 4500.00, 2000.00, 2500.00, 'Wedding kurta pajama'),
('750e8400-e29b-41d4-a716-446655440005', 'ORD20250823005', '550e8400-e29b-41d4-a716-446655440005', 'YOUR_USER_ID_HERE', 'delivered', '2025-08-15', 8500.00, 8500.00, 0.00, 'Complete 3-piece suit');

-- Insert sample order items
INSERT INTO public.order_items (id, order_id, item_type, clothing_type, measurement_id, description, quantity, unit_price, total_price) VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'stitching', 'shirt', '650e8400-e29b-41d4-a716-446655440001', 'Custom embroidered shirt', 1, 2500.00, 2500.00),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'stitching', 'blouse', '650e8400-e29b-41d4-a716-446655440002', 'Designer silk blouse', 1, 1800.00, 1800.00),
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'stitching', 'pant', '650e8400-e29b-41d4-a716-446655440003', 'Formal trouser', 2, 1600.00, 3200.00),
('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', 'stitching', 'kurta_pajama', '650e8400-e29b-41d4-a716-446655440004', 'Wedding kurta set', 1, 4500.00, 4500.00),
('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440005', 'stitching', 'suit', '650e8400-e29b-41d4-a716-446655440005', '3-piece business suit', 1, 8500.00, 8500.00);

-- Insert sample payments (you'll need to replace the created_by UUID with actual user ID)
INSERT INTO public.payments (id, order_id, amount, payment_method, payment_date, notes, created_by) VALUES
-- Replace 'YOUR_USER_ID_HERE' with actual user ID from auth.users table
('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 1000.00, 'cash', '2025-08-23 10:00:00+00', 'Initial advance payment', 'YOUR_USER_ID_HERE'),
('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 800.00, 'upi', '2025-08-23 11:30:00+00', 'UPI payment via PhonePe', 'YOUR_USER_ID_HERE'),
('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 1500.00, 'card', '2025-08-22 14:20:00+00', 'Credit card payment', 'YOUR_USER_ID_HERE'),
('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', 2000.00, 'cash', '2025-08-21 16:45:00+00', 'Advance for wedding order', 'YOUR_USER_ID_HERE'),
('950e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440005', 4000.00, 'upi', '2025-08-15 09:15:00+00', 'Partial payment', 'YOUR_USER_ID_HERE'),
('950e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440005', 4500.00, 'cash', '2025-08-18 15:30:00+00', 'Final payment', 'YOUR_USER_ID_HERE');

-- Note: To use this script:
-- 1. First, create a user account through your application
-- 2. Find the user ID in the auth.users table
-- 3. Replace all instances of 'YOUR_USER_ID_HERE' with the actual user ID
-- 4. Run this script in your Supabase SQL editor

-- Example query to get user ID:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';
