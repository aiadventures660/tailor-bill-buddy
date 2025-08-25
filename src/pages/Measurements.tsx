import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ruler, Plus, Search, User, Phone, Calendar, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Customer {
  id: string;
  name: string;
  mobile: string;
}

interface Measurement {
  id: string;
  customer_id: string;
  clothing_type: 'shirt' | 'pant' | 'kurta_pajama' | 'suit' | 'blouse' | 'saree_blouse';
  measurements: Record<string, number>;
  notes?: string;
  customers: Customer;
  created_at: string;
  updated_at?: string;
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
    { name: 'length', label: 'Pant Length', unit: 'inches' },
    { name: 'bottom', label: 'Bottom', unit: 'inches' },
    { name: 'thigh', label: 'Thigh', unit: 'inches' },
    { name: 'knee', label: 'Knee', unit: 'inches' },
  ],
  kurta_pajama: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'length', label: 'Kurta Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'collar', label: 'Collar', unit: 'inches' },
    { name: 'pajama_waist', label: 'Pajama Waist', unit: 'inches' },
    { name: 'pajama_length', label: 'Pajama Length', unit: 'inches' },
  ],
  suit: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'waist', label: 'Waist', unit: 'inches' },
    { name: 'hip', label: 'Hip', unit: 'inches' },
    { name: 'length', label: 'Coat Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'pant_waist', label: 'Pant Waist', unit: 'inches' },
    { name: 'pant_length', label: 'Pant Length', unit: 'inches' },
  ],
  blouse: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'length', label: 'Blouse Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'waist', label: 'Waist', unit: 'inches' },
  ],
  saree_blouse: [
    { name: 'chest', label: 'Chest', unit: 'inches' },
    { name: 'length', label: 'Blouse Length', unit: 'inches' },
    { name: 'shoulder', label: 'Shoulder', unit: 'inches' },
    { name: 'sleeve', label: 'Sleeve', unit: 'inches' },
    { name: 'waist', label: 'Waist', unit: 'inches' },
    { name: 'armhole', label: 'Armhole', unit: 'inches' },
  ],
};

const Measurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedClothingType, setSelectedClothingType] = useState<keyof typeof clothingTypeFields>('shirt');
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Set up real-time subscription
    if (realTimeEnabled) {
      const measurementsSubscription = supabase
        .channel('measurements-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'measurements'
          },
          (payload) => {
            console.log('Real-time update:', payload);
            handleRealTimeUpdate(payload);
          }
        )
        .subscribe();

      const customersSubscription = supabase
        .channel('customers-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customers'
          },
          (payload) => {
            console.log('Customer real-time update:', payload);
            fetchCustomers(); // Refresh customers when they change
          }
        )
        .subscribe();

      return () => {
        measurementsSubscription.unsubscribe();
        customersSubscription.unsubscribe();
      };
    }
  }, [realTimeEnabled]);

  const handleRealTimeUpdate = async (payload: any) => {
    if (payload.eventType === 'INSERT') {
      // Fetch the new measurement with customer data
      await fetchMeasurementById(payload.new.id);
    } else if (payload.eventType === 'UPDATE') {
      // Update existing measurement
      setMeasurements(prev => 
        prev.map(m => 
          m.id === payload.new.id 
            ? { ...m, ...payload.new, measurements: payload.new.measurements }
            : m
        )
      );
      toast({
        title: 'Real-time Update',
        description: 'A measurement was updated',
      });
    } else if (payload.eventType === 'DELETE') {
      // Remove deleted measurement
      setMeasurements(prev => prev.filter(m => m.id !== payload.old.id));
      toast({
        title: 'Real-time Update',
        description: 'A measurement was deleted',
      });
    }
  };

  const fetchMeasurementById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select(`
          *,
          customers (id, name, mobile)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setMeasurements(prev => [data as Measurement, ...prev.filter(m => m.id !== id)]);
        toast({
          title: 'Success',
          description: 'New measurement added successfully',
        });
      }
    } catch (error) {
      console.error('Error fetching new measurement:', error);
    }
  };

  const toggleCardExpansion = (measurementId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(measurementId)) {
        newSet.delete(measurementId);
      } else {
        newSet.add(measurementId);
      }
      return newSet;
    });
  };

  const toggleAllCards = () => {
    if (expandedCards.size === filteredMeasurements.length) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set(filteredMeasurements.map(m => m.id)));
    }
  };

  const fetchData = async () => {
    try {
      await Promise.all([fetchMeasurements(), fetchCustomers()]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchMeasurements = async () => {
    const { data: measurementsData, error: measurementsError } = await supabase
      .from('measurements')
      .select(`
        *,
        customers (id, name, mobile)
      `)
      .order('created_at', { ascending: false });

    if (measurementsError) throw measurementsError;
    setMeasurements((measurementsData || []) as Measurement[]);
  };

  const fetchCustomers = async () => {
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('id, name, mobile')
      .order('name');

    if (customersError) throw customersError;
    setCustomers(customersData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer || !selectedClothingType) {
      toast({
        title: 'Validation Error',
        description: 'Please select both customer and clothing type',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all required measurements are filled
    const requiredFields = clothingTypeFields[selectedClothingType];
    const missingFields = requiredFields.filter(
      field => !measurementData[field.name]
    );

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Measurements',
        description: `Please fill in all measurement fields`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert string measurements to numbers for storage
      const numericMeasurements: Record<string, number> = {};
      Object.entries(measurementData).forEach(([key, value]) => {
        numericMeasurements[key] = parseFloat(value) || 0;
      });

      const measurementPayload = {
        customer_id: selectedCustomer,
        clothing_type: selectedClothingType,
        measurements: numericMeasurements,
        notes: notes || null,
      };

      if (editingMeasurement) {
        // Update existing measurement
        const { error } = await supabase
          .from('measurements')
          .update(measurementPayload)
          .eq('id', editingMeasurement.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Measurements updated successfully',
        });
      } else {
        // Create new measurement
        const { error } = await supabase
          .from('measurements')
          .insert(measurementPayload);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Measurements saved successfully',
        });
      }

      // Always refresh data to ensure UI is up to date
      await fetchMeasurements();
      
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving measurements:', error);
      toast({
        title: 'Error saving measurements',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (measurement: Measurement) => {
    setEditingMeasurement(measurement);
    setSelectedCustomer(measurement.customer_id);
    setSelectedClothingType(measurement.clothing_type);
    
    // Convert number values to strings for form inputs
    const stringMeasurements: Record<string, string> = {};
    Object.entries(measurement.measurements).forEach(([key, value]) => {
      stringMeasurements[key] = String(value);
    });
    setMeasurementData(stringMeasurements);
    setNotes(measurement.notes || '');
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (measurementId: string) => {
    try {
      const { error } = await supabase
        .from('measurements')
        .delete()
        .eq('id', measurementId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Measurement deleted successfully',
      });

      // Always refresh data to ensure UI is up to date
      await fetchMeasurements();
    } catch (error: any) {
      console.error('Error deleting measurement:', error);
      toast({
        title: 'Error deleting measurement',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingMeasurement(null);
    setSelectedCustomer('');
    setSelectedClothingType('shirt');
    setMeasurementData({});
    setNotes('');
  };

  const filteredMeasurements = measurements.filter(measurement => {
    const matchesSearch = 
      measurement.customers.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      measurement.customers.mobile.includes(searchTerm) ||
      measurement.clothing_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || measurement.clothing_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getCurrentFields = () => clothingTypeFields[selectedClothingType] || [];

  const getClothingTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50">
  <div className="w-full pl-4 pr-2 sm:pl-8 sm:pr-4 lg:pl-12 lg:pr-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header - Responsive */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 flex items-center space-x-2 sm:space-x-3">
                <Ruler className="h-6 w-6 sm:h-10 sm:w-10 text-gray-900" />
                <span>Professional Measurements</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-lg">
                Digital measurement forms with real-time CRUD operations
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Real-time toggle removed as requested */}
              
              <Dialog 
                open={isAddDialogOpen} 
                onOpenChange={(open) => {
                  if (!open) {
                    handleCloseDialog();
                  } else {
                    setIsAddDialogOpen(true);
                  }
                }}
              >
                {/* Add New Measurement button removed as requested */}
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200">
                  <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                      {editingMeasurement ? 'Edit Measurement' : 'Add New Measurement'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 text-sm sm:text-lg">
                      {editingMeasurement ? 'Update customer measurements for different clothing types' : 'Record customer measurements for different clothing types'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold">Customer *</Label>
                        <Select 
                          value={selectedCustomer} 
                          onValueChange={setSelectedCustomer}
                          disabled={editingMeasurement !== null}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                <span className="block sm:hidden">{customer.name}</span>
                                <span className="hidden sm:block">{customer.name} - {customer.mobile}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold">Clothing Type *</Label>
                        <Select 
                          value={selectedClothingType} 
                          onValueChange={(value: keyof typeof clothingTypeFields) => {
                            setSelectedClothingType(value);
                            if (!editingMeasurement) {
                              setMeasurementData({});
                            }
                          }}
                          disabled={editingMeasurement !== null}
                        >
                          <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(clothingTypeFields).map((type) => (
                              <SelectItem key={type} value={type}>
                                {getClothingTypeLabel(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Measurement Fields - Responsive Grid */}
                    <div className="space-y-4">
                      <div className="border-t border-gray-200 pt-4">
                        <Label className="text-lg sm:text-xl font-bold text-gray-900 mb-4 block">
                          {getClothingTypeLabel(selectedClothingType)} Measurements
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {getCurrentFields().map((field) => (
                            <div key={field.name} className="space-y-2">
                              <Label htmlFor={field.name} className="text-gray-700 font-medium text-sm">
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
                                className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-gray-700 font-semibold">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special notes or instructions..."
                        rows={3}
                        className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-3 text-lg font-bold" 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Saving...' : (editingMeasurement ? 'Update Measurement' : 'Save Measurement')}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCloseDialog}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Search and Filter - Responsive */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label className="text-gray-700 font-medium mb-2 block">Search Measurements</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by customer name, mobile, or clothing type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-base sm:text-lg py-3"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 py-3">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.keys(clothingTypeFields).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getClothingTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Card View</Label>
              <Button
                variant="outline"
                onClick={toggleAllCards}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3"
              >
                {expandedCards.size === filteredMeasurements.length ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics - Responsive Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Measurements</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">{measurements.length}</p>
                </div>
                <Ruler className="h-6 w-6 sm:h-10 sm:w-10 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Unique Customers</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    {new Set(measurements.map(m => m.customer_id)).size}
                  </p>
                </div>
                <User className="h-6 w-6 sm:h-10 sm:w-10 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">Clothing Types</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    {new Set(measurements.map(m => m.clothing_type)).size}
                  </p>
                </div>
                <Badge className="h-6 w-6 sm:h-10 sm:w-10 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs sm:text-sm font-medium">This Month</p>
                  <p className="text-xl sm:text-3xl font-bold text-gray-900">
                    {measurements.filter(m => 
                      new Date(m.created_at).getMonth() === new Date().getMonth()
                    ).length}
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-10 sm:w-10 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Measurements List - Collapsible Cards */}
        <div className="space-y-3 sm:space-y-4">
          {filteredMeasurements.length === 0 ? (
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Ruler className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No measurements found</h3>
                  <p className="text-gray-600 text-lg">
                    {measurements.length === 0 
                      ? "Get started by recording your first measurement" 
                      : "Try adjusting your search terms or filters"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredMeasurements.map((measurement) => (
              <Collapsible 
                key={measurement.id}
                open={expandedCards.has(measurement.id)}
                onOpenChange={() => toggleCardExpansion(measurement.id)}
              >
                <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Compact Header */}
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer border-b border-gray-100 bg-gray-50 p-3 sm:p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-900 rounded-lg">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                                {measurement.customers.name}
                              </h3>
                              <Badge className="bg-gray-900 text-white px-2 py-1 text-xs sm:text-sm w-fit">
                                {getClothingTypeLabel(measurement.clothing_type)}
                              </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 text-gray-600 text-xs sm:text-sm">
                              <span className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {measurement.customers.mobile}
                              </span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(measurement.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {expandedCards.has(measurement.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  {/* Expandable Content */}
                  <CollapsibleContent>
                    <CardContent className="p-3 sm:p-6">
                      {/* Actions removed: edit/delete moved to centralized measurement management */}

                      {/* Measurements Grid - Responsive */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {Object.entries(measurement.measurements).map(([key, value]) => (
                          <div key={key} className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg border">
                            <p className="text-gray-600 text-xs sm:text-sm font-medium capitalize mb-1">
                              {key.replace('_', ' ')}
                            </p>
                            <p className="text-lg sm:text-2xl font-bold text-gray-900">
                              {String(value)}"
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      {measurement.notes && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="bg-gray-50 p-4 rounded-lg border">
                            <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
                            <p className="text-gray-700 text-sm sm:text-base">{measurement.notes}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Measurements;