import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Calendar, Shirt, Package, Scissors, Users, DollarSign, RefreshCw, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MeasurementModal from '@/components/MeasurementModal';

interface GarmentType {
  id: string;
  name: string;
  selected: boolean;
  quantity: number;
}

const NewCustomer = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Customer form data
  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    middleName: '',
    surname: '',
    address: '',
    contactNo: '',
    date: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
    totalCost: 0,
    advance: 0,
    remaining: 0,
  });

  // Order type selection
  const [orderType, setOrderType] = useState<'ready_made' | 'custom_tailoring'>('ready_made');
  const [needsMeasurements, setNeedsMeasurements] = useState(false);

  // Garment types
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([
    { id: '1', name: 'SHIRT', selected: false, quantity: 0 },
    { id: '2', name: 'PANT', selected: false, quantity: 0 },
    { id: '3', name: 'KURTA', selected: false, quantity: 0 },
    { id: '4', name: 'PAJAMA', selected: false, quantity: 0 },
    { id: '5', name: 'COAT', selected: false, quantity: 0 },
    { id: '6', name: 'BANDI', selected: false, quantity: 0 },
    { id: '7', name: 'WESTCOT', selected: false, quantity: 0 },
    { id: '8', name: 'NEHARU SHIRT', selected: false, quantity: 0 },
  ]);

  // Measurement modal state
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [selectedGarmentForMeasurement, setSelectedGarmentForMeasurement] = useState<string>('');
  const [currentCustomerId, setCurrentCustomerId] = useState<string>('');

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-calculate remaining amount
    if (field === 'totalCost' || field === 'advance') {
      const total = field === 'totalCost' ? Number(value) : formData.totalCost;
      const advance = field === 'advance' ? Number(value) : formData.advance;
      setFormData(prev => ({
        ...prev,
        remaining: total - advance
      }));
    }
  };

  const handleGarmentToggle = (garmentId: string) => {
    setGarmentTypes(prev => 
      prev.map(garment => 
        garment.id === garmentId 
          ? { ...garment, selected: !garment.selected, quantity: garment.selected ? 0 : 1 }
          : garment
      )
    );
  };

  const handleQuantityChange = (garmentId: string, quantity: number) => {
    if (quantity < 0) return;
    setGarmentTypes(prev =>
      prev.map(garment =>
        garment.id === garmentId
          ? { ...garment, quantity, selected: quantity > 0 }
          : garment
      )
    );
  };

  const handleTakeMeasurements = (garmentId: string) => {
    // Check if measurements are needed
    if (!needsMeasurements) {
      toast({
        title: 'Measurements Not Required',
        description: 'This is a ready-made purchase. No measurements needed.',
        variant: 'destructive',
      });
      return;
    }

    // First, check if customer is saved
    if (!currentCustomerId) {
      toast({
        title: 'Save Customer First',
        description: 'Please save the customer record before taking measurements',
        variant: 'destructive',
      });
      return;
    }

    const selectedGarment = garmentTypes.find(g => g.id === garmentId);
    if (selectedGarment) {
      setSelectedGarmentForMeasurement(selectedGarment.name);
      setMeasurementModalOpen(true);
    }
  };

  const handleSaveRecord = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!formData.firstName || !formData.contactNo) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields (Name and Contact Number)',
          variant: 'destructive',
        });
        return;
      }

      const selectedGarments = garmentTypes.filter(g => g.selected);
      if (selectedGarments.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one garment type',
          variant: 'destructive',
        });
        return;
      }

      // Check if customer with this mobile number already exists
      const { data: existingCustomer, error: checkError } = await supabase
        .from('customers')
        .select('id, name, mobile')
        .eq('mobile', formData.contactNo)
        .single();

      let customer;
      
      if (existingCustomer && !checkError) {
        // Customer already exists, use existing customer
        customer = existingCustomer;
        toast({
          title: 'Customer Found',
          description: `Using existing customer: ${customer.name}`,
        });
      } else {
        // Create new customer
        const customerData = {
          name: `${formData.firstName} ${formData.middleName} ${formData.surname}`.trim(),
          mobile: formData.contactNo,
          address: formData.address,
        };

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;

      // Create order
      const orderData = {
        customer_id: customer.id,
        order_number: orderNumber,
        created_by: profile?.id || '',
        due_date: formData.deliveryDate,
        total_amount: formData.totalCost,
        advance_amount: formData.advance,
        balance_amount: formData.remaining,
        status: 'pending' as const,
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items for each selected garment
      const orderItems = selectedGarments.map(garment => ({
        order_id: order.id,
        description: garment.name,
        item_type: 'custom',
        quantity: garment.quantity,
        unit_price: 0, // Will be set later when measurements are taken
        total_price: 0,
        clothing_type: garment.name.toLowerCase().replace(/\s+/g, '_') as any,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Store customer ID for measurements
      setCurrentCustomerId(customer.id);

      const successMessage = existingCustomer 
        ? `Order created for existing customer: ${customer.name}!` 
        : 'Customer record saved successfully!';

      const additionalMessage = orderType === 'ready_made' 
        ? ' Ready for billing.' 
        : needsMeasurements 
          ? ' You can now take measurements.' 
          : '';

      toast({
        title: 'Success',
        description: successMessage + additionalMessage,
      });

      // Handle navigation based on order type
      if (orderType === 'ready_made') {
        // For ready-made orders, redirect to billing page
        setTimeout(() => {
          navigate('/billing', { 
            state: { 
              customerId: customer.id, 
              customerName: customer.name,
              orderData: order,
              garments: selectedGarments 
            } 
          });
        }, 1000);
      }
      // For custom tailoring, stay on page to take measurements
      
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save customer record',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setFormData({
      id: '',
      firstName: '',
      middleName: '',
      surname: '',
      address: '',
      contactNo: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: new Date().toISOString().split('T')[0],
      totalCost: 0,
      advance: 0,
      remaining: 0,
    });
    setGarmentTypes(prev => prev.map(g => ({ ...g, selected: false, quantity: 0 })));
    setCurrentCustomerId(''); // Reset customer ID
    setOrderType('ready_made'); // Reset to ready-made
    setNeedsMeasurements(false); // Reset measurements
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  const handleMeasurementSave = (measurements: Record<string, string>) => {
    toast({
      title: 'Measurements Saved',
      description: 'Customer measurements have been saved successfully.',
    });
    setMeasurementModalOpen(false);
  };

  const handleReturnToCustomers = () => {
    navigate('/customers');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/customers')}
            variant="outline"
            className="absolute left-0 top-0 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
          
          <div className="flex items-center justify-center space-x-3 mb-4">
            <UserPlus className="h-10 w-10 text-gray-900" />
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">NEW CUSTOMER</h1>
          </div>
          <p className="text-gray-600 text-lg">
            {orderType === 'ready_made' 
              ? 'Ready-made purchase - Quick billing without measurements' 
              : 'Custom tailoring order - Complete measurement service'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Customer Information Form */}
          <div className="xl:col-span-8 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center text-gray-900">
                  <Users className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Customer ID */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <Label className="text-gray-700 font-semibold text-sm md:text-right">Customer ID</Label>
                  <div className="md:col-span-3">
                    <Input
                      value={formData.id}
                      onChange={(e) => handleInputChange('id', e.target.value)}
                      className="w-24 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      placeholder="Auto"
                      disabled
                    />
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <Label className="text-gray-700 font-semibold text-sm md:text-right md:mt-2">Full Name *</Label>
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      placeholder="First name"
                      required
                    />
                    <Input
                      value={formData.middleName}
                      onChange={(e) => handleInputChange('middleName', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      placeholder="Middle name"
                    />
                    <Input
                      value={formData.surname}
                      onChange={(e) => handleInputChange('surname', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      placeholder="Surname"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <Label className="text-gray-700 font-semibold text-sm md:text-right">Contact Number *</Label>
                  <div className="md:col-span-3">
                    <Input
                      value={formData.contactNo}
                      onChange={(e) => handleInputChange('contactNo', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      placeholder="+91 12345 67890"
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  <Label className="text-gray-700 font-semibold text-sm md:text-right md:mt-2">Address</Label>
                  <div className="md:col-span-3">
                    <Textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 min-h-[80px]"
                      placeholder="Enter complete address"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Order Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <Label className="text-gray-700 font-semibold text-sm md:text-right">Order Type *</Label>
                  <div className="md:col-span-3 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div 
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          orderType === 'ready_made' 
                            ? 'border-gray-900 bg-gray-900 text-white' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                        onClick={() => {
                          setOrderType('ready_made');
                          setNeedsMeasurements(false);
                        }}
                      >
                        <Package className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">Ready-Made Purchase</div>
                          <div className="text-sm opacity-80">Buy clothes from shop, print bill directly</div>
                        </div>
                      </div>
                      
                      <div 
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          orderType === 'custom_tailoring' 
                            ? 'border-gray-900 bg-gray-900 text-white' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                        onClick={() => {
                          setOrderType('custom_tailoring');
                          setNeedsMeasurements(true);
                        }}
                      >
                        <Scissors className="h-5 w-5" />
                        <div>
                          <div className="font-semibold">Custom Tailoring</div>
                          <div className="text-sm opacity-80">Order clothes to be stitched, take measurements</div>
                        </div>
                      </div>
                    </div>
                    
                    {orderType === 'custom_tailoring' && (
                      <div className="flex items-center space-x-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Checkbox 
                          checked={needsMeasurements}
                          onCheckedChange={(checked) => setNeedsMeasurements(!!checked)}
                          className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                        />
                        <Label className="text-gray-700 font-medium">
                          Take measurements for this order
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <Label className="text-gray-700 font-semibold text-sm">Order Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <Label className="text-gray-700 font-semibold text-sm">Delivery Date</Label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center text-gray-900">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold text-sm">Total Cost (₹)</Label>
                    <Input
                      type="number"
                      value={formData.totalCost}
                      onChange={(e) => handleInputChange('totalCost', Number(e.target.value))}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-center font-semibold"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold text-sm">Advance (₹)</Label>
                    <Input
                      type="number"
                      value={formData.advance}
                      onChange={(e) => handleInputChange('advance', Number(e.target.value))}
                      className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-center font-semibold"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-semibold text-sm">Remaining (₹)</Label>
                    <Input
                      type="number"
                      value={formData.remaining}
                      readOnly
                      className="bg-gray-100 border-gray-300 text-center font-semibold text-gray-900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Garment Selection */}
          <div className="xl:col-span-4">
            <Card className="shadow-lg border-0 bg-white h-fit sticky top-6">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center text-gray-900">
                  <Shirt className="h-5 w-5 mr-2" />
                  Garment Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <div className="bg-gray-900 text-white text-center py-3 font-semibold text-sm rounded-l">
                    GARMENT TYPE
                  </div>
                  <div className="bg-gray-900 text-white text-center py-3 font-semibold text-sm rounded-r">
                    QUANTITY
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {garmentTypes.map((garment) => (
                    <div key={garment.id} className="grid grid-cols-2 gap-3 items-center">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={garment.selected}
                          onCheckedChange={() => handleGarmentToggle(garment.id)}
                          className="border-gray-400 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900"
                        />
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          garment.selected 
                            ? 'bg-gray-900 text-white' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {garment.name}
                        </span>
                      </div>
                      
                      <Input
                        type="number"
                        min="0"
                        value={garment.quantity}
                        onChange={(e) => handleQuantityChange(garment.id, Number(e.target.value))}
                        className="h-9 text-center text-sm border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        disabled={!garment.selected}
                      />
                    </div>
                  ))}
                </div>

                {/* Take Measurements Section */}
                {garmentTypes.filter(g => g.selected && g.quantity > 0).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {needsMeasurements ? (
                      <>
                        <h4 className="font-semibold text-gray-900 mb-4 text-center">MEASUREMENT SCHEDULING</h4>
                        <div className="space-y-2">
                          {garmentTypes.filter(g => g.selected && g.quantity > 0).map((garment) => (
                            <Button
                              key={garment.id}
                              size="sm"
                              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium h-9 text-xs"
                              onClick={() => handleTakeMeasurements(garment.id)}
                            >
                              <Scissors className="h-3 w-3 mr-2" />
                              Measure {garment.name}
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <Package className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-medium">Ready-Made Purchase</p>
                        <p className="text-green-600 text-sm">No measurements required for this order</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 bg-white rounded-lg shadow-lg border-0 p-6">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {!currentCustomerId ? (
              <>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 font-semibold"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Form
                </Button>
                
                <Button
                  onClick={handleSaveRecord}
                  disabled={loading}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 font-semibold"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading 
                    ? 'Saving Customer...' 
                    : orderType === 'ready_made' 
                      ? 'Save & Print Bill' 
                      : 'Save Customer Record'
                  }
                </Button>
                
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 font-semibold"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Cancel & Return
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleReturnToCustomers}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 font-semibold"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Return to Customers
                </Button>
                
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-8 py-3 font-semibold"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Another Customer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Measurement Modal */}
      <MeasurementModal
        isOpen={measurementModalOpen}
        onClose={() => setMeasurementModalOpen(false)}
        garmentType={selectedGarmentForMeasurement}
        customerId={currentCustomerId}
        customerName={`${formData.firstName} ${formData.middleName} ${formData.surname}`.trim()}
        selectedGarments={garmentTypes.filter(g => g.selected).map(g => g.name)}
        onSave={handleMeasurementSave}
      />
    </div>
  );
};

export default NewCustomer;
