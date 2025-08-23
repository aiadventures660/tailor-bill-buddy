import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const DataSeeder: React.FC = () => {
  const { user } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<{
    customers: boolean;
    measurements: boolean;
    orders: boolean;
    payments: boolean;
  }>({
    customers: false,
    measurements: false,
    orders: false,
    payments: false,
  });

  const sampleCustomers = [
    { name: 'Rajesh Kumar', mobile: '9876543210', email: 'rajesh@example.com', address: '123 Main Street, Mumbai' },
    { name: 'Priya Sharma', mobile: '9876543211', email: 'priya@example.com', address: '456 Park Avenue, Delhi' },
    { name: 'Amit Patel', mobile: '9876543212', email: 'amit@example.com', address: '789 Garden Road, Bangalore' },
    { name: 'Sunita Singh', mobile: '9876543213', email: 'sunita@example.com', address: '321 Lake View, Pune' },
    { name: 'Vikram Rao', mobile: '9876543214', email: 'vikram@example.com', address: '654 Hill Station, Chennai' },
  ];

  const seedDatabase = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to seed the database',
        variant: 'destructive',
      });
      return;
    }

    setIsSeeding(true);
    setSeedStatus({ customers: false, measurements: false, orders: false, payments: false });

    try {
      // 1. Seed Customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .upsert(sampleCustomers, { onConflict: 'mobile' })
        .select();

      if (customersError) throw customersError;
      setSeedStatus(prev => ({ ...prev, customers: true }));

      // 2. Seed Measurements
      const sampleMeasurements = [
        { customer_id: customers[0].id, clothing_type: 'shirt' as const, measurements: { chest: 40, waist: 32, length: 28, shoulder: 16 }, notes: 'Regular fit' },
        { customer_id: customers[1].id, clothing_type: 'blouse' as const, measurements: { chest: 36, waist: 30, length: 24, shoulder: 14 }, notes: 'Fitted style' },
        { customer_id: customers[2].id, clothing_type: 'pant' as const, measurements: { waist: 34, length: 40, hip: 38, thigh: 22 }, notes: 'Straight cut' },
        { customer_id: customers[3].id, clothing_type: 'kurta_pajama' as const, measurements: { chest: 42, waist: 36, length: 44, shoulder: 17 }, notes: 'Traditional style' },
        { customer_id: customers[4].id, clothing_type: 'suit' as const, measurements: { chest: 44, waist: 38, length: 30, shoulder: 18 }, notes: 'Business formal' },
      ];

      const { data: measurements, error: measurementsError } = await supabase
        .from('measurements')
        .upsert(sampleMeasurements, { onConflict: 'customer_id,clothing_type' })
        .select();

      if (measurementsError) throw measurementsError;
      setSeedStatus(prev => ({ ...prev, measurements: true }));

      // 3. Seed Orders
      const today = new Date();
      const futureDate1 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const futureDate2 = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      const futureDate3 = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const pastDate = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago (overdue)

      const sampleOrders = [
        {
          order_number: `ORD${Date.now()}001`,
          customer_id: customers[0].id,
          created_by: user.id,
          status: 'pending' as const,
          due_date: futureDate1.toISOString().split('T')[0],
          total_amount: 2500.00,
          advance_amount: 1000.00,
          balance_amount: 1500.00,
          notes: 'Custom shirt with embroidery'
        },
        {
          order_number: `ORD${Date.now()}002`,
          customer_id: customers[1].id,
          created_by: user.id,
          status: 'in_progress' as const,
          due_date: futureDate2.toISOString().split('T')[0],
          total_amount: 1800.00,
          advance_amount: 800.00,
          balance_amount: 1000.00,
          notes: 'Designer blouse'
        },
        {
          order_number: `ORD${Date.now()}003`,
          customer_id: customers[2].id,
          created_by: user.id,
          status: 'ready' as const,
          due_date: futureDate3.toISOString().split('T')[0],
          total_amount: 3200.00,
          advance_amount: 1500.00,
          balance_amount: 1700.00,
          notes: 'Formal pants set'
        },
        {
          order_number: `ORD${Date.now()}004`,
          customer_id: customers[3].id,
          created_by: user.id,
          status: 'pending' as const,
          due_date: pastDate.toISOString().split('T')[0], // This will be overdue
          total_amount: 4500.00,
          advance_amount: 2000.00,
          balance_amount: 2500.00,
          notes: 'Wedding kurta pajama'
        },
        {
          order_number: `ORD${Date.now()}005`,
          customer_id: customers[4].id,
          created_by: user.id,
          status: 'delivered' as const,
          due_date: futureDate1.toISOString().split('T')[0],
          total_amount: 8500.00,
          advance_amount: 8500.00,
          balance_amount: 0.00,
          notes: 'Complete 3-piece suit'
        },
      ];

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .insert(sampleOrders)
        .select();

      if (ordersError) throw ordersError;
      setSeedStatus(prev => ({ ...prev, orders: true }));

      // 4. Seed Order Items
      const sampleOrderItems = [
        { order_id: orders[0].id, item_type: 'stitching', clothing_type: 'shirt' as const, measurement_id: measurements[0].id, description: 'Custom embroidered shirt', quantity: 1, unit_price: 2500.00, total_price: 2500.00 },
        { order_id: orders[1].id, item_type: 'stitching', clothing_type: 'blouse' as const, measurement_id: measurements[1].id, description: 'Designer silk blouse', quantity: 1, unit_price: 1800.00, total_price: 1800.00 },
        { order_id: orders[2].id, item_type: 'stitching', clothing_type: 'pant' as const, measurement_id: measurements[2].id, description: 'Formal trouser', quantity: 2, unit_price: 1600.00, total_price: 3200.00 },
        { order_id: orders[3].id, item_type: 'stitching', clothing_type: 'kurta_pajama' as const, measurement_id: measurements[3].id, description: 'Wedding kurta set', quantity: 1, unit_price: 4500.00, total_price: 4500.00 },
        { order_id: orders[4].id, item_type: 'stitching', clothing_type: 'suit' as const, measurement_id: measurements[4].id, description: '3-piece business suit', quantity: 1, unit_price: 8500.00, total_price: 8500.00 },
      ];

      await supabase.from('order_items').insert(sampleOrderItems);

      // 5. Seed Payments
      const samplePayments = [
        { order_id: orders[0].id, amount: 1000.00, payment_method: 'cash' as const, notes: 'Initial advance payment', created_by: user.id },
        { order_id: orders[1].id, amount: 800.00, payment_method: 'upi' as const, notes: 'UPI payment via PhonePe', created_by: user.id },
        { order_id: orders[2].id, amount: 1500.00, payment_method: 'card' as const, notes: 'Credit card payment', created_by: user.id },
        { order_id: orders[3].id, amount: 2000.00, payment_method: 'cash' as const, notes: 'Advance for wedding order', created_by: user.id },
        { order_id: orders[4].id, amount: 4000.00, payment_method: 'upi' as const, notes: 'Partial payment', created_by: user.id },
        { order_id: orders[4].id, amount: 4500.00, payment_method: 'cash' as const, notes: 'Final payment', created_by: user.id },
      ];

      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(samplePayments);

      if (paymentsError) throw paymentsError;
      setSeedStatus(prev => ({ ...prev, payments: true }));

      toast({
        title: 'Success',
        description: 'Sample data has been successfully seeded to the database!',
      });

    } catch (error: any) {
      console.error('Error seeding database:', error);
      toast({
        title: 'Error',
        description: `Failed to seed database: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all sample data? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete in reverse order due to foreign key constraints
      await supabase.from('payments').delete().like('notes', '%sample%');
      await supabase.from('order_items').delete().gt('created_at', '2025-01-01');
      await supabase.from('orders').delete().like('notes', '%Custom%');
      await supabase.from('measurements').delete().like('notes', '%fit%');
      await supabase.from('customers').delete().like('email', '%example.com%');

      toast({
        title: 'Success',
        description: 'Sample data has been cleared from the database',
      });

      setSeedStatus({ customers: false, measurements: false, orders: false, payments: false });
    } catch (error: any) {
      console.error('Error clearing database:', error);
      toast({
        title: 'Error',
        description: `Failed to clear database: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Seeder
        </CardTitle>
        <CardDescription>
          Populate the database with sample data to test the Payment Management System
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            {seedStatus.customers ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Sample Customers</span>
          </div>
          <div className="flex items-center gap-2">
            {seedStatus.measurements ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Customer Measurements</span>
          </div>
          <div className="flex items-center gap-2">
            {seedStatus.orders ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Sample Orders</span>
          </div>
          <div className="flex items-center gap-2">
            {seedStatus.payments ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm">Payment Records</span>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={seedDatabase} disabled={isSeeding} className="flex-1">
            {isSeeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Seeding Database...
              </>
            ) : (
              'Seed Sample Data'
            )}
          </Button>
          <Button onClick={clearDatabase} variant="outline">
            Clear Sample Data
          </Button>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Note:</strong> This will create sample customers, orders, and payments that you can use to test 
          the real-time payment management features. The data includes various order statuses, payment methods, 
          and overdue scenarios.
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSeeder;
