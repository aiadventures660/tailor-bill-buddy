import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Phone,
  FileText,
  Printer,
  Send,
  CreditCard,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Package,
  MessageSquare
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
}

interface InvoiceItem {
  id: string;
  type: 'ready_made' | 'stitching';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  hsn_code?: string;
  clothingType?: 'shirt' | 'pant' | 'suit' | 'kurta_pajama' | 'blouse' | 'saree_blouse';
  measurements?: {
    chest: string;
    shoulder: string;
    length: string;
    waist: string;
    hip: string;
  };
}

interface Invoice {
  id?: string;
  invoice_number: string;
  customer_id: string;
  customer: Customer;
  items: InvoiceItem[];
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  created_at?: string;
  due_date?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
}

const Billing = () => {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [gstRate, setGstRate] = useState(18);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [billStats, setBillStats] = useState({
    totalBills: 0,
    totalAmount: 0,
    paidBills: 0,
    pendingBills: 0
  });

  const [newItem, setNewItem] = useState({
    type: 'ready_made' as 'ready_made' | 'stitching',
    description: '',
    quantity: 1,
    unit_price: 0,
    hsn_code: '',
    clothingType: 'shirt' as 'shirt' | 'pant' | 'suit' | 'kurta_pajama' | 'blouse' | 'saree_blouse',
    measurements: {
      chest: '',
      shoulder: '',
      length: '',
      waist: '',
      hip: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [invoices]);

  const calculateStats = () => {
    const stats = invoices.reduce((acc, invoice) => {
      acc.totalBills += 1;
      acc.totalAmount += invoice.total_amount;
      if (invoice.status === 'paid') {
        acc.paidBills += 1;
      } else {
        acc.pendingBills += 1;
      }
      return acc;
    }, {
      totalBills: 0,
      totalAmount: 0,
      paidBills: 0,
      pendingBills: 0
    });
    setBillStats(stats);
  };

  const generateInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  };

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
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive"
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformedInvoices = (data || []).map(order => ({
        id: order.id,
        invoice_number: order.order_number,
        customer_id: order.customer_id,
        customer: order.customer,
        items: [],
        subtotal: order.total_amount || 0,
        gst_rate: 18,
        gst_amount: (order.total_amount || 0) * 0.18,
        total_amount: order.total_amount || 0,
        created_at: order.created_at,
        due_date: order.due_date,
        notes: order.notes,
        status: order.status === 'delivered' ? ('paid' as const) : ('draft' as const)
      }));
      
      setInvoices(transformedInvoices);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
    }
  };

  const addItem = () => {
    if (!newItem.description || newItem.unit_price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (newItem.type === 'stitching') {
      const requiredMeasurements = ['chest', 'shoulder', 'length'];
      const missingMeasurements = requiredMeasurements.filter(
        field => !newItem.measurements[field as keyof typeof newItem.measurements]
      );
      
      if (missingMeasurements.length > 0) {
        toast({
          title: "Measurement Required",
          description: `Please provide measurements for: ${missingMeasurements.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
    }

    const item: InvoiceItem = {
      id: Date.now().toString(),
      type: newItem.type,
      description: newItem.description,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total_price: newItem.quantity * newItem.unit_price,
      hsn_code: newItem.hsn_code || undefined,
      ...(newItem.type === 'stitching' && {
        clothingType: newItem.clothingType,
        measurements: newItem.measurements
      })
    };

    setInvoiceItems([...invoiceItems, item]);
    setNewItem({
      type: 'ready_made',
      description: '',
      quantity: 1,
      unit_price: 0,
      hsn_code: '',
      clothingType: 'shirt',
      measurements: {
        chest: '',
        shoulder: '',
        length: '',
        waist: '',
        hip: ''
      }
    });
  };

  const removeItem = (itemId: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setInvoiceItems(invoiceItems.map(item => 
      item.id === itemId 
        ? { ...item, quantity, total_price: quantity * item.unit_price }
        : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
    const gstAmount = (subtotal * gstRate) / 100;
    const totalAmount = subtotal + gstAmount;
    return { subtotal, gstAmount, totalAmount };
  };

  const createInvoice = async () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select a customer and add at least one item",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { subtotal, gstAmount, totalAmount } = calculateTotals();
      const invoiceNumber = generateInvoiceNumber();

      const orderData = {
        order_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        total_amount: totalAmount,
        due_date: dueDate || null,
        notes: notes || null,
        status: 'pending' as const,
        created_by: profile?.id || ''
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select(`
          *,
          customer:customers(*)
        `)
        .single();

      if (orderError) throw orderError;

      const orderItems = invoiceItems.map(item => ({
        order_id: orderResult.id,
        item_type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        ready_made_item_id: null,
        measurement_id: null,
        clothing_type: item.type === 'stitching' ? (item.clothingType || 'shirt') : null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Bill ${invoiceNumber} created successfully`,
      });

      if (sendNotification && selectedCustomer) {
        toast({
          title: "Bill Created",
          description: `Bill receipt ready for ${selectedCustomer.name}`,
        });
      }

      setSelectedCustomer(null);
      setInvoiceItems([]);
      setNotes('');
      setDueDate('');
      setCustomerSearch('');
      fetchInvoices();
      setActiveTab('list');

    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = generateInvoiceHTML(invoice);
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const sendInvoiceNotification = async (invoice: Invoice) => {
    toast({
      title: "Notification Sent",
      description: `Bill receipt sent to ${invoice.customer.name}`,
    });
  };

  const generateInvoiceHTML = (invoice: Invoice) => {
    const { subtotal, gstAmount, totalAmount } = {
      subtotal: invoice.subtotal,
      gstAmount: invoice.gst_amount,
      totalAmount: invoice.total_amount
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .invoice-header h1 { color: #000; margin: 0; font-size: 28px; }
          .invoice-header h2 { color: #666; margin: 5px 0; font-size: 18px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .customer-details, .invoice-info { width: 45%; }
          .invoice-info { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .totals { width: 100%; margin-top: 20px; }
          .totals td { border: none; padding: 8px 0; }
          .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #000; }
          .notes { margin-top: 30px; padding: 15px; background-color: #f8f9fa; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>PROFESSIONAL BILL</h1>
          <h2>Tailor Bill Buddy</h2>
        </div>
        
        <div class="invoice-details">
          <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong>${invoice.customer.name}</strong></p>
            <p>${invoice.customer.mobile}</p>
            ${invoice.customer.email ? `<p>${invoice.customer.email}</p>` : ''}
            ${invoice.customer.address ? `<p>${invoice.customer.address}</p>` : ''}
          </div>
          
          <div class="invoice-info">
            <p><strong>Bill Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(invoice.created_at || '').toLocaleDateString()}</p>
            ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.type === 'ready_made' ? 'Ready Made' : 'Custom Stitching'}</td>
                <td>${item.hsn_code || '-'}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unit_price.toFixed(2)}</td>
                <td>₹${item.total_price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="totals" style="width: 300px; margin-left: auto;">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>GST (${invoice.gst_rate}%):</td>
            <td style="text-align: right;">₹${gstAmount.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>Total Amount:</td>
            <td style="text-align: right;">₹${totalAmount.toFixed(2)}</td>
          </tr>
        </table>

        ${invoice.notes ? `
          <div class="notes">
            <h4>Notes:</h4>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div style="margin-top: 50px; text-align: center; color: #666;">
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.mobile.includes(customerSearch)
  );

  const { subtotal, gstAmount, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="w-8 h-8 text-gray-800" />
                Professional Billing
              </h1>
              <p className="text-gray-600 text-lg">Generate professional bills for ready-made and custom stitching services</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant={activeTab === 'create' ? 'default' : 'outline'}
                onClick={() => setActiveTab('create')}
                className="bg-gray-900 hover:bg-gray-800 text-white border-gray-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Bill
              </Button>
              <Button
                variant={activeTab === 'list' ? 'default' : 'outline'}
                onClick={() => setActiveTab('list')}
                className="bg-gray-900 hover:bg-gray-800 text-white border-gray-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Bills
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{billStats.totalBills}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{billStats.totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Paid Bills</p>
                  <p className="text-2xl font-bold text-green-600">{billStats.paidBills}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                  <p className="text-2xl font-bold text-orange-600">{billStats.pendingBills}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Bill Section */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Customer Selection */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center text-gray-900">
                    <User className="w-5 h-5 mr-2" />
                    Customer Details
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Search and select customer for billing
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="customer-search" className="text-gray-700 font-medium">Search Customer</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="customer-search"
                        placeholder="Search by name or mobile..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      />
                    </div>
                  </div>

                  {customerSearch && (
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedCustomer?.id === customer.id
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch('');
                          }}
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <Phone className="w-3 h-3 mr-1" />
                            {customer.mobile}
                          </div>
                          {customer.email && (
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-medium mb-3 text-gray-900">Selected Customer:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="text-gray-900 font-medium">{selectedCustomer.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mobile:</span>
                          <span className="text-gray-900">{selectedCustomer.mobile}</span>
                        </div>
                        {selectedCustomer.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="text-gray-900">{selectedCustomer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Items */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center text-gray-900">
                    <Package className="w-5 h-5 mr-2" />
                    Add Items
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Add ready-made items or custom stitching services
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="item-type" className="text-gray-700 font-medium">Service Type</Label>
                    <Select
                      value={newItem.type}
                      onValueChange={(value: 'ready_made' | 'stitching') => 
                        setNewItem({ ...newItem, type: value })
                      }
                    >
                      <SelectTrigger className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ready_made">
                          <div className="flex items-center">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Ready Made Item
                          </div>
                        </SelectItem>
                        <SelectItem value="stitching">
                          <div className="flex items-center">
                            <Scissors className="w-4 h-4 mr-2" />
                            Custom Stitching
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newItem.type === 'stitching' && (
                    <div>
                      <Label htmlFor="clothing-type" className="text-gray-700 font-medium">Clothing Type</Label>
                      <Select
                        value={newItem.clothingType}
                        onValueChange={(value: any) => 
                          setNewItem({ ...newItem, clothingType: value })
                        }
                      >
                        <SelectTrigger className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shirt">Shirt</SelectItem>
                          <SelectItem value="pant">Pant</SelectItem>
                          <SelectItem value="suit">Suit</SelectItem>
                          <SelectItem value="kurta_pajama">Kurta Pajama</SelectItem>
                          <SelectItem value="blouse">Blouse</SelectItem>
                          <SelectItem value="saree_blouse">Saree Blouse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="description" className="text-gray-700 font-medium">Description</Label>
                    <Input
                      id="description"
                      placeholder="Item description..."
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quantity" className="text-gray-700 font-medium">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit-price" className="text-gray-700 font-medium">Unit Price (₹)</Label>
                      <Input
                        id="unit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                        className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      />
                    </div>
                  </div>

                  {newItem.type === 'stitching' && (
                    <div className="space-y-3">
                      <Label className="text-gray-700 font-medium">Measurements (inches)</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="chest" className="text-sm text-gray-600">Chest *</Label>
                          <Input
                            id="chest"
                            placeholder="36"
                            value={newItem.measurements.chest}
                            onChange={(e) => setNewItem({ 
                              ...newItem, 
                              measurements: { ...newItem.measurements, chest: e.target.value }
                            })}
                            className="mt-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shoulder" className="text-sm text-gray-600">Shoulder *</Label>
                          <Input
                            id="shoulder"
                            placeholder="16"
                            value={newItem.measurements.shoulder}
                            onChange={(e) => setNewItem({ 
                              ...newItem, 
                              measurements: { ...newItem.measurements, shoulder: e.target.value }
                            })}
                            className="mt-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="length" className="text-sm text-gray-600">Length *</Label>
                          <Input
                            id="length"
                            placeholder="28"
                            value={newItem.measurements.length}
                            onChange={(e) => setNewItem({ 
                              ...newItem, 
                              measurements: { ...newItem.measurements, length: e.target.value }
                            })}
                            className="mt-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="waist" className="text-sm text-gray-600">Waist</Label>
                          <Input
                            id="waist"
                            placeholder="32"
                            value={newItem.measurements.waist}
                            onChange={(e) => setNewItem({ 
                              ...newItem, 
                              measurements: { ...newItem.measurements, waist: e.target.value }
                            })}
                            className="mt-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="hsn-code" className="text-gray-700 font-medium">HSN Code (Optional)</Label>
                    <Input
                      id="hsn-code"
                      placeholder="HSN/SAC Code"
                      value={newItem.hsn_code}
                      onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
                      className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <Button 
                    onClick={addItem} 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>

              {/* Bill Settings & Summary */}
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                  <CardTitle className="flex items-center text-gray-900">
                    <Calculator className="w-5 h-5 mr-2" />
                    Bill Settings
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Configure GST, due date and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="gst-rate" className="text-gray-700 font-medium">GST Rate (%)</Label>
                    <Select
                      value={gstRate.toString()}
                      onValueChange={(value) => setGstRate(parseFloat(value))}
                    >
                      <SelectTrigger className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% (No GST)</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="due-date" className="text-gray-700 font-medium">Due Date (Optional)</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-gray-700 font-medium">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <Separator className="bg-gray-200" />

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Send Bill Receipt</span>
                      </div>
                      <Switch
                        checked={sendNotification}
                        onCheckedChange={setSendNotification}
                      />
                    </div>

                    {sendNotification && (
                      <div>
                        <Label htmlFor="notification-channel" className="text-gray-700 font-medium">Notification Channel</Label>
                        <Select
                          value={notificationChannel}
                          onValueChange={(value: 'sms' | 'whatsapp') => setNotificationChannel(value)}
                        >
                          <SelectTrigger className="mt-2 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms">
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2" />
                                SMS
                              </div>
                            </SelectItem>
                            <SelectItem value="whatsapp">
                              <div className="flex items-center">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                WhatsApp
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Bill Summary */}
                  {invoiceItems.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                      <h4 className="font-medium text-gray-900">Bill Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="text-gray-900">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">GST ({gstRate}%):</span>
                          <span className="text-gray-900">₹{gstAmount.toFixed(2)}</span>
                        </div>
                        <Separator className="bg-gray-300" />
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">₹{totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={createInvoice} 
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 text-lg font-medium"
                    disabled={loading || !selectedCustomer || invoiceItems.length === 0}
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Generate Bill
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Items List */}
        {activeTab === 'create' && invoiceItems.length > 0 && (
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-gray-900">Bill Items</CardTitle>
              <CardDescription className="text-gray-600">
                Review and modify items before generating the bill
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700 font-medium">Description</TableHead>
                      <TableHead className="text-gray-700 font-medium">Type</TableHead>
                      <TableHead className="text-gray-700 font-medium">HSN Code</TableHead>
                      <TableHead className="text-gray-700 font-medium">Qty</TableHead>
                      <TableHead className="text-gray-700 font-medium">Rate</TableHead>
                      <TableHead className="text-gray-700 font-medium">Amount</TableHead>
                      <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceItems.map((item) => (
                      <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="text-gray-900">
                          <div>
                            <div className="font-medium">{item.description}</div>
                            {item.type === 'stitching' && item.measurements && (
                              <div className="text-xs text-gray-500 mt-1">
                                Chest: {item.measurements.chest}", Shoulder: {item.measurements.shoulder}", Length: {item.measurements.length}"
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'ready_made' ? 'default' : 'secondary'} className={
                            item.type === 'ready_made' 
                              ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          }>
                            {item.type === 'ready_made' ? 'Ready Made' : 'Custom Stitching'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{item.hsn_code || '-'}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-20 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                          />
                        </TableCell>
                        <TableCell className="text-gray-900 font-medium">₹{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-gray-900 font-bold">₹{item.total_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bills List */}
        {activeTab === 'list' && (
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="text-gray-900">Generated Bills</CardTitle>
              <CardDescription className="text-gray-600">
                All your created bills and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-700 font-medium">Bill #</TableHead>
                      <TableHead className="text-gray-700 font-medium">Customer</TableHead>
                      <TableHead className="text-gray-700 font-medium">Date</TableHead>
                      <TableHead className="text-gray-700 font-medium">Amount</TableHead>
                      <TableHead className="text-gray-700 font-medium">Status</TableHead>
                      <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-gray-200 hover:bg-gray-50">
                        <TableCell className="font-mono text-gray-900 font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{invoice.customer.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {invoice.customer.mobile}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(invoice.created_at || '').toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-900 font-bold">
                          ₹{invoice.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.status === 'paid' ? 'default' : 
                            invoice.status === 'sent' ? 'secondary' : 'outline'
                          } className={
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePDF(invoice)}
                              title="Print Bill"
                              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvoiceNotification(invoice)}
                              title="Send Notification"
                              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Billing;
