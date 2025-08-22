import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Search, 
  ShoppingBag, 
  Scissors,
  Calculator,
  User,
  Calendar,
  Phone
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
}

interface Measurement {
  id: string;
  clothing_type: string;
  measurements: any;
}

interface ReadyMadeItem {
  id: string;
  name: string;
  category: string;
  size?: string;
  color?: string;
  price: number;
  stock_quantity: number;
}

interface OrderItem {
  id: string;
  type: 'ready_made' | 'stitching';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  ready_made_item_id?: string;
  measurement_id?: string;
  clothing_type?: string;
}

const Billing = () => {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [readyMadeItems, setReadyMadeItems] = useState<ReadyMadeItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [assignedTailor, setAssignedTailor] = useState('');
  const [notes, setNotes] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchReadyMadeItems();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerMeasurements(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerMeasurements = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('customer_id', customerId);
      
      if (error) throw error;
      setMeasurements(data || []);
    } catch (error: any) {
      console.error('Error fetching measurements:', error);
    }
  };

  const fetchReadyMadeItems = async () => {
    try {
      const { data, error } = await supabase
        .from('ready_made_items')
        .select('*')
        .gt('stock_quantity', 0)
        .order('category', { ascending: true });
      
      if (error) throw error;
      setReadyMadeItems(data || []);
    } catch (error: any) {
      console.error('Error fetching ready made items:', error);
    }
  };

  const addReadyMadeItem = (item: ReadyMadeItem) => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      type: 'ready_made',
      description: `${item.name} (${item.category}${item.size ? `, Size: ${item.size}` : ''}${item.color ? `, Color: ${item.color}` : ''})`,
      quantity: 1,
      unit_price: item.price,
      total_price: item.price,
      ready_made_item_id: item.id
    };
    setOrderItems([...orderItems, newItem]);
  };

  const addStitchingItem = (measurement: Measurement, price: number) => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      type: 'stitching',
      description: `${measurement.clothing_type} Stitching`,
      quantity: 1,
      unit_price: price,
      total_price: price,
      measurement_id: measurement.id,
      clothing_type: measurement.clothing_type
    };
    setOrderItems([...orderItems, newItem]);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) return;
    setOrderItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity, total_price: item.unit_price * quantity }
          : item
      )
    );
  };

  const updateItemPrice = (itemId: string, price: number) => {
    if (price < 0) return;
    setOrderItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, unit_price: price, total_price: price * item.quantity }
          : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setOrderItems(items => items.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const createOrder = async () => {
    if (!selectedCustomer) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item to the order',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.id) {
      toast({
        title: 'Error',
        description: 'User profile not found',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const totalAmount = calculateTotal();
      const balanceAmount = totalAmount - advanceAmount;

      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumberData,
          customer_id: selectedCustomer.id,
          created_by: profile.id,
          assigned_tailor: assignedTailor || null,
          status: 'pending',
          due_date: dueDate || null,
          total_amount: totalAmount,
          advance_amount: advanceAmount,
          balance_amount: balanceAmount,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const itemsToInsert = orderItems.map(item => ({
        order_id: orderData.id,
        item_type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        ready_made_item_id: item.ready_made_item_id || null,
        measurement_id: item.measurement_id || null,
        clothing_type: item.clothing_type as 'shirt' | 'pant' | 'kurta_pajama' | 'suit' | 'blouse' | 'saree_blouse' || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Record payment if advance amount > 0
      if (advanceAmount > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: orderData.id,
            amount: advanceAmount,
            payment_method: 'cash',
            created_by: profile.id,
            notes: 'Advance payment'
          });

        if (paymentError) throw paymentError;
      }

      toast({
        title: 'Success',
        description: `Order ${orderData.order_number} created successfully!`,
      });

      // Reset form
      setSelectedCustomer(null);
      setCustomerSearch('');
      setOrderItems([]);
      setDueDate('');
      setAssignedTailor('');
      setNotes('');
      setAdvanceAmount(0);
      setMeasurements([]);

    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.mobile.includes(customerSearch)
  );

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
          <Receipt className="h-8 w-8 text-primary" />
          <span>Create Bill / Invoice</span>
        </h1>
        <p className="text-muted-foreground">
          Create bills for ready-made items and custom stitching orders
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Selection */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Select Customer</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-search">Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customer-search"
                  placeholder="Search by name or mobile..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm opacity-75 flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {customer.mobile}
                  </div>
                </div>
              ))}
            </div>

            {selectedCustomer && (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="text-sm">
                    <div className="font-medium">Selected Customer:</div>
                    <div>{selectedCustomer.name}</div>
                    <div className="text-muted-foreground">{selectedCustomer.mobile}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Items Selection */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Add Items</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ready Made Items */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Ready Made Items</span>
              </h3>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {readyMadeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-2 border rounded hover:bg-muted cursor-pointer"
                    onClick={() => addReadyMadeItem(item)}
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.category} • Stock: {item.stock_quantity}
                        {item.size && ` • Size: ${item.size}`}
                        {item.color && ` • Color: ${item.color}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.price)}</div>
                      <Button size="sm" variant="outline">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Stitching Items */}
            <div>
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Scissors className="h-4 w-4" />
                <span>Custom Stitching</span>
              </h3>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {measurements.map((measurement) => (
                  <div
                    key={measurement.id}
                    className="flex justify-between items-center p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium">{measurement.clothing_type}</div>
                      <div className="text-sm text-muted-foreground">
                        Saved measurements available
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Price"
                        className="w-20"
                        onBlur={(e) => {
                          const price = parseFloat(e.target.value);
                          if (price > 0) {
                            addStitchingItem(measurement, price);
                            e.target.value = '';
                          }
                        }}
                      />
                      <span className="text-sm text-muted-foreground">₹</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5" />
              <span>Order Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{item.description}</div>
                    <Badge variant={item.type === 'ready_made' ? 'default' : 'secondary'}>
                      {item.type === 'ready_made' ? 'Ready Made' : 'Stitching'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 text-center"
                      min="1"
                    />
                    <span className="text-sm">×</span>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                      className="w-20"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-sm">=</span>
                    <div className="w-20 text-right font-medium">
                      {formatCurrency(item.total_price)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned-tailor">Assigned Tailor (Optional)</Label>
                <Input
                  id="assigned-tailor"
                  placeholder="Tailor ID or name"
                  value={assignedTailor}
                  onChange={(e) => setAssignedTailor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance-amount">Advance Amount</Label>
                <Input
                  id="advance-amount"
                  type="number"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={calculateTotal()}
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label>Balance Amount</Label>
                <Input
                  value={formatCurrency(calculateTotal() - advanceAmount)}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOrderItems([]);
                  setSelectedCustomer(null);
                  setDueDate('');
                  setAssignedTailor('');
                  setNotes('');
                  setAdvanceAmount(0);
                }}
              >
                Clear All
              </Button>
              <Button
                onClick={createOrder}
                disabled={loading || !selectedCustomer || orderItems.length === 0}
              >
                {loading ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;