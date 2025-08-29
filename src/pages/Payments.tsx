import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Calendar,
  User,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  Banknote,
  Smartphone,
  Eye,
  Edit,
  Filter,
  TrendingUp,
  DollarSign,
  Download,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  BarChart3,
  PieChart,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'credit';
  payment_date: string;
  transaction_id?: string;
  notes?: string;
  status?: 'completed' | 'pending' | 'failed';
  created_at: string;
  orders: {
    order_number: string;
    customer_id: string;
    total_amount: number;
    advance_amount: number;
    balance_amount: number;
    customers: {
      name: string;
      mobile: string;
      email?: string;
    };
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  due_date?: string;
  status: string;
  customers: {
    name: string;
    mobile: string;
    email?: string;
  };
}

interface PaymentStats {
  totalRevenue: number;
  pendingPayments: number;
  collectedToday: number;
  collectedThisMonth: number;
  totalTransactions: number;
  overduePayments: number;
  cashPayments: number;
  onlinePayments: number;
}

const Payments: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingPayments: 0,
    collectedToday: 0,
    collectedThisMonth: 0,
    totalTransactions: 0,
    overduePayments: 0,
    cashPayments: 0,
    onlinePayments: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Dialog states
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [isDeletePaymentOpen, setIsDeletePaymentOpen] = useState(false);
  const [isViewPaymentOpen, setIsViewPaymentOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    order_id: '',
    amount: 0,
    payment_method: 'cash' as Payment['payment_method'],
    transaction_id: '',
    notes: ''
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch payments with complete order and customer data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          orders!inner (
            id,
            order_number,
            customer_id,
            total_amount,
            advance_amount,
            balance_amount,
            due_date,
            status,
            created_at,
            customers!inner (
              id,
              name,
              mobile,
              email,
              address
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError);
        throw paymentsError;
      }

      // Filter out any payments with null orders (data integrity)
      const validPayments = paymentsData?.filter(payment => payment.orders) || [];
      setPayments(validPayments);

      // Fetch outstanding orders with customer data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers!inner (
            id,
            name,
            mobile,
            email,
            address
          )
        `)
        .gt('balance_amount', 0)
        .neq('status', 'cancelled')
        .neq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
        throw ordersError;
      }

      console.log('Raw orders data:', ordersData);
      console.log('Number of orders fetched:', ordersData?.length || 0);

      const validOrders = ordersData?.filter(order => {
        const isValid = order.customers && order.order_number && order.balance_amount > 0;
        if (!isValid) {
          console.log('Invalid order filtered out:', order);
        }
        return isValid;
      }) || [];
      
      console.log('Valid orders after filtering:', validOrders.length);
      setOutstandingOrders(validOrders);

      // Calculate statistics
      calculateStats(validPayments, validOrders);
      
      // Show success message only on manual refresh
      if (!loading) {
        toast({
          title: 'Success',
          description: 'Data refreshed successfully',
        });
      }
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch payment data: ${error.message}`,
        variant: 'destructive',
      });
      
      // Set empty arrays on error to prevent UI crashes
      setPayments([]);
      setOutstandingOrders([]);
      setPaymentStats({
        totalRevenue: 0,
        pendingPayments: 0,
        collectedToday: 0,
        collectedThisMonth: 0,
        totalTransactions: 0,
        overduePayments: 0,
        cashPayments: 0,
        onlinePayments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: Payment[], ordersData: Order[]) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const todayStr = today.toISOString().split('T')[0];

    const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = ordersData.reduce((sum, o) => sum + (o.balance_amount || 0), 0);
    
    const collectedToday = paymentsData
      .filter(p => p.payment_date.split('T')[0] === todayStr)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const collectedThisMonth = paymentsData
      .filter(p => new Date(p.payment_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    const overduePayments = ordersData
      .filter(o => o.due_date && o.due_date < todayStr && (o.balance_amount || 0) > 0)
      .reduce((sum, o) => sum + (o.balance_amount || 0), 0);

    const cashPayments = paymentsData
      .filter(p => p.payment_method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const onlinePayments = paymentsData
      .filter(p => ['upi', 'card'].includes(p.payment_method))
      .reduce((sum, p) => sum + p.amount, 0);

    setPaymentStats({
      totalRevenue,
      pendingPayments,
      collectedToday,
      collectedThisMonth,
      totalTransactions: paymentsData.length,
      overduePayments,
      cashPayments,
      onlinePayments
    });
  };

  const handleAddPayment = async () => {
    try {
      if (!selectedOrder || !paymentForm.amount || !user?.id) {
        toast({
          title: 'Error',
          description: 'Please select an order, enter payment amount, and ensure you are logged in',
          variant: 'destructive',
        });
        return;
      }

      if (paymentForm.amount <= 0) {
        toast({
          title: 'Error',
          description: 'Payment amount must be greater than 0',
          variant: 'destructive',
        });
        return;
      }

      if (paymentForm.amount > selectedOrder.balance_amount) {
        toast({
          title: 'Error',
          description: 'Payment amount cannot exceed the balance due',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      // Use Supabase transaction to ensure data consistency
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          transaction_id: paymentForm.transaction_id || null,
          notes: paymentForm.notes || null,
          status: 'completed',
          payment_date: new Date().toISOString(),
          created_by: user.id,
        })
        .select('*')
        .single();

      if (paymentError) {
        console.error('Payment insert error:', paymentError);
        throw paymentError;
      }

      // Calculate new order amounts
      const newAdvanceAmount = selectedOrder.advance_amount + paymentForm.amount;
      const newBalanceAmount = selectedOrder.total_amount - newAdvanceAmount;
      const newStatus = newBalanceAmount <= 0 ? ('delivered' as const) : selectedOrder.status;

      // Update order balance and status
      const statusUpdate = newBalanceAmount <= 0 ? 'delivered' : selectedOrder.status;
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          advance_amount: newAdvanceAmount,
          balance_amount: newBalanceAmount,
          status: statusUpdate as Database['public']['Enums']['order_status'],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (orderError) {
        console.error('Order update error:', orderError);
        // Rollback payment if order update fails
        await supabase.from('payments').delete().eq('id', paymentData.id);
        throw orderError;
      }

      toast({
        title: 'Success',
        description: `Payment of ${formatCurrency(paymentForm.amount)} recorded successfully`,
      });

      // Reset form and close dialog
      setIsAddPaymentOpen(false);
      resetForms();
      
      // Data will be refreshed automatically via real-time subscription
      
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: `Failed to record payment: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // CRUD Operations
  
  // READ - View Payment Details
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewPaymentOpen(true);
  };

  // UPDATE - Edit Payment
  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentForm({
      order_id: payment.order_id,
      amount: payment.amount,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id || '',
      notes: payment.notes || ''
    });
    setIsEditPaymentOpen(true);
  };

  const handleUpdatePayment = async () => {
    try {
      if (!selectedPayment || !paymentForm.amount || paymentForm.amount <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid payment amount',
          variant: 'destructive',
        });
        return;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User authentication required',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      // Calculate the difference in payment amount
      const amountDifference = paymentForm.amount - selectedPayment.amount;

      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          transaction_id: paymentForm.transaction_id || null,
          notes: paymentForm.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.id);

      if (paymentError) {
        console.error('Payment update error:', paymentError);
        throw paymentError;
      }

      // Update order balance if amount changed
      if (amountDifference !== 0) {
        const { data: orderData, error: orderFetchError } = await supabase
          .from('orders')
          .select('advance_amount, total_amount, status')
          .eq('id', selectedPayment.order_id)
          .single();

        if (orderFetchError) {
          console.error('Order fetch error:', orderFetchError);
          throw orderFetchError;
        }

        const newAdvanceAmount = orderData.advance_amount + amountDifference;
        const newBalanceAmount = orderData.total_amount - newAdvanceAmount;
        const newStatus = newBalanceAmount <= 0 ? 'delivered' as const : orderData.status;

        if (newAdvanceAmount < 0) {
          toast({
            title: 'Error',
            description: 'Payment amount would result in negative advance amount',
            variant: 'destructive',
          });
          return;
        }

        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            advance_amount: newAdvanceAmount,
            balance_amount: newBalanceAmount,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedPayment.order_id);

        if (orderUpdateError) {
          console.error('Order update error:', orderUpdateError);
          throw orderUpdateError;
        }
      }

      toast({
        title: 'Success',
        description: `Payment updated successfully`,
      });

      setIsEditPaymentOpen(false);
      setSelectedPayment(null);
      resetForms();
      
      // Data will be refreshed automatically via real-time subscription
      
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: `Failed to update payment: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // DELETE - Delete Payment
  const handleDeletePayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDeletePaymentOpen(true);
  };

  const confirmDeletePayment = async () => {
    try {
      if (!selectedPayment) {
        toast({
          title: 'Error',
          description: 'No payment selected for deletion',
          variant: 'destructive',
        });
        return;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User authentication required',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      // Get current order data for balance calculation
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('advance_amount, total_amount, status')
        .eq('id', selectedPayment.order_id)
        .single();

      if (orderFetchError) {
        console.error('Order fetch error:', orderFetchError);
        throw orderFetchError;
      }

      // Delete the payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (paymentError) {
        console.error('Payment delete error:', paymentError);
        throw paymentError;
      }

      // Update order balance by subtracting the deleted payment amount
      const newAdvanceAmount = Math.max(0, orderData.advance_amount - selectedPayment.amount);
      const newBalanceAmount = orderData.total_amount - newAdvanceAmount;
      const newStatus = newBalanceAmount > 0 ? 'pending' as const : orderData.status;

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          advance_amount: newAdvanceAmount,
          balance_amount: newBalanceAmount,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPayment.order_id);

      if (orderUpdateError) {
        console.error('Order update error:', orderUpdateError);
        throw orderUpdateError;
      }

      toast({
        title: 'Success',
        description: `Payment of ${formatCurrency(selectedPayment.amount)} deleted successfully`,
      });

      setIsDeletePaymentOpen(false);
      setSelectedPayment(null);
      
      // Data will be refreshed automatically via real-time subscription
      
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: `Failed to delete payment: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility function to reset forms
  const resetForms = () => {
    setPaymentForm({
      order_id: '',
      amount: 0,
      payment_method: 'cash',
      transaction_id: '',
      notes: ''
    });
    setSelectedOrder(null);
    setSelectedPayment(null);
  };

  useEffect(() => {
    fetchData();
    
    // Real-time subscription for payments
    const paymentsSubscription = supabase
      .channel('payments_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'payments' 
        }, 
        (payload) => {
          console.log('Payment change received:', payload);
          // Refresh data when payments change
          fetchData();
        }
      )
      .subscribe();

    // Real-time subscription for orders
    const ordersSubscription = supabase
      .channel('orders_channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('Order change received:', payload);
          // Refresh data when orders change
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(paymentsSubscription);
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/90 border-2 border-purple-200/50 rounded-3xl shadow-2xl p-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="text-purple-800 mt-6 text-center font-semibold text-lg">Loading Payment Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full pl-4 pr-2 sm:pl-8 sm:pr-4 lg:pl-12 lg:pr-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header - Responsive */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 flex items-center space-x-2 sm:space-x-3">
                <Wallet className="h-6 w-6 sm:h-10 sm:w-10 text-gray-900" />
                <span>Payment Management</span>
              </h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-lg">
                Complete payment processing with analytics and reporting
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                onClick={() => setIsAddPaymentOpen(true)} 
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-4 sm:p-6">
              <TabsList className="grid w-full grid-cols-6 bg-gray-100">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Payment History
                </TabsTrigger>
                <TabsTrigger value="collect" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Collect Payment
                </TabsTrigger>
                <TabsTrigger value="due" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Due Payments
                </TabsTrigger>
                <TabsTrigger value="refunds" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Refunds
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  Reports
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="p-4 sm:p-6 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Dashboard</h2>
              
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-700 font-bold">Total Revenue</CardTitle>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(paymentStats.totalRevenue)}</div>
                    <p className="text-gray-600 text-sm mt-2 flex items-center">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {paymentStats.totalTransactions} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-700 font-bold">Pending Payments</CardTitle>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(paymentStats.pendingPayments)}</div>
                    <p className="text-gray-600 text-sm mt-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {outstandingOrders.length} orders pending
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-700 font-bold">Collected Today</CardTitle>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(paymentStats.collectedToday)}</div>
                    <p className="text-gray-600 text-sm mt-2">Today's collections</p>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-700 font-bold">This Month</CardTitle>
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(paymentStats.collectedThisMonth)}</div>
                    <p className="text-gray-600 text-sm mt-2">Monthly total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <PieChart className="h-5 w-5 mr-2" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center">
                          <Banknote className="h-4 w-4 text-gray-600 mr-2" />
                          <span className="font-medium text-gray-700">Cash</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(paymentStats.cashPayments)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 text-gray-600 mr-2" />
                          <span className="font-medium text-gray-700">Online</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatCurrency(paymentStats.onlinePayments)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Collection Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <span className="font-medium text-gray-700">Collection Rate</span>
                        <span className="font-bold text-gray-900">
                          {paymentStats.totalRevenue > 0 ? 
                            Math.round((paymentStats.totalRevenue / (paymentStats.totalRevenue + paymentStats.pendingPayments)) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <span className="font-medium text-gray-700">Overdue Amount</span>
                        <span className="font-bold text-gray-900">{formatCurrency(paymentStats.overduePayments)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payment History Tab */}
            <TabsContent value="history" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10 w-full sm:w-64 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    />
                  </div>
                  <Select value={filterMethod} onValueChange={(value) => {
                    setFilterMethod(value);
                    setCurrentPage(1); // Reset to first page when filtering
                  }}>
                    <SelectTrigger className="w-full sm:w-40 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                      <SelectValue placeholder="Filter by method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="bg-white border shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-900">Order ID</TableHead>
                        <TableHead className="font-semibold text-gray-900">Customer Name</TableHead>
                        <TableHead className="font-semibold text-gray-900">Payment Date</TableHead>
                        <TableHead className="font-semibold text-gray-900">Method</TableHead>
                        <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-900">Status</TableHead>
                        <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Filter payments
                      const filteredPayments = payments.filter(payment => 
                        (filterMethod === 'all' || payment.payment_method === filterMethod) &&
                        (searchTerm === '' || 
                         payment.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      );

                      // Calculate pagination
                      const totalItems = filteredPayments.length;
                      const totalPages = Math.ceil(totalItems / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const currentItems = filteredPayments.slice(startIndex, endIndex);

                      return currentItems.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.orders?.order_number}</TableCell>
                          <TableCell>{payment.orders?.customers?.name}</TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={`${
                              payment.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                              payment.payment_method === 'upi' ? 'bg-blue-100 text-blue-800' :
                              payment.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {payment.payment_method.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-green-600">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewPayment(payment)}
                                className="hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditPayment(payment)}
                                className="hover:bg-green-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeletePayment(payment)}
                                className="hover:bg-red-50 text-red-600"
                              >
                                <AlertCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="hover:bg-purple-50"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const filteredPayments = payments.filter(payment => 
                    (filterMethod === 'all' || payment.payment_method === filterMethod) &&
                    (searchTerm === '' || 
                     payment.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     payment.orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                  );
                  const totalItems = filteredPayments.length;
                  const totalPages = Math.ceil(totalItems / itemsPerPage);

                  if (totalPages <= 1) return null;

                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t bg-gray-50 gap-4">
                      <div className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} payments
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Previous Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 border-gray-300 hover:bg-gray-100"
                        >
                          Previous
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                            // Show first page, last page, current page, and pages around current
                            const showPage = pageNum === 1 || 
                                           pageNum === totalPages || 
                                           Math.abs(pageNum - currentPage) <= 1;
                            
                            if (!showPage && pageNum === 2 && currentPage > 4) {
                              return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                            }
                            
                            if (!showPage && pageNum === totalPages - 1 && currentPage < totalPages - 3) {
                              return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                            }
                            
                            if (!showPage) return null;

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`min-w-[40px] h-10 ${
                                  currentPage === pageNum 
                                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                                    : 'hover:bg-purple-50'
                                }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        {/* Next Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 border-gray-300 hover:bg-gray-100"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </TabsContent>

            {/* Collect Payment Tab */}
            <TabsContent value="collect" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Add / Collect Payment</h2>
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Order Selection */}
                <div className="lg:w-1/2">
                  <Card className="bg-white border shadow-sm h-full">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-gray-900">Select Customer / Order</CardTitle>
                          <CardDescription>Choose an outstanding order to record payment</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchData()}
                          disabled={loading}
                          className="border-gray-80 text-gray-600 hover:bg-gray-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </CardHeader>
                  <CardContent>
                    <div className="max-h-500 overflow-y-auto">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                          <p className="text-gray-500 font-medium">Loading orders...</p>
                        </div>
                      ) : outstandingOrders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-2">
                            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium">No Outstanding Orders</p>
                          <p className="text-gray-400 text-sm">All orders have been fully paid</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {outstandingOrders.map((order) => (
                            <div
                              key={order.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedOrder?.id === order.id
                                  ? 'border-gray-900 bg-gray-50'
                                  : 'border-gray-200 hover:border-gray-400 bg-white'
                              }`}
                              onClick={() => setSelectedOrder(order)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-lg text-gray-900">{order.order_number || 'No Order Number'}</p>
                                  <p className="text-sm text-gray-600">{order.customers?.name || 'No Customer Name'}</p>
                                  <p className="text-xs text-gray-500">📱 {order.customers?.mobile || 'No Mobile'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Total: {formatCurrency(order.total_amount || 0)}</p>
                                  <p className="font-bold text-gray-900">Due: {formatCurrency(order.balance_amount || 0)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </div>

                {/* Payment Form */}
                <div className="lg:w-1/2">
                  <Card className="bg-white border shadow-sm h-full">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Payment Details</CardTitle>
                      <CardDescription>Enter payment information</CardDescription>
                    </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedOrder && (
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <h3 className="font-bold text-gray-900 mb-2">Order Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Order:</span>
                            <p className="font-semibold">{selectedOrder.order_number}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Customer:</span>
                            <p className="font-semibold">{selectedOrder.customers?.name}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Amount:</span>
                            <p className="font-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Balance Due:</span>
                            <p className="font-bold text-gray-900">{formatCurrency(selectedOrder.balance_amount)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="amount">Amount Paid</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={paymentForm.amount || ''}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                          placeholder="Enter amount"
                          className="text-lg font-semibold"
                        />
                      </div>

                      <div>
                        <Label htmlFor="method">Payment Method</Label>
                        <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value as Payment['payment_method'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">💰 Cash</SelectItem>
                            <SelectItem value="upi">📱 UPI</SelectItem>
                            <SelectItem value="card">💳 Card</SelectItem>
                            <SelectItem value="credit">📋 Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="transaction_id">Transaction ID (Optional)</Label>
                        <Input
                          id="transaction_id"
                          value={paymentForm.transaction_id}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                          placeholder="Enter transaction reference"
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add payment notes..."
                          rows={3}
                        />
                      </div>

                      <Button 
                        onClick={handleAddPayment}
                        className="w-full bg-gray-900 hover:bg-gray-700 text-white font-medium py-3"
                        disabled={!selectedOrder || !paymentForm.amount}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Record Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </div>
              </div>
            </TabsContent>

            {/* Due Payments Tab */}
            <TabsContent value="due" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Due Payments</h2>
                <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by due date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Due Payments</SelectItem>
                    <SelectItem value="7days">Due in 7 days</SelectItem>
                    <SelectItem value="15days">Due in 15 days</SelectItem>
                    <SelectItem value="30days">Due in 30+ days</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {outstandingOrders.map((order) => (
                  <Card key={order.id} className="bg-white border shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-gray-900">{order.order_number}</CardTitle>
                          <CardDescription className="text-gray-600">{order.customers?.name}</CardDescription>
                        </div>
                        <Badge className="bg-gray-900 text-white">Due</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between text-sm">
                          <span>Total Amount:</span>
                          <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Amount Paid:</span>
                          <span className="font-semibold text-gray-600">{formatCurrency(order.advance_amount)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-bold">Balance Due:</span>
                            <span className="font-bold text-gray-900">{formatCurrency(order.balance_amount)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-gray-900 hover:bg-gray-700 text-white"
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveTab('collect');
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Refunds Tab */}
            <TabsContent value="refunds" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Refunds & Adjustments</h2>
              
              <div className="grid gap-8 lg:grid-cols-2">
                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Record Refund</CardTitle>
                    <CardDescription>Process refunds and adjustments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-12">
                      <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Refund Management</h3>
                      <p className="text-gray-600">Feature coming soon...</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Recent Adjustments</CardTitle>
                    <CardDescription>View recent refunds and adjustments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Edit className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Adjustments</h3>
                      <p className="text-gray-600">No refunds or adjustments recorded yet.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
              
              <div className="grid gap-8 lg:grid-cols-2">
                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <BarChart3 className="h-6 w-6 mr-2" />
                      Payment Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <span className="font-semibold">Cash vs Online</span>
                        <span className="text-gray-600">
                          {Math.round((paymentStats.cashPayments / (paymentStats.cashPayments + paymentStats.onlinePayments)) * 100) || 0}% Cash
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                        <span className="font-semibold">Collection Efficiency</span>
                        <span className="text-gray-600">
                          {Math.round((paymentStats.totalRevenue / (paymentStats.totalRevenue + paymentStats.pendingPayments)) * 100) || 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900">
                      <Users className="h-6 w-6 mr-2" />
                      Customer Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Top Paying Customers</h3>
                      <p className="text-gray-600">Detailed reports coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-900">
                    <TrendingUp className="h-6 w-6 mr-2" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Monthly Revenue Trends</h3>
                    <p className="text-gray-600">Advanced analytics dashboard coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-purple-50 border-2 border-purple-200/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-800">Quick Payment Entry</DialogTitle>
            <DialogDescription>Record a new payment transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label>Select Order</Label>
                <Select onValueChange={(value) => {
                  const order = outstandingOrders.find(o => o.id === value);
                  setSelectedOrder(order || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an outstanding order" />
                  </SelectTrigger>
                  <SelectContent>
                    {outstandingOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number} - {order.customers?.name} (Due: {formatCurrency(order.balance_amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-800 mb-2">Order Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Customer:</span>
                      <p className="font-semibold">{selectedOrder.customers?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Balance Due:</span>
                      <p className="font-bold text-red-600">{formatCurrency(selectedOrder.balance_amount)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value as Payment['payment_method'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Transaction ID (Optional)</Label>
                <Input
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                  placeholder="Enter transaction reference"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleAddPayment}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                disabled={!selectedOrder || !paymentForm.amount}
              >
                Record Payment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddPaymentOpen(false);
                  resetForms();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Dialog */}
      <Dialog open={isViewPaymentOpen} onOpenChange={setIsViewPaymentOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">Payment Details</DialogTitle>
            <DialogDescription>View payment transaction information</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-800 mb-3">Transaction Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-sm">Payment ID:</span>
                      <p className="font-semibold">{selectedPayment.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Order Number:</span>
                      <p className="font-semibold">{selectedPayment.orders?.order_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Customer:</span>
                      <p className="font-semibold">{selectedPayment.orders?.customers?.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Amount:</span>
                      <p className="font-bold text-green-600">{formatCurrency(selectedPayment.amount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Payment Method:</span>
                      <p className="font-semibold capitalize">{selectedPayment.payment_method}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm">Payment Date:</span>
                      <p className="font-semibold">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                    </div>
                    {selectedPayment.transaction_id && (
                      <div className="col-span-2">
                        <span className="text-gray-600 text-sm">Transaction ID:</span>
                        <p className="font-semibold">{selectedPayment.transaction_id}</p>
                      </div>
                    )}
                    {selectedPayment.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <p className="font-semibold">{selectedPayment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setIsViewPaymentOpen(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white to-green-50 border-2 border-green-200/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-green-800">Edit Payment</DialogTitle>
            <DialogDescription>Update payment transaction details</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-bold text-green-800 mb-2">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Order:</span>
                    <p className="font-semibold">{selectedPayment.orders?.order_number}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <p className="font-semibold">{selectedPayment.orders?.customers?.name}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={paymentForm.amount || ''}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value as Payment['payment_method'] }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Transaction ID (Optional)</Label>
                  <Input
                    value={paymentForm.transaction_id}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                    placeholder="Enter transaction reference"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleUpdatePayment}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  disabled={!paymentForm.amount}
                >
                  Update Payment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditPaymentOpen(false);
                    resetForms();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog open={isDeletePaymentOpen} onOpenChange={setIsDeletePaymentOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-white to-red-50 border-2 border-red-200/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-800">Delete Payment</DialogTitle>
            <DialogDescription>Are you sure you want to delete this payment?</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Order:</span> <span className="font-semibold">{selectedPayment.orders?.order_number}</span></p>
                  <p><span className="text-gray-600">Customer:</span> <span className="font-semibold">{selectedPayment.orders?.customers?.name}</span></p>
                  <p><span className="text-gray-600">Amount:</span> <span className="font-bold text-red-600">{formatCurrency(selectedPayment.amount)}</span></p>
                  <p><span className="text-gray-600">Date:</span> <span className="font-semibold">{new Date(selectedPayment.payment_date).toLocaleDateString()}</span></p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Warning!</p>
                    <p>This action cannot be undone. The payment will be permanently removed and the order balance will be updated.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={confirmDeletePayment}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete Payment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDeletePaymentOpen(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
