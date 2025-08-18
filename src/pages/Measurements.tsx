import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ruler, Plus, Search, User } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Customer {
  id: string;
  name: string;
  mobile: string;
}

interface Measurement {
  id: string;
  customer_id: string;
  clothing_type: string;
  measurements: any;
  notes?: string;
  customers: Customer;
  created_at: string;
}

const clothingTypeFields = {
  shirt: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'length', label: 'Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'collar', label: 'Collar', unit: 'inches' },
    { name: 'waist', label: 'Waist', unit: 'inches' },
  ],
  pant: [
    { name: 'waist', label: 'Waist', unit: 'inches' },
    { name: 'hip', label: 'Hip', unit: 'inches' },
    { name: 'length', label: 'Length', unit: 'inches' },
    { name: 'bottom', label: 'Bottom', unit: 'inches' },
    { name: 'thigh', label: 'Thigh', unit: 'inches' },
    { name: 'knee', label: 'Knee', unit: 'inches' },
  ],
  kurta_pajama: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'length', label: 'Kurta Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'waist', label: 'Waist', unit: 'inches' },
    { name: 'pajama_length', label: 'Pajama Length', unit: 'inches' },
  ],
};

const Measurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedClothingType, setSelectedClothingType] = useState<keyof typeof clothingTypeFields>('shirt');
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [measurementsResponse, customersResponse] = await Promise.all([
        supabase
          .from('measurements')
          .select(`
            *,
            customers (id, name, mobile)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('id, name, mobile')
          .order('name')
      ]);

      if (measurementsResponse.error) throw measurementsResponse.error;
      if (customersResponse.error) throw customersResponse.error;

      setMeasurements(measurementsResponse.data || []);
      setCustomers(customersResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || !selectedClothingType) {
      toast({
        title: 'Error',
        description: 'Please select customer and clothing type',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('measurements')
        .upsert({
          customer_id: selectedCustomer,
          clothing_type: selectedClothingType,
          measurements: measurementData,
          notes: notes || null,
        }, {
          onConflict: 'customer_id,clothing_type'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Measurements saved successfully',
      });

      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error saving measurements:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save measurements',
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setSelectedCustomer('');
    setSelectedClothingType('shirt');
    setMeasurementData({});
    setNotes('');
  };

  const filteredMeasurements = measurements.filter(measurement =>
    measurement.customers.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    measurement.customers.mobile.includes(searchTerm) ||
    measurement.clothing_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCurrentFields = () => clothingTypeFields[selectedClothingType] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <Ruler className="h-8 w-8 text-primary" />
            <span>Measurements</span>
          </h1>
          <p className="text-muted-foreground">
            Digital measurement forms for all clothing types
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Measurements
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add/Update Measurements</DialogTitle>
              <DialogDescription>
                Record customer measurements for different clothing types
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.mobile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Clothing Type *</Label>
                  <Select 
                    value={selectedClothingType} 
                    onValueChange={(value: keyof typeof clothingTypeFields) => {
                      setSelectedClothingType(value);
                      setMeasurementData({});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shirt">Shirt</SelectItem>
                      <SelectItem value="pant">Pant</SelectItem>
                      <SelectItem value="kurta_pajama">Kurta Pajama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Measurement Fields */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Measurements</Label>
                <div className="grid grid-cols-2 gap-4">
                  {getCurrentFields().map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label} ({field.unit})
                      </Label>
                      <Input
                        id={field.name}
                        type="number"
                        step="0.1"
                        value={measurementData[field.name] || ''}
                        onChange={(e) => setMeasurementData({
                          ...measurementData,
                          [field.name]: e.target.value
                        })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special notes or instructions..."
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">
                  Save Measurements
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, mobile, or clothing type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Measurements List */}
      <div className="grid gap-4">
        {filteredMeasurements.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Ruler className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No measurements found</h3>
                <p className="text-muted-foreground">
                  {measurements.length === 0 
                    ? "Get started by recording your first measurement" 
                    : "Try adjusting your search terms"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredMeasurements.map((measurement) => (
            <Card key={measurement.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>{measurement.customers.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {measurement.clothing_type.replace('_', ' ').toUpperCase()} • 
                      Recorded on {new Date(measurement.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(measurement.measurements).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">
                        {key.replace('_', ' ')}:
                      </span>
                      <span className="font-medium">{value}"</span>
                    </div>
                  ))}
                </div>
                
                {measurement.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {measurement.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Measurements;