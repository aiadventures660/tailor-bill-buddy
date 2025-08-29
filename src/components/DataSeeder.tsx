import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const DataSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);

  const seedSampleData = async () => {
    setIsSeeding(true);
    try {
      // First, let's check if we can connect to the database
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');
      
      console.log('Customers:', customers);
      console.log('Customers error:', customersError);

      // Insert sample customers
      const sampleCustomers = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Rajesh Kumar',
          mobile: '9876543210',
          email: 'rajesh@example.com',
          address: '123 Main Street, Mumbai'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Priya Sharma',
          mobile: '9876543211',
          email: 'priya@example.com',
          address: '456 Park Avenue, Delhi'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Amit Patel',
          mobile: '9876543212',
          email: 'amit@example.com',
          address: '789 Garden Road, Bangalore'
        }
      ];

      // Clear existing data first
      await supabase.from('measurements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert customers
      const { error: insertCustomersError } = await supabase
        .from('customers')
        .insert(sampleCustomers);

      if (insertCustomersError) {
        console.error('Error inserting customers:', insertCustomersError);
        throw insertCustomersError;
      }

      // Insert sample measurements
      const sampleMeasurements = [
        {
          id: '650e8400-e29b-41d4-a716-446655440001',
          customer_id: '550e8400-e29b-41d4-a716-446655440001',
          clothing_type: 'shirt' as const,
          measurements: { chest: 40, waist: 32, length: 28, shoulder: 16 },
          notes: 'Regular fit'
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440002',
          customer_id: '550e8400-e29b-41d4-a716-446655440002',
          clothing_type: 'blouse' as const,
          measurements: { chest: 36, waist: 30, length: 24, shoulder: 14 },
          notes: 'Fitted style'
        },
        {
          id: '650e8400-e29b-41d4-a716-446655440003',
          customer_id: '550e8400-e29b-41d4-a716-446655440003',
          clothing_type: 'pant' as const,
          measurements: { waist: 34, length: 40, hip: 38, thigh: 22 },
          notes: 'Straight cut'
        }
      ];

      const { error: insertMeasurementsError } = await supabase
        .from('measurements')
        .insert(sampleMeasurements);

      if (insertMeasurementsError) {
        console.error('Error inserting measurements:', insertMeasurementsError);
        throw insertMeasurementsError;
      }

      toast({
        title: 'Success',
        description: 'Sample data seeded successfully!',
      });

    } catch (error: any) {
      console.error('Seeding error:', error);
      toast({
        title: 'Error',
        description: `Failed to seed data: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const checkData = async () => {
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*');
      
      const { data: measurements, error: measurementsError } = await supabase
        .from('measurements')
        .select('*, customers(*)');

      console.log('Customers check:', customers, customersError);
      console.log('Measurements check:', measurements, measurementsError);

      toast({
        title: 'Data Check',
        description: `Found ${customers?.length || 0} customers and ${measurements?.length || 0} measurements`,
      });
    } catch (error: any) {
      console.error('Check error:', error);
      toast({
        title: 'Error',
        description: `Failed to check data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Data Seeder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={seedSampleData} disabled={isSeeding} className="w-full">
          {isSeeding ? 'Seeding...' : 'Seed Sample Data'}
        </Button>
        <Button onClick={checkData} variant="outline" className="w-full">
          Check Data
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataSeeder;
