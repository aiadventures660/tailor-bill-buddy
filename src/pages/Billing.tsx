import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  Phone,
  FileText,
  Download,
  Printer,
  Eye
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
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [gstRate, setGstRate] = useState(18); // Default GST rate
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // New item form state
  const [newItem, setNewItem] = useState({
    type: 'ready_made' as 'ready_made' | 'stitching',
    description: '',
    quantity: 1,
    unit_price: 0,
    hsn_code: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, []);

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
      // For now, use orders table as invoices until we create the invoices table
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform orders to invoice format
      const transformedInvoices = (data || []).map(order => ({
        id: order.id,
        invoice_number: order.order_number,
        customer_id: order.customer_id,
        customer: order.customer,
        items: [], // Will be populated later
        subtotal: order.total_amount || 0,
        gst_rate: 18,
        gst_amount: (order.total_amount || 0) * 0.18,
        total_amount: order.total_amount || 0,
        created_at: order.created_at,
        due_date: order.due_date,
        notes: order.notes,
        status: order.status === 'completed' ? 'paid' : 'draft'
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

    const item: InvoiceItem = {
      id: Date.now().toString(),
      type: newItem.type,
      description: newItem.description,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total_price: newItem.quantity * newItem.unit_price,
      hsn_code: newItem.hsn_code || undefined
    };

    setInvoiceItems([...invoiceItems, item]);
    setNewItem({
      type: 'ready_made',
      description: '',
      quantity: 1,
      unit_price: 0,
      hsn_code: ''
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

      // For now, create an order instead of invoice
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

      // Create order items
      const orderItems = invoiceItems.map(item => ({
        order_id: orderResult.id,
        item_type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        ready_made_item_id: item.type === 'ready_made' ? null : null, // Add proper logic here
        measurement_id: item.type === 'stitching' ? null : null, // Add proper logic here
        clothing_type: item.type === 'stitching' ? ('shirt' as const) : null // Default to shirt for stitching
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Invoice ${invoiceNumber} created successfully`,
      });

      // Reset form
      setSelectedCustomer(null);
      setInvoiceItems([]);
      setNotes('');
      setDueDate('');
      setCustomerSearch('');
      
      // Refresh invoices list
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
    // Create a new window with invoice content for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHTML = generateInvoiceHTML(invoice);
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
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
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .invoice-header { text-align: center; margin-bottom: 30px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .customer-details { width: 45%; }
          .invoice-info { width: 45%; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .totals { width: 100%; margin-top: 20px; }
          .totals td { border: none; padding: 5px 0; }
          .total-row { font-weight: bold; font-size: 18px; }
          .notes { margin-top: 30px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>INVOICE</h1>
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
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
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
                <td>${item.type === 'ready_made' ? 'Ready Made' : 'Stitching'}</td>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoice</h1>
          <p className="text-muted-foreground">Generate professional invoices with automatic calculations</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
          <Button
            variant={activeTab === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveTab('list')}
          >
            <FileText className="w-4 h-4 mr-2" />
            View Invoices
          </Button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer-search">Search Customer</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    placeholder="Search by name or mobile..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {customerSearch && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch('');
                      }}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {customer.mobile}
                      </div>
                      {customer.email && (
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Customer:</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedCustomer.name}</div>
                    <div><strong>Mobile:</strong> {selectedCustomer.mobile}</div>
                    {selectedCustomer.email && <div><strong>Email:</strong> {selectedCustomer.email}</div>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Add Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="item-type">Item Type</Label>
                <Select
                  value={newItem.type}
                  onValueChange={(value: 'ready_made' | 'stitching') => 
                    setNewItem({ ...newItem, type: value })
                  }
                >
                  <SelectTrigger>
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
                        Stitching Service
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Item description..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit-price">Unit Price (₹)</Label>
                  <Input
                    id="unit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="hsn-code">HSN Code (Optional)</Label>
                <Input
                  id="hsn-code"
                  placeholder="HSN/SAC Code"
                  value={newItem.hsn_code}
                  onChange={(e) => setNewItem({ ...newItem, hsn_code: e.target.value })}
                />
              </div>

              <Button onClick={addItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Invoice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gst-rate">GST Rate (%)</Label>
                <Select
                  value={gstRate.toString()}
                  onValueChange={(value) => setGstRate(parseFloat(value))}
                >
                  <SelectTrigger>
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
                <Label htmlFor="due-date">Due Date (Optional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Totals Summary */}
              {invoiceItems.length > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST ({gstRate}%):</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={createInvoice} 
                className="w-full"
                disabled={loading || !selectedCustomer || invoiceItems.length === 0}
              >
                <Receipt className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Invoice'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Items List */}
      {activeTab === 'create' && invoiceItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'ready_made' ? 'default' : 'secondary'}>
                        {item.type === 'ready_made' ? 'Ready Made' : 'Stitching'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.hsn_code || '-'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
                    <TableCell>₹{item.total_price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Invoices</CardTitle>
            <CardDescription>All your created invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{invoice.customer.mobile}</div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(invoice.created_at || '').toLocaleDateString()}</TableCell>
                    <TableCell>₹{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'sent' ? 'secondary' : 'outline'
                      }>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generatePDF(invoice)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;