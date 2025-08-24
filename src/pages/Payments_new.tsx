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
  RefreshCw,
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
  ArrowDownRight
} from 'lucide-react';

interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'card' | 'credit';
  payment_date: string;
  transaction_id?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'failed';
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
  
  // Dialog states
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
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
      
      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            order_number,
            customer_id,
            total_amount,
            advance_amount,
            balance_amount,
            customers (name, mobile, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch outstanding orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, mobile, email)
        `)
        .gt('balance_amount', 0)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOutstandingOrders(ordersData || []);

      // Calculate statistics
      calculateStats(paymentsData || [], ordersData || []);
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment data',
        variant: 'destructive',
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
      if (!selectedOrder || !paymentForm.amount) {
        toast({
          title: 'Error',
          description: 'Please select an order and enter payment amount',
          variant: 'destructive',
        });
        return;
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          transaction_id: paymentForm.transaction_id,
          notes: paymentForm.notes,
          status: 'completed',
          created_by: user?.id,
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
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });

      setIsAddPaymentOpen(false);
      setPaymentForm({
        order_id: '',
        amount: 0,
        payment_method: 'cash',
        transaction_id: '',
        notes: ''
      });
      setSelectedOrder(null);
      fetchData();
      
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchData();
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="w-full space-y-8 p-6">
        {/* Header */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-white/95 via-purple-50/90 to-blue-50/95 border-2 border-purple-200/50 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-2xl shadow-xl">
                  <Wallet className="h-12 w-12 text-white" />
                </div>
                Payment Management Center
              </h1>
              <p className="text-gray-700 text-xl font-medium">
                Complete payment processing with analytics, reminders & reporting
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={fetchData} 
                variant="outline" 
                className="backdrop-blur-sm bg-white/70 border-2 border-purple-200 hover:bg-purple-50"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={() => setIsAddPaymentOpen(true)} 
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Payment
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-white/90 border-2 border-purple-200/50 rounded-3xl shadow-2xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gradient-to-r from-purple-100/80 to-blue-100/80 p-6">
              <TabsList className="grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm rounded-2xl p-2">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Payment History
                </TabsTrigger>
                <TabsTrigger value="collect" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Collect Payment
                </TabsTrigger>
                <TabsTrigger value="due" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Due Payments
                </TabsTrigger>
                <TabsTrigger value="refunds" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Refunds
                </TabsTrigger>
                <TabsTrigger value="reports" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-xl font-semibold">
                  Reports
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="p-8 space-y-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Dashboard</h2>
              
              {/* Summary Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200/50 shadow-xl hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-green-700 font-bold">Total Revenue</CardTitle>
                      <div className="p-3 bg-green-500 rounded-xl">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-green-800">{formatCurrency(paymentStats.totalRevenue)}</div>
                    <p className="text-green-600 text-sm mt-2 flex items-center">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {paymentStats.totalTransactions} transactions
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-200/50 shadow-xl hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-red-700 font-bold">Pending Payments</CardTitle>
                      <div className="p-3 bg-red-500 rounded-xl">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-red-800">{formatCurrency(paymentStats.pendingPayments)}</div>
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {outstandingOrders.length} orders pending
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-2 border-blue-200/50 shadow-xl hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-blue-700 font-bold">Collected Today</CardTitle>
                      <div className="p-3 bg-blue-500 rounded-xl">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-blue-800">{formatCurrency(paymentStats.collectedToday)}</div>
                    <p className="text-blue-600 text-sm mt-2">Today's collections</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200/50 shadow-xl hover:shadow-2xl transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-purple-700 font-bold">This Month</CardTitle>
                      <div className="p-3 bg-purple-500 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-purple-800">{formatCurrency(paymentStats.collectedThisMonth)}</div>
                    <p className="text-purple-600 text-sm mt-2">Monthly total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Charts */}
              <div className="grid gap-8 md:grid-cols-2">
                <Card className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-800">
                      <PieChart className="h-6 w-6 mr-2" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <Banknote className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-semibold text-green-700">Cash</span>
                        </div>
                        <span className="font-bold text-green-800">{formatCurrency(paymentStats.cashPayments)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center">
                          <Smartphone className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-semibold text-blue-700">Online</span>
                        </div>
                        <span className="font-bold text-blue-800">{formatCurrency(paymentStats.onlinePayments)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-800">
                      <BarChart3 className="h-6 w-6 mr-2" />
                      Collection Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                        <span className="font-semibold text-emerald-700">Collection Rate</span>
                        <span className="font-bold text-emerald-800">
                          {paymentStats.totalRevenue > 0 ? 
                            Math.round((paymentStats.totalRevenue / (paymentStats.totalRevenue + paymentStats.pendingPayments)) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span className="font-semibold text-orange-700">Overdue Amount</span>
                        <span className="font-bold text-orange-800">{formatCurrency(paymentStats.overduePayments)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payment History Tab */}
            <TabsContent value="history" className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Payment History</h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search payments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={filterMethod} onValueChange={setFilterMethod}>
                    <SelectTrigger className="w-40">
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

              <Card className="bg-white border-2 border-gray-200/50 shadow-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments
                      .filter(payment => 
                        (filterMethod === 'all' || payment.payment_method === filterMethod) &&
                        (searchTerm === '' || 
                         payment.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      )
                      .slice(0, 10)
                      .map((payment) => (
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
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Collect Payment Tab */}
            <TabsContent value="collect" className="p-8 space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Add / Collect Payment</h2>
              
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Order Selection */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-blue-800">Select Customer / Order</CardTitle>
                    <CardDescription>Choose an outstanding order to record payment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {outstandingOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedOrder?.id === order.id
                              ? 'border-blue-500 bg-blue-100'
                              : 'border-gray-200 hover:border-blue-300 bg-white'
                          }`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-lg">{order.order_number}</p>
                              <p className="text-sm text-gray-600">{order.customers?.name}</p>
                              <p className="text-xs text-gray-500">📱 {order.customers?.mobile}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Total: {formatCurrency(order.total_amount)}</p>
                              <p className="font-bold text-red-600">Due: {formatCurrency(order.balance_amount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Form */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-green-800">Payment Details</CardTitle>
                    <CardDescription>Enter payment information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedOrder && (
                      <div className="p-4 bg-white rounded-xl border border-green-200">
                        <h3 className="font-bold text-green-800 mb-2">Order Summary</h3>
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
                            <p className="font-bold text-red-600">{formatCurrency(selectedOrder.balance_amount)}</p>
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
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3"
                        disabled={!selectedOrder || !paymentForm.amount}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Record Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Due Payments Tab */}
            <TabsContent value="due" className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Due Payments</h2>
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
                  <Card key={order.id} className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200/50 shadow-xl hover:shadow-2xl transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-red-800">{order.order_number}</CardTitle>
                          <CardDescription className="text-red-600">{order.customers?.name}</CardDescription>
                        </div>
                        <Badge className="bg-red-500 text-white">Due</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Total Amount:</span>
                          <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Amount Paid:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(order.advance_amount)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-bold">Balance Due:</span>
                            <span className="font-bold text-red-600">{formatCurrency(order.balance_amount)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveTab('collect');
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                        <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Refunds Tab */}
            <TabsContent value="refunds" className="p-8 space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Refunds & Adjustments</h2>
              
              <div className="grid gap-8 lg:grid-cols-2">
                <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-orange-800">Record Refund</CardTitle>
                    <CardDescription>Process refunds and adjustments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-12">
                      <Receipt className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-orange-700 mb-2">Refund Management</h3>
                      <p className="text-orange-600">Feature coming soon...</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-yellow-800">Recent Adjustments</CardTitle>
                    <CardDescription>View recent refunds and adjustments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Edit className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-yellow-700 mb-2">No Adjustments</h3>
                      <p className="text-yellow-600">No refunds or adjustments recorded yet.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="p-8 space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Reports & Analytics</h2>
              
              <div className="grid gap-8 lg:grid-cols-2">
                <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-violet-800">
                      <BarChart3 className="h-6 w-6 mr-2" />
                      Payment Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                        <span className="font-semibold">Cash vs Online</span>
                        <span className="text-violet-600">
                          {Math.round((paymentStats.cashPayments / (paymentStats.cashPayments + paymentStats.onlinePayments)) * 100) || 0}% Cash
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                        <span className="font-semibold">Collection Efficiency</span>
                        <span className="text-violet-600">
                          {Math.round((paymentStats.totalRevenue / (paymentStats.totalRevenue + paymentStats.pendingPayments)) * 100) || 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-purple-800">
                      <Users className="h-6 w-6 mr-2" />
                      Customer Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <PieChart className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-purple-700 mb-2">Top Paying Customers</h3>
                      <p className="text-purple-600">Detailed reports coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-indigo-800">
                    <TrendingUp className="h-6 w-6 mr-2" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-indigo-700 mb-2">Monthly Revenue Trends</h3>
                    <p className="text-indigo-600">Advanced analytics dashboard coming soon...</p>
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
                onClick={() => setIsAddPaymentOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
