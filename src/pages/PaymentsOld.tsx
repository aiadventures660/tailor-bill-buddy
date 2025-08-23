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
  customers: {
    name: string;
    mobile: string;
  };
}

const paymentMethodConfig = {
  cash: { 
    label: 'Cash', 
    icon: Banknote,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  upi: { 
    label: 'UPI', 
    icon: Smartphone,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  card: { 
    label: 'Card', 
    icon: CreditCard,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  credit: { 
    label: 'Credit', 
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
};

const Payments: React.FC = () => {
  const { user, profile } = useAuth();
  
  // State management
  const [payments, setPayments] = useState<Payment[]>([]);
  const [outstandingOrders, setOutstandingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [methodFilter, setMethodFilter] = useState('all');
  
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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrder) {
      toast({
        title: 'Error',
        description: 'Please select an order',
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

    if (!profile?.id) {
      toast({
        title: 'Error',
        description: 'User profile not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: selectedOrder.id,
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          created_by: profile.id,
          notes: paymentForm.notes || null,
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
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (orderError) throw orderError;

      toast({
        title: 'Success',
        description: `Payment of ₹${paymentForm.amount.toLocaleString('en-IN')} recorded successfully`,
      });

      // Reset form and refresh data
      setPaymentForm({
        order_id: '',
        amount: 0,
        payment_method: 'cash',
        notes: ''
      });
      setSelectedOrder(null);
      setIsAddPaymentOpen(false);
      fetchPayments();
      fetchOutstandingOrders();

    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.orders.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.orders.customers.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.orders.customers.mobile.includes(searchTerm);
    
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesMethod;
  });

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalOutstanding = outstandingOrders.reduce((sum, order) => sum + order.balance_amount, 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

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
            <CreditCard className="h-8 w-8 text-primary" />
            <span>Payment Management</span>
          </h1>
          <p className="text-muted-foreground">
            Track payments and manage outstanding balances
          </p>
        </div>
        
        {(profile?.role === 'admin' || profile?.role === 'cashier') && (
          <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  Record a payment for an order with outstanding balance
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleAddPayment} className="space-y-4">
                {/* Order Selection */}
                <div className="space-y-2">
                  <Label>Select Order *</Label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                    {outstandingOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`p-2 border rounded cursor-pointer transition-colors ${
                          selectedOrder?.id === order.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm opacity-75">{order.customers.name}</div>
                        <div className="text-sm font-medium">
                          Balance: {formatCurrency(order.balance_amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder && (
                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <div className="text-sm space-y-1">
                        <div><strong>Order:</strong> {selectedOrder.order_number}</div>
                        <div><strong>Customer:</strong> {selectedOrder.customers.name}</div>
                        <div><strong>Total Amount:</strong> {formatCurrency(selectedOrder.total_amount)}</div>
                        <div><strong>Paid:</strong> {formatCurrency(selectedOrder.advance_amount)}</div>
                        <div><strong>Balance Due:</strong> {formatCurrency(selectedOrder.balance_amount)}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ 
                      ...paymentForm, 
                      amount: parseFloat(e.target.value) || 0 
                    })}
                    max={selectedOrder?.balance_amount || 0}
                    min="0.01"
                    step="0.01"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method *</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value: 'cash' | 'upi' | 'card' | 'credit') => 
                      setPaymentForm({ ...paymentForm, payment_method: value })
                    }
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Add payment notes..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!selectedOrder || paymentForm.amount <= 0}>
                    Record Payment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
            <p className="text-xs text-muted-foreground">
              All time payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Pending collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Due</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outstandingOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              With pending balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Count</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              Total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Orders Alert */}
      {outstandingOrders.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Outstanding Balances</span>
            </CardTitle>
            <CardDescription className="text-orange-700">
              {outstandingOrders.length} orders have pending balance totaling {formatCurrency(totalOutstanding)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {outstandingOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <div>
                    <div className="font-medium">{order.order_number}</div>
                    <div className="text-sm text-muted-foreground">{order.customers.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-orange-600">{formatCurrency(order.balance_amount)}</div>
                  </div>
                </div>
              ))}
            </div>
            {outstandingOrders.length > 10 && (
              <div className="mt-2 text-sm text-orange-700">
                +{outstandingOrders.length - 10} more orders with outstanding balances
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer name, or mobile..."
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

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No payments found</h3>
                <p className="text-muted-foreground">
                  {payments.length === 0 
                    ? "No payments have been recorded yet" 
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => {
            const methodConfig = paymentMethodConfig[payment.payment_method];
            const MethodIcon = methodConfig.icon;
            
            return (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{payment.orders.order_number}</CardTitle>
                        <Badge className={methodConfig.color}>
                          <MethodIcon className="mr-1 h-3 w-3" />
                          {methodConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{payment.orders.customers.name} - {payment.orders.customers.mobile}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Paid on {new Date(payment.payment_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Order Total</p>
                      <p className="font-medium">{formatCurrency(payment.orders.total_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="font-medium text-green-600">{formatCurrency(payment.orders.advance_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Balance Due</p>
                      <p className="font-medium text-orange-600">{formatCurrency(payment.orders.balance_amount)}</p>
                    </div>
                  </div>
                  
                  {payment.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {payment.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Payments;