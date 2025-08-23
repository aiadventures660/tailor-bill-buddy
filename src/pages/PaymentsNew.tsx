import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  Trash2,
  Filter,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Download,
  FileText,
  Settings,
  Shield
} from 'lucide-react';

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'credit';
  payment_date: string;
  notes?: string;
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
  };
}

const Payments: React.FC = () => {
  const { user, profile } = useAuth();
  
  // State management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Payment statistics
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todayPayments: 0,
    thisWeekPayments: 0,
    thisMonthPayments: 0
  });

  // Form state
  const [paymentForm, setPaymentForm] = useState({
    order_id: '',
    amount: 0,
    payment_method: 'cash' as Payment['payment_method'],
    notes: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchOutstandingOrders();
    calculatePaymentStats();
    
    // Set up real-time subscriptions
    const paymentsSubscription = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
        calculatePaymentStats();
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('orders_payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOutstandingOrders();
        calculatePaymentStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsSubscription);
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const calculatePaymentStats = async () => {
    try {
      // Fetch all payments
      const { data: allPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, created_at, payment_date');

      if (paymentsError) throw paymentsError;

      // Fetch all orders
      const { data: allOrders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, advance_amount, balance_amount, due_date, status');

      if (ordersError) throw ordersError;

      const today = new Date();
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const todayStr = today.toISOString().split('T')[0];

      const totalPayments = allPayments?.length || 0;
      const totalAmount = allPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      
      const pendingAmount = allOrders?.filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.balance_amount || 0), 0) || 0;
      
      const overdueAmount = allOrders?.filter(o => 
        o.status !== 'cancelled' && 
        o.due_date && 
        o.due_date < todayStr && 
        (o.balance_amount || 0) > 0
      ).reduce((sum, o) => sum + (o.balance_amount || 0), 0) || 0;

      const todayPayments = allPayments?.filter(p => 
        p.payment_date && p.payment_date.split('T')[0] === todayStr
      ).reduce((sum, p) => sum + p.amount, 0) || 0;

      const thisWeekPayments = allPayments?.filter(p => 
        p.payment_date && new Date(p.payment_date) >= startOfWeek
      ).reduce((sum, p) => sum + p.amount, 0) || 0;

      const thisMonthPayments = allPayments?.filter(p => 
        p.payment_date && new Date(p.payment_date) >= startOfMonth
      ).reduce((sum, p) => sum + p.amount, 0) || 0;

      setPaymentStats({
        totalPayments,
        totalAmount,
        pendingAmount,
        overdueAmount,
        todayPayments,
        thisWeekPayments,
        thisMonthPayments
      });

    } catch (error) {
      console.error('Error calculating payment stats:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            order_number,
            customer_id,
            total_amount,
            advance_amount,
            balance_amount,
            customers (name, mobile)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payments',
        variant: 'destructive',
      });
    }
  };

  const fetchOutstandingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, mobile)
        `)
        .gt('balance_amount', 0)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOutstandingOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching outstanding orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      if (!selectedOrder) {
        toast({
          title: 'Error',
          description: 'Please select an order first',
          variant: 'destructive',
        });
        return;
      }

      if (paymentForm.amount <= 0 || paymentForm.amount > selectedOrder.balance_amount) {
        toast({
          title: 'Error',
          description: `Payment amount must be between ₹1 and ₹${selectedOrder.balance_amount.toLocaleString('en-IN')}`,
          variant: 'destructive',
        });
        return;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User not authenticated',
          variant: 'destructive',
        });
        return;
      }

      // Add payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes,
          created_by: user.id,
        });

      if (paymentError) throw paymentError;

      // Update order balance
      const newAdvanceAmount = selectedOrder.advance_amount + paymentForm.amount;
      const newBalanceAmount = selectedOrder.total_amount - newAdvanceAmount;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          advance_amount: newAdvanceAmount,
          balance_amount: newBalanceAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      toast({
        title: 'Success',
        description: 'Payment added successfully',
      });

      // Reset form
      setPaymentForm({
        order_id: '',
        amount: 0,
        payment_method: 'cash',
        notes: ''
      });
      
      setSelectedOrder(null);
      setIsAddPaymentOpen(false);
      
      // Refresh data
      fetchPayments();
      fetchOutstandingOrders();
      calculatePaymentStats();
      
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payment',
        variant: 'destructive',
      });
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesMethod;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    );

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Next button
    items.push(
      <PaginationItem key="next">
        <PaginationNext 
          onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">Track payments, manage outstanding balances, and monitor revenue</p>
        </div>
        <div className="flex gap-2">
          {(profile?.role === 'admin' || profile?.role === 'cashier') && (
            <Button onClick={() => setIsAddPaymentOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
          )}
          <Button onClick={() => { fetchPayments(); calculatePaymentStats(); }} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">Total Payments</p>
                <p className="text-2xl font-bold text-emerald-900">₹{paymentStats.totalAmount.toLocaleString()}</p>
                <p className="text-xs text-emerald-600">{paymentStats.totalPayments} transactions</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-900">₹{paymentStats.pendingAmount.toLocaleString()}</p>
                <p className="text-xs text-orange-600">Outstanding balances</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-900">₹{paymentStats.overdueAmount.toLocaleString()}</p>
                <p className="text-xs text-red-600">Past due date</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">This Month</p>
                <p className="text-2xl font-bold text-blue-900">₹{paymentStats.thisMonthPayments.toLocaleString()}</p>
                <p className="text-xs text-blue-600">Monthly revenue</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      {profile?.role === 'admin' && (
        <Card className="border-l-4 border-l-purple-500 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Shield className="h-5 w-5" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button variant="outline" className="flex items-center gap-2" onClick={() => setActiveTab('analytics')}>
                <FileText className="h-4 w-4" />
                View Analytics
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Payment Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          payment.payment_method === 'cash' ? 'bg-green-100 text-green-600' :
                          payment.payment_method === 'upi' ? 'bg-blue-100 text-blue-600' :
                          payment.payment_method === 'card' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {payment.payment_method === 'cash' ? <Banknote className="h-4 w-4" /> :
                           payment.payment_method === 'upi' ? <Smartphone className="h-4 w-4" /> :
                           <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium">{payment.orders?.order_number || 'N/A'}</p>
                          <p className="text-sm text-gray-600">{payment.orders?.customers?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Outstanding Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {outstandingOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-gray-600">{order.customers?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">₹{(order.balance_amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {order.due_date ? `Due: ${new Date(order.due_date).toLocaleDateString()}` : 'No due date'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by order number, customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-full md:w-48">
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
            </CardContent>
          </Card>

          {/* Payments Grid */}
          <div className="grid gap-4">
            {filteredPayments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                  <p className="text-gray-500">No payments match your current filters.</p>
                </CardContent>
              </Card>
            ) : (
              currentPayments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${
                          payment.payment_method === 'cash' ? 'bg-green-100 text-green-600' :
                          payment.payment_method === 'upi' ? 'bg-blue-100 text-blue-600' :
                          payment.payment_method === 'card' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {payment.payment_method === 'cash' ? <Banknote className="h-5 w-5" /> :
                           payment.payment_method === 'upi' ? <Smartphone className="h-5 w-5" /> :
                           <CreditCard className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold">{payment.orders?.order_number || 'N/A'}</h3>
                          <p className="text-sm text-gray-600">{payment.orders?.customers?.name || 'Unknown Customer'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.payment_date).toLocaleDateString()} • 
                            {payment.payment_method.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-600">₹{payment.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {profile?.role === 'admin' && (
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {filteredPayments.length > itemsPerPage && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payments
              </div>
              <Pagination>
                <PaginationContent>
                  {renderPaginationItems()}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        {/* Outstanding Tab */}
        <TabsContent value="outstanding" className="space-y-6">
          <div className="grid gap-4">
            {outstandingOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                  <p className="text-gray-500">No outstanding payments at this time.</p>
                </CardContent>
              </Card>
            ) : (
              outstandingOrders.map((order) => (
                <Card key={order.id} className="border-l-4 border-l-orange-500 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        <div>
                          <h3 className="font-semibold">{order.order_number}</h3>
                          <p className="text-sm text-gray-600">{order.customers?.name}</p>
                          <p className="text-xs text-gray-500">
                            Total: ₹{order.total_amount.toLocaleString()} • 
                            Paid: ₹{(order.advance_amount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">₹{(order.balance_amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mb-2">
                          {order.due_date ? `Due: ${new Date(order.due_date).toLocaleDateString()}` : 'No due date'}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setPaymentForm(prev => ({ ...prev, order_id: order.id }));
                            setIsAddPaymentOpen(true);
                          }}
                        >
                          Add Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Today</span>
                    <span className="font-bold">₹{paymentStats.todayPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>This Week</span>
                    <span className="font-bold">₹{paymentStats.thisWeekPayments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>This Month</span>
                    <span className="font-bold">₹{paymentStats.thisMonthPayments.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['cash', 'upi', 'card', 'credit'].map((method) => {
                    const methodPayments = payments.filter(p => p.payment_method === method);
                    const total = methodPayments.reduce((sum, p) => sum + p.amount, 0);
                    const percentage = payments.length > 0 ? (methodPayments.length / payments.length * 100).toFixed(1) : '0';
                    
                    return (
                      <div key={method} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {method === 'cash' && <Banknote className="h-4 w-4" />}
                          {method === 'upi' && <Smartphone className="h-4 w-4" />}
                          {(method === 'card' || method === 'credit') && <CreditCard className="h-4 w-4" />}
                          <span className="capitalize">{method}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{total.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{percentage}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a new payment for an outstanding order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Order Selection */}
            <div>
              <Label>Select Order</Label>
              <div className="grid gap-2 mt-2 max-h-48 overflow-y-auto">
                {outstandingOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-gray-600">{order.customers?.name}</div>
                      </div>
                      <div className="text-sm font-medium text-orange-600">
                        Balance: ₹{(order.balance_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            {selectedOrder && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">Order Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Order:</strong> {selectedOrder.order_number}</div>
                    <div><strong>Customer:</strong> {selectedOrder.customers?.name}</div>
                    <div><strong>Total Amount:</strong> ₹{selectedOrder.total_amount.toLocaleString()}</div>
                    <div><strong>Advance Paid:</strong> ₹{(selectedOrder.advance_amount || 0).toLocaleString()}</div>
                    <div><strong>Balance Due:</strong> ₹{(selectedOrder.balance_amount || 0).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Payment Form */}
            <div className="grid gap-4">
              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter payment amount"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value as Payment['payment_method'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        UPI
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="credit">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Credit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddPayment} className="flex-1">
                Add Payment
              </Button>
              <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Order:</strong> {selectedPayment.orders?.order_number}</div>
                <div><strong>Customer:</strong> {selectedPayment.orders?.customers?.name}</div>
                <div><strong>Amount:</strong> ₹{selectedPayment.amount.toLocaleString()}</div>
                <div><strong>Method:</strong> {selectedPayment.payment_method.toUpperCase()}</div>
                <div><strong>Date:</strong> {new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                <div><strong>Time:</strong> {new Date(selectedPayment.payment_date).toLocaleTimeString()}</div>
              </div>
              {selectedPayment.notes && (
                <div>
                  <strong>Notes:</strong>
                  <p className="mt-1 text-sm text-gray-600">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
