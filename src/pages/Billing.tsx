import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  MessageSquare,
  Eye,
  Copy
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
  clothingType?: 'shirt' | 'pant' | 'suit' | 'kurta_pajama' | 'blouse' | 'saree_blouse' | 'non_denim_pant' | 'short_kurta' | 'coat' | 'bandi' | 'westcot' | 'pajama';
  measurements?: {
    chest: string;
    shoulder: string;
    length: string;
    waist: string;
    hip: string;
    neck: string;
    sleeve: string;
    kurta_length: string;
    pajama_waist: string;
    pajama_length: string;
    blouse_length: string;
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
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // Fixed discount rate (percentage)
  const DISCOUNT_RATE = 10; // 10% discount applied to subtotal
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [sendNotification, setSendNotification] = useState(true);
  const [notificationChannel, setNotificationChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [showPreview, setShowPreview] = useState(false);
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
      hip: '',
      neck: '',
      sleeve: '',
      kurta_length: '',
      pajama_waist: '',
      pajama_length: '',
      blouse_length: ''
    }
  });

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [invoices]);

  // Auto-populate billing data when coming from NewCustomer page
  useEffect(() => {
    if (location.state) {
      const { customerId, customerName, orderData, garments } = location.state as {
        customerId: string;
        customerName: string;
        orderData: any;
        garments: any[];
      };

      // Set the customer
      if (customerId && customerName) {
        const customer: Customer = {
          id: customerId,
          name: customerName,
          mobile: orderData?.customer_mobile || '',
          email: orderData?.customer_email || '',
          address: orderData?.customer_address || ''
        };
        setSelectedCustomer(customer);
        setCustomerSearch(customerName);
      }

      // Auto-populate invoice items based on garments
      if (garments && garments.length > 0) {
        const autoItems: InvoiceItem[] = garments.map((garment: any, index: number) => ({
          id: `auto-${index}`,
          type: 'stitching' as const,
          description: `${garment.name} - Custom Stitching (Qty: ${garment.quantity || 1})`,
          quantity: garment.quantity || 1,
          unit_price: 0, // No default pricing - user must set price manually
          total_price: 0, // No default pricing - will be calculated when unit_price is set
          clothingType: mapGarmentToClothingType(garment.name.toLowerCase())
        }));
        setInvoiceItems(autoItems);
      }

      // Show success message
      toast({
        title: "Customer Data Loaded",
        description: `Customer information and ${garments?.length || 0} garment(s) have been automatically added to billing.`,
      });

      // Clear the location state to prevent re-processing
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Helper function to map garment names to clothing types
  const mapGarmentToClothingType = (garmentName: string): 'shirt' | 'pant' | 'suit' | 'kurta_pajama' | 'blouse' | 'saree_blouse' | 'non_denim_pant' | 'short_kurta' | 'coat' | 'bandi' | 'westcot' | 'pajama' => {
    const typeMap: { [key: string]: 'shirt' | 'pant' | 'suit' | 'kurta_pajama' | 'blouse' | 'saree_blouse' | 'non_denim_pant' | 'short_kurta' | 'coat' | 'bandi' | 'westcot' | 'pajama' } = {
      'shirt': 'shirt',
      'pant': 'pant',
      'non denim pant': 'non_denim_pant',
      'non-denim pant': 'non_denim_pant',
      'short kurta': 'short_kurta',
      'coat': 'coat',
      'bandi': 'bandi',
      'westcot': 'westcot',
      'waistcoat': 'westcot',
      'pajama': 'pajama',
      'suit': 'suit',
      'blazer': 'suit',
      'kurta': 'kurta_pajama',
      'blouse': 'blouse',
      'saree_blouse': 'saree_blouse'
    };
    return typeMap[garmentName] || 'shirt';
  };

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

  // Get measurement fields based on clothing type
  const getMeasurementFields = (clothingType: string) => {
    switch (clothingType) {
      case 'shirt':
        return ['chest', 'shoulder', 'length', 'neck', 'sleeve'];
      case 'pant':
        return ['waist', 'hip', 'length'];
      case 'suit':
        return ['chest', 'shoulder', 'length', 'waist', 'neck', 'sleeve'];
      case 'kurta_pajama':
        return ['chest', 'shoulder', 'kurta_length', 'pajama_waist', 'pajama_length'];
      case 'blouse':
        return ['chest', 'shoulder', 'blouse_length'];
      case 'saree_blouse':
        return ['chest', 'shoulder', 'blouse_length'];
      default:
        return ['chest', 'shoulder', 'length'];
    }
  };

  // Get display label for measurement field
  const getMeasurementLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      chest: 'Chest',
      shoulder: 'Shoulder', 
      length: 'Length',
      waist: 'Waist',
      hip: 'Hip',
      neck: 'Neck',
      sleeve: 'Sleeve',
      kurta_length: 'Kurta Length',
      pajama_waist: 'Pajama Waist',
      pajama_length: 'Pajama Length',
      blouse_length: 'Blouse Length'
    };
    return labels[field] || field;
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
          customer:customers(*),
          order_items(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const transformedInvoices = (data || []).map(order => {
        // Transform order items to match InvoiceItem interface
        const items = (order.order_items || []).map((orderItem: any) => ({
          id: orderItem.id.toString(),
          type: orderItem.item_type,
          description: orderItem.description,
          quantity: orderItem.quantity,
          unit_price: orderItem.unit_price,
          total_price: orderItem.total_price,
          hsn_code: orderItem.hsn_code || undefined,
          clothingType: orderItem.clothing_type,
          measurements: orderItem.measurements || {}
        }));

        // Calculate totals from items
        const subtotal = items.reduce((sum: number, item: any) => sum + item.total_price, 0);
        const discountAmount = (subtotal * DISCOUNT_RATE) / 100;
        const finalTotal = subtotal - discountAmount;

        return {
          id: order.id,
          invoice_number: order.order_number,
          customer_id: order.customer_id,
          customer: order.customer,
          items: items,
          subtotal: subtotal,
          gst_rate: 0,
          gst_amount: 0,
          total_amount: finalTotal,
          created_at: order.created_at,
          due_date: order.due_date,
          notes: order.notes,
          status: order.status === 'delivered' ? ('paid' as const) : 
                 order.status === 'cancelled' ? ('draft' as const) : 
                 ('draft' as const)
        };
      });
      
      setInvoices(transformedInvoices);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
    }
  };

  // Real-time subscription for invoice updates
  useEffect(() => {
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchInvoices(); // Refresh invoices on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      const requiredMeasurements = getMeasurementFields(newItem.clothingType);
      const missingMeasurements = requiredMeasurements.filter(
        field => !newItem.measurements[field as keyof typeof newItem.measurements]
      );
      
      if (missingMeasurements.length > 0) {
        toast({
          title: "Measurement Required",
          description: `Please provide measurements for: ${missingMeasurements.map(field => getMeasurementLabel(field)).join(', ')}`,
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
        hip: '',
        neck: '',
        sleeve: '',
        kurta_length: '',
        pajama_waist: '',
        pajama_length: '',
        blouse_length: ''
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
    const discountAmount = (subtotal * DISCOUNT_RATE) / 100;
    const totalAmount = subtotal - discountAmount;
    return { subtotal, discountAmount, totalAmount };
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
  const { subtotal, discountAmount, totalAmount } = calculateTotals();
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
        clothing_type: item.type === 'stitching' ? (item.clothingType || 'shirt') as any : null
        // Note: hsn_code and measurements will be stored in the printed bill but not in database yet
        // until database migration is applied
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create invoice object for immediate printing
      const newInvoice: Invoice = {
        id: orderResult.id,
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer.id,
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          mobile: selectedCustomer.mobile,
          address: selectedCustomer.address || '',
          email: selectedCustomer.email || ''
        },
        items: invoiceItems,
        subtotal: subtotal,
        gst_rate: 0,
        gst_amount: 0,
        total_amount: totalAmount,
        due_date: dueDate,
        notes: notes,
        status: 'draft',
        created_at: new Date().toISOString()
      };

      // Automatically open print preview
      generatePDF(newInvoice);

      toast({
        title: "Success",
        description: `Bill ${invoiceNumber} created and ready to print`,
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
      
      // More detailed error messages
      let errorMessage = "Failed to create invoice";
      if (error?.message?.includes('order_items')) {
        errorMessage = "Failed to save order items. Please check your data and try again.";
      } else if (error?.message?.includes('orders')) {
        errorMessage = "Failed to create order. Please check customer information.";
      } else if (error?.code === '23505') {
        errorMessage = "Duplicate order number. Please try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  const previewBill = () => {
    if (!selectedCustomer || invoiceItems.length === 0) {
      toast({
        title: "Preview Error",
        description: "Please select a customer and add at least one item to preview",
        variant: "destructive"
      });
      return;
    }

    const { subtotal, discountAmount, totalAmount } = calculateTotals();
    const previewInvoice: Invoice = {
      id: 'preview',
      invoice_number: 'PREVIEW-' + Date.now().toString().slice(-6),
      customer_id: selectedCustomer.id,
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        mobile: selectedCustomer.mobile,
        address: selectedCustomer.address || '',
        email: selectedCustomer.email || ''
      },
      items: invoiceItems,
      subtotal: subtotal,
      gst_rate: 0,
      gst_amount: 0,
      total_amount: totalAmount,
      due_date: dueDate,
      notes: notes,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Preview Error", 
        description: "Please allow popups to preview the bill",
        variant: "destructive"
      });
      return;
    }

    const invoiceHTML = generateInvoiceHTML(previewInvoice);
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  const sendInvoiceNotification = async (invoice: Invoice) => {
    toast({
      title: "Notification Sent",
      description: `Bill receipt sent to ${invoice.customer.name}`,
    });
  };

  // CRUD Operations for Bill Management
  const updateInvoiceStatus = async (invoiceId: string, newStatus: 'draft' | 'paid' | 'sent') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus === 'paid' ? 'delivered' : newStatus === 'sent' ? 'pending' : 'pending'
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bill status updated to ${newStatus}`,
      });

      fetchInvoices(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      toast({
        title: "Error",
        description: "Failed to update bill status",
        variant: "destructive"
      });
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', invoiceId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', invoiceId);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: "Bill deleted successfully",
      });

      fetchInvoices(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive"
      });
    }
  };

  const duplicateInvoice = async (invoice: Invoice) => {
    try {
      const newInvoiceNumber = generateInvoiceNumber();
      
      const orderData = {
        order_number: newInvoiceNumber,
        customer_id: invoice.customer_id,
        total_amount: invoice.total_amount,
        due_date: invoice.due_date,
        notes: invoice.notes,
        status: 'pending' as const,
        created_by: profile?.id || ''
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = invoice.items.map(item => ({
        order_id: orderResult.id,
        item_type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        ready_made_item_id: null,
        measurement_id: null,
        clothing_type: item.type === 'stitching' ? (item.clothingType || 'shirt') as any : null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Bill duplicated as ${newInvoiceNumber}`,
      });

      fetchInvoices(); // Refresh the list
    } catch (error: any) {
      console.error('Error duplicating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate bill",
        variant: "destructive"
      });
    }
  };

  const generateInvoiceHTML = (invoice: Invoice) => {
    const subtotal = invoice.subtotal;
    const discountAmount = (subtotal * DISCOUNT_RATE) / 100;
    const totalAmount = invoice.total_amount;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill ${invoice.invoice_number}</title>
        <style>
          body { 
            font-family: 'Nunito', sans-serif; 
            margin: 0; 
            padding: 5px; 
            color: #000; 
            font-size: 14px;
            line-height: 1.4;
            max-width: 100%;
          }
          .bill-header { 
            text-align: center; 
            margin-bottom: 15px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-left: 0;
            margin-right: 0;
          }
          .bill-header h1 { 
            color: #000; 
            margin: 0; 
            font-size: 28px; 
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .bill-header h2 { 
            color: #333; 
            margin: 3px 0; 
            font-size: 14px; 
            font-weight: normal;
          }
          .bill-header p { 
            margin: 2px 0; 
            font-size: 12px; 
          }
          .address-section {
            background: #f8f8f8;
            padding: 8px 12px;
            border-radius: 6px;
            margin: 8px 0;
            border: 1px solid #e0e0e0;
          }
          .bill-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px; 
            font-size: 12px;
            margin-left: 0;
            margin-right: 0;
            padding-left: 0;
            padding-right: 0;
          }
          .customer-info, .bill-details { 
            width: 48%; 
          }
          .bill-details { 
            text-align: right; 
          }
          .bill-details p, .customer-info p { 
            margin: 2px 0; 
          }
          .bill-number {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            margin-left: 0;
            padding-left: 0;
          }
          
          /* Fabric Details Section */
          .fabric-section {
            margin: 10px 0;
            margin-left: 0;
            padding-left: 0;
          }
          .section-title {
            background: #f0f0f0;
            padding: 6px;
            font-weight: bold;
            border: 1px solid #000;
            margin: 0;
            font-size: 12px;
          }
          .fabric-table, .stitching-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            border: 1px solid #000;
          }
          .fabric-table th, .fabric-table td,
          .stitching-table th, .stitching-table td {
            border: 1px solid #000;
            padding: 6px;
            text-align: center;
            font-size: 11px;
          }
          .fabric-table th, .stitching-table th {
            background: #f8f8f8;
            font-weight: bold;
          }
          .description-col {
            text-align: left !important;
            width: 40%;
          }
          
          /* Totals Section */
          .totals-section {
            margin-top: 15px;
            float: right;
            width: 250px;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 6px;
            border: 1px solid #000;
            font-size: 12px;
          }
          .totals-table .total-row {
            font-weight: bold;
            background: #f0f0f0;
          }
          
          /* Footer */
          .bill-footer {
            clear: both;
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
          .delivery-date {
            margin: 15px 0;
            font-size: 12px;
            font-weight: bold;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
          }
          .signature-box {
            text-align: center;
            width: 180px;
          }
          .signature-line {
            border-top: 1px solid #000;
            margin-top: 30px;
            padding-top: 5px;
            font-size: 10px;
          }
          .notes-section {
            margin: 15px 0;
            border: 1px solid #000;
            padding: 8px;
            font-size: 11px;
          }
          
          @media print { 
            .no-print { display: none; } 
            body { 
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .fabric-table th, .stitching-table th, .totals-table .total-row {
              background: #f0f0f0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="bill-header">
          <h1>A1 Tailor & Designer</h1>
          <div class="address-section">
            <p><strong>Belwatika, Near Mohi Tailors, Daltonganj</strong></p>
            <p>Mob: 7482621237, 9525519989</p>
          </div>
        </div>
        
        <div class="bill-number">
          Bill No.: ${invoice.invoice_number}
        </div>
        
        <div class="bill-info">
          <div class="customer-info">
            <p><strong>Name:</strong> ${invoice.customer.name}</p>
            <p><strong>Mobile:</strong> ${invoice.customer.mobile}</p>
            ${invoice.customer.address ? `<p><strong>Address:</strong> ${invoice.customer.address}</p>` : ''}
          </div>
          <div class="bill-details">
            <p><strong>Date:</strong> ${new Date(invoice.created_at || '').toLocaleDateString('en-IN')}</p>
            ${invoice.due_date ? `<p><strong>Delivery Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-IN')}</p>` : ''}
          </div>
        </div>

        <!-- Fabric Details Section -->
        <div class="fabric-section">
          <div class="section-title">Fabric Details:</div>
          <table class="fabric-table">
            <thead>
              <tr>
                <th class="description-col">Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.filter(item => item.type === 'ready_made').map(item => `
                <tr>
                  <td class="description-col">${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${invoice.items.filter(item => item.type === 'ready_made').length === 0 ? `
                <tr>
                  <td class="description-col">-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Stitching Details Section -->
        <div class="fabric-section">
          <div class="section-title">Stitching Details:</div>
          <table class="stitching-table">
            <thead>
              <tr>
                <th class="description-col">Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.filter(item => item.type === 'stitching').map(item => `
                <tr>
                  <td class="description-col">
                    ${item.description}
                    ${item.measurements && item.clothingType ? `
                      <br><small style="color: #666;">
                        Measurements: ${getMeasurementFields(item.clothingType)
                          .filter(field => item.measurements![field as keyof typeof item.measurements])
                          .map(field => `${getMeasurementLabel(field)}: ${item.measurements![field as keyof typeof item.measurements]}"`)
                          .join(', ')}
                      </small>
                    ` : ''}
                  </td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${invoice.items.filter(item => item.type === 'stitching').length === 0 ? `
                <tr>
                  <td class="description-col">-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Totals Section -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Discount (${DISCOUNT_RATE}%):</td>
              <td style="text-align: right;">₹${(subtotal * DISCOUNT_RATE / 100).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total:</strong></td>
              <td style="text-align: right;"><strong>₹${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        <div style="clear: both;"></div>

        ${invoice.due_date ? `
          <div class="delivery-date">
            <strong>Delivery Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('en-IN', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        ` : ''}

        ${invoice.notes ? `
          <div class="notes-section">
            <strong>Special Notes:</strong><br />
            ${invoice.notes}
          </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Customer Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Shopkeeper Signature</div>
          </div>
        </div>

        <div class="bill-footer">
          <p><strong>Thank You!</strong></p>
          <p style="font-size: 12px;">Quality Tailoring Services • Professional Stitching • Customer Satisfaction</p>
        </div>
      </body>
      </html>
    `;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.mobile.includes(customerSearch)
  );

  const { subtotal, discountAmount, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 md:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section - Traditional Style */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="w-8 h-8 text-gray-800" />
                A1 Tailor & Designer
              </h1>
              <h2 className="text-xl text-gray-700 font-medium">Gents-Ladies Tailor & Fashion Designer</h2>
              <p className="text-gray-600 text-lg">Professional Billing System • Custom Stitching • Ready-Made Garments</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-6">
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
                  {/* Quick Add Customer button removed as requested */}

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
                      <Label className="text-gray-700 font-medium">Measurements (inches) - {newItem.clothingType.replace('_', ' ').toUpperCase()}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {getMeasurementFields(newItem.clothingType).map((field) => (
                          <div key={field}>
                            <Label htmlFor={field} className="text-sm text-gray-600">
                              {getMeasurementLabel(field)} *
                            </Label>
                            <Input
                              id={field}
                              placeholder={field === 'chest' ? '36' : field === 'waist' ? '32' : field === 'length' ? '28' : '16'}
                              value={newItem.measurements[field as keyof typeof newItem.measurements]}
                              onChange={(e) => setNewItem({ 
                                ...newItem, 
                                measurements: { ...newItem.measurements, [field]: e.target.value }
                              })}
                              className="mt-1 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                            />
                          </div>
                        ))}
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
                  {/* Discount is fixed at 10% applied to subtotal */}

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
                          <span className="text-gray-600">Discount ({DISCOUNT_RATE}%):</span>
                          <span className="text-gray-900">₹{(subtotal * DISCOUNT_RATE / 100).toFixed(2)}</span>
                        </div>
                        <Separator className="bg-gray-300" />
                        <div className="flex justify-between font-bold text-lg">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-gray-900">₹{totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={previewBill} 
                      variant="outline"
                      className="w-full border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white py-3 text-lg font-medium"
                      disabled={loading || !selectedCustomer || invoiceItems.length === 0}
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Preview Bill
                    </Button>
                    <Button 
                      onClick={createInvoice} 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 text-lg font-medium"
                      disabled={loading || !selectedCustomer || invoiceItems.length === 0}
                    >
                      <Receipt className="w-5 h-5 mr-2" />
                      Generate Bill
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Items List - Traditional Bill Style */}
        {activeTab === 'create' && invoiceItems.length > 0 && (
          <div className="space-y-6">
            {/* Fabric Details (Ready Made Items) */}
            {invoiceItems.some(item => item.type === 'ready_made') && (
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="bg-blue-50 border-b border-blue-200">
                  <CardTitle className="text-gray-900 flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
                    Fabric Details
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Ready-made items and fabrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead className="text-gray-700 font-medium">Description</TableHead>
                          <TableHead className="text-gray-700 font-medium">Qty</TableHead>
                          <TableHead className="text-gray-700 font-medium">Rate</TableHead>
                          <TableHead className="text-gray-700 font-medium">Amount</TableHead>
                          <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.filter(item => item.type === 'ready_made').map((item) => (
                          <TableRow key={item.id} className="border-gray-200 hover:bg-blue-50">
                            <TableCell className="text-gray-900">
                              <div className="font-medium">{item.description}</div>
                              {item.hsn_code && (
                                <div className="text-xs text-gray-500 mt-1">HSN: {item.hsn_code}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-20 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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

            {/* Stitching Details (Custom Stitching Items) */}
            {invoiceItems.some(item => item.type === 'stitching') && (
              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="bg-green-50 border-b border-green-200">
                  <CardTitle className="text-gray-900 flex items-center">
                    <Scissors className="w-5 h-5 mr-2 text-green-600" />
                    Stitching Details
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Custom stitching services and measurements
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50">
                          <TableHead className="text-gray-700 font-medium">Description</TableHead>
                          <TableHead className="text-gray-700 font-medium">Qty</TableHead>
                          <TableHead className="text-gray-700 font-medium">Rate</TableHead>
                          <TableHead className="text-gray-700 font-medium">Amount</TableHead>
                          <TableHead className="text-gray-700 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.filter(item => item.type === 'stitching').map((item) => (
                          <TableRow key={item.id} className="border-gray-200 hover:bg-green-50">
                            <TableCell className="text-gray-900">
                              <div>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    {item.clothingType?.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                                {item.measurements && item.clothingType && (
                                  <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                    <strong>Measurements:</strong><br />
                                    {getMeasurementFields(item.clothingType)
                                      .filter(field => item.measurements![field as keyof typeof item.measurements])
                                      .map(field => `${getMeasurementLabel(field)}: ${item.measurements![field as keyof typeof item.measurements]}"`)
                                      .join(', ')}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-20 border-gray-300 focus:border-green-500 focus:ring-green-500"
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
          </div>
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
                        <TableCell className="text-gray-900 font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{invoice.customer.name}</div>
                            <div className="text-sm text-gray-600">{invoice.customer.mobile}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(invoice.created_at || '').toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-gray-900 font-bold">
                          ₹{invoice.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={invoice.status}
                            onValueChange={(value: 'draft' | 'paid' | 'sent') => 
                              updateInvoiceStatus(invoice.id, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                  Draft
                                </div>
                              </SelectItem>
                              <SelectItem value="sent">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                  Sent
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  Paid
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generatePDF(invoice)}
                              title="View/Print Bill"
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateInvoice(invoice)}
                              title="Duplicate Bill"
                              className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendInvoiceNotification(invoice)}
                              title="Send Notification"
                              className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteInvoice(invoice.id)}
                              title="Delete Bill"
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No bills found. Create your first bill to get started.
                        </TableCell>
                      </TableRow>
                    )}
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
