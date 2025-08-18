-- Create enums for better data integrity
CREATE TYPE public.user_role AS ENUM ('admin', 'cashier', 'tailor');
CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'card', 'credit');
CREATE TYPE public.order_status AS ENUM ('pending', 'in_progress', 'ready', 'delivered', 'cancelled');
CREATE TYPE public.clothing_type AS ENUM ('shirt', 'pant', 'kurta_pajama', 'suit', 'blouse', 'saree_blouse');

-- Create customers table
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table for role-based access
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create measurements table
CREATE TABLE public.measurements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    clothing_type clothing_type NOT NULL,
    measurements JSONB NOT NULL, -- Store all measurements as JSON for flexibility
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, clothing_type) -- One measurement per clothing type per customer
);

-- Create ready_made_items table for inventory
CREATE TABLE public.ready_made_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    size TEXT,
    color TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table (for both ready-made and stitching)
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_tailor UUID REFERENCES auth.users(id),
    status order_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table (for both ready-made and stitching items)
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'ready_made' or 'stitching'
    ready_made_item_id UUID REFERENCES public.ready_made_items(id),
    clothing_type clothing_type, -- For stitching items
    measurement_id UUID REFERENCES public.measurements(id),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ready_made_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Create RLS policies for customers
CREATE POLICY "Allow authenticated users to view customers" ON public.customers
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin and cashier to insert customers" ON public.customers
FOR INSERT TO authenticated 
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'cashier'));

CREATE POLICY "Allow admin and cashier to update customers" ON public.customers
FOR UPDATE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier'));

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
FOR INSERT TO authenticated 
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for measurements
CREATE POLICY "Allow authenticated users to view measurements" ON public.measurements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin, cashier, and tailor to insert measurements" ON public.measurements
FOR INSERT TO authenticated 
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'cashier', 'tailor'));

CREATE POLICY "Allow admin, cashier, and tailor to update measurements" ON public.measurements
FOR UPDATE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier', 'tailor'));

-- Create RLS policies for ready_made_items
CREATE POLICY "Allow authenticated users to view ready made items" ON public.ready_made_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin and cashier to manage ready made items" ON public.ready_made_items
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier'));

-- Create RLS policies for orders
CREATE POLICY "Allow authenticated users to view orders" ON public.orders
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin and cashier to insert orders" ON public.orders
FOR INSERT TO authenticated 
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'cashier'));

CREATE POLICY "Allow admin and cashier to update orders" ON public.orders
FOR UPDATE TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier'));

CREATE POLICY "Allow tailors to update assigned orders" ON public.orders
FOR UPDATE TO authenticated 
USING (get_user_role(auth.uid()) = 'tailor' AND assigned_tailor = auth.uid());

-- Create RLS policies for order_items
CREATE POLICY "Allow authenticated users to view order items" ON public.order_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin and cashier to manage order items" ON public.order_items
FOR ALL TO authenticated 
USING (get_user_role(auth.uid()) IN ('admin', 'cashier'));

-- Create RLS policies for payments
CREATE POLICY "Allow authenticated users to view payments" ON public.payments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin and cashier to insert payments" ON public.payments
FOR INSERT TO authenticated 
WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'cashier'));

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at
    BEFORE UPDATE ON public.measurements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ready_made_items_updated_at
    BEFORE UPDATE ON public.ready_made_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();