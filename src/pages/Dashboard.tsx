import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataSeeder from '@/components/DataSeeder';
import PaymentSystemStatus from '@/components/PaymentSystemStatus';
import { 
  Users, 
  Ruler, 
  ShoppingCart, 
  FileText, 
  Package, 
  TrendingUp,
  DollarSign,
  Clock,
  Eye,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CreditCard,
  Bell,
  CheckCircle2,
  XCircle,
  Database,
  Activity
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // State for real-time data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDataSeeder, setShowDataSeeder] = useState(false);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    activeOrders: 0,
    monthlyRevenue: 0,
    pendingDeliveries: 0,
    overdueTasks: 0,
    todayDue: 0,
    totalPayments: 0,
    pendingPayments: 0,
    overduePayments: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [paymentAlerts, setPaymentAlerts] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const customersSubscription = supabase
      .channel('customers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const paymentsSubscription = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(customersSubscription);
      supabase.removeChannel(paymentsSubscription);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch total customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, created_at');
      
      if (customersError) throw customersError;

      // Fetch orders with details
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number,
          status, 
          total_amount,
          advance_amount,
          balance_amount,
          due_date, 
          created_at,
          customer_id
        `);
      
      if (ordersError) throw ordersError;

      // Fetch customers for names
      const { data: customersData, error: customersDataError } = await supabase
        .from('customers')
        .select('id, name');
      
      if (customersDataError) throw customersDataError;

      // Create customer lookup map
      const customerMap = customersData?.reduce((acc, customer) => {
        acc[customer.id] = customer.name;
        return acc;
      }, {}) || {};

      // Fetch payments for revenue calculation
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, created_at')
        .gte('created_at', firstDayOfMonth.toISOString());
      
      if (paymentsError) throw paymentsError;

      // Calculate statistics
      const totalCustomers = customers?.length || 0;
      
      const activeOrders = orders?.filter(order => 
        ['pending', 'in_progress', 'ready'].includes(order.status)
      ).length || 0;

      const monthlyRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      const today = new Date();
      const todayDate = today.toISOString().split('T')[0];
      
      const pendingDeliveries = orders?.filter(order => 
        order.status === 'ready' || order.due_date <= todayDate
      ).length || 0;

      const overdueTasks = orders?.filter(order => 
        order.due_date < todayDate && order.status !== 'delivered'
      ).length || 0;

      const todayDue = orders?.filter(order => 
        order.due_date === todayDate && order.status !== 'delivered'
      ).length || 0;

      // Fetch payments data for detailed analysis
      const { data: paymentsDetailed, error: paymentsDetailedError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          created_at,
          order_id,
          orders!inner(
            id,
            order_number,
            total_amount,
            advance_amount,
            balance_amount,
            due_date,
            customers(name, mobile)
          )
        `);

      if (paymentsDetailedError) throw paymentsDetailedError;

      // Calculate payment statistics
      const totalPayments = paymentsDetailed?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // Calculate pending payments (orders with balance amount > 0)
      const ordersWithBalance = orders?.filter(order => 
        (order.total_amount - (order.advance_amount || 0)) > 0 && order.status !== 'cancelled'
      ) || [];
      
      const pendingPayments = ordersWithBalance.reduce((sum, order) => 
        sum + (order.total_amount - (order.advance_amount || 0)), 0
      );

      // Calculate overdue payments (pending payments past due date)
      const overduePayments = ordersWithBalance
        .filter(order => order.due_date && order.due_date < todayDate)
        .reduce((sum, order) => sum + (order.total_amount - (order.advance_amount || 0)), 0);

      // Create payment alerts
      const alerts = [];
      ordersWithBalance.forEach(order => {
        const balance = order.total_amount - (order.advance_amount || 0);
        if (balance > 0) {
          const customerName = customersData?.find(c => c.id === order.customer_id)?.name || 'Unknown';
          
          if (order.due_date && order.due_date < todayDate) {
            alerts.push({
              id: order.id,
              type: 'overdue',
              title: 'Payment Overdue',
              message: `₹${balance.toLocaleString()} pending from ${customerName}`,
              orderNumber: order.order_number || `Order ${order.id.slice(0, 8)}`,
              amount: balance,
              dueDate: order.due_date,
              priority: 'high'
            });
          } else if (order.due_date && order.due_date <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
            alerts.push({
              id: order.id,
              type: 'due_soon',
              title: 'Payment Due Soon',
              message: `₹${balance.toLocaleString()} due from ${customerName}`,
              orderNumber: order.order_number || `Order ${order.id.slice(0, 8)}`,
              amount: balance,
              dueDate: order.due_date,
              priority: 'medium'
            });
          }
        }
      });

      // Get pending approvals (orders with status 'pending')
      const pendingApprovalOrders = orders?.filter(order => order.status === 'pending').map(order => {
        const customerName = customersData?.find(c => c.id === order.customer_id)?.name || 'Unknown';
        return {
          id: order.id,
          orderNumber: order.order_number || `Order ${order.id.slice(0, 8)}`,
          customerName,
          amount: order.total_amount,
          createdAt: order.created_at
        };
      }) || [];

      setDashboardData({
        totalCustomers,
        activeOrders,
        monthlyRevenue,
        pendingDeliveries,
        overdueTasks,
        todayDue,
        totalPayments,
        pendingPayments,
        overduePayments
      });

      setPaymentAlerts(alerts.slice(0, 5)); // Show top 5 alerts
      setPendingApprovals(pendingApprovalOrders.slice(0, 5)); // Show top 5 pending approvals

      // Set recent orders for activity
      setRecentOrders(orders?.slice(0, 5) || []);

      // Create recent activities from orders and customers
      const activities = [];
      
      // Recent orders
      if (orders) {
        orders.slice(0, 3).forEach(order => {
          const customerName = customerMap[order.customer_id] || 'Unknown Customer';
          activities.push({
            type: 'order',
            title: `Order ${order.status}`,
            description: `Order for ${customerName} - ₹${order.total_amount}`,
            time: order.created_at,
            icon: ShoppingCart,
            color: order.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          });
        });
      }

      // Recent customers
      if (customers) {
        customers.slice(0, 2).forEach(customer => {
          activities.push({
            type: 'customer',
            title: 'New customer registered',
            description: `Customer ID: ${customer.id}`,
            time: customer.created_at,
            icon: Users,
            color: 'bg-purple-100 text-purple-600'
          });
        });
      }

      // Recent payments
      if (paymentsDetailed) {
        paymentsDetailed.slice(0, 2).forEach(payment => {
          activities.push({
            type: 'payment',
            title: 'Payment received',
            description: `₹${payment.amount} payment received`,
            time: payment.created_at,
            icon: DollarSign,
            color: 'bg-green-100 text-green-600'
          });
        });
      }

      // Sort activities by time and take latest 5
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'cashier':
        return 'Cashier';
      case 'tailor':
        return 'Tailor';
      default:
        return 'User';
    }
  };

  // Dynamic dashboard stats based on real data
  const getDashboardStats = () => [
    {
      title: 'Total Customers',
      value: loading ? '...' : dashboardData.totalCustomers.toString(),
      icon: Users,
      description: 'Registered customers',
      color: 'text-blue-600',
    },
    {
      title: 'Active Orders',
      value: loading ? '...' : dashboardData.activeOrders.toString(),
      icon: ShoppingCart,
      description: `${dashboardData.todayDue} due today`,
      color: 'text-green-600',
    },
    {
      title: 'Monthly Revenue',
      value: loading ? '...' : `₹${dashboardData.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'Current month earnings',
      color: 'text-purple-600',
    },
    {
      title: 'Total Payments',
      value: loading ? '...' : `₹${dashboardData.totalPayments.toLocaleString()}`,
      icon: CreditCard,
      description: 'All payments received',
      color: 'text-emerald-600',
    },
    {
      title: 'Pending Payments',
      value: loading ? '...' : `₹${dashboardData.pendingPayments.toLocaleString()}`,
      icon: Clock,
      description: 'Awaiting payment',
      color: dashboardData.overduePayments > 0 ? 'text-red-600' : 'text-orange-600',
    },
    {
      title: 'Pending Deliveries',
      value: loading ? '...' : dashboardData.pendingDeliveries.toString(),
      icon: Clock,
      description: `${dashboardData.overdueTasks} overdue`,
      color: dashboardData.overdueTasks > 0 ? 'text-red-600' : 'text-orange-600',
    },
  ];

  // Quick actions based on user role
  const getQuickActions = () => {
    const actions = [];
    
    if (profile?.role === 'admin' || profile?.role === 'cashier') {
      actions.push(
        {
          title: 'Add New Customer',
          description: 'Register a new customer',
          icon: Users,
          path: '/customers',
          color: 'bg-blue-500',
        },
        {
          title: 'Create Order',
          description: 'Start a new billing order',
          icon: FileText,
          path: '/billing',
          color: 'bg-green-500',
        },
        {
          title: 'Manage Inventory',
          description: 'Update ready-made items',
          icon: Package,
          path: '/inventory',
          color: 'bg-purple-500',
        }
      );
    }
    
    if (profile?.role === 'admin' || profile?.role === 'tailor') {
      actions.push(
        {
          title: 'Take Measurements',
          description: 'Record customer measurements',
          icon: Ruler,
          path: '/measurements',
          color: 'bg-orange-500',
        }
      );
    }
    
    return actions;
  };

  const quickActions = getQuickActions();
  const dashboardStats = getDashboardStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center space-x-3">
                <div className="p-3 bg-gray-900 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <span>Welcome back, {profile?.full_name || 'User'}!</span>
              </h1>
              <p className="text-gray-600 text-lg">
                You're logged in as {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}. 
                Here's what's happening in your tailoring business today.
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Real-time Data</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {profile?.role === 'admin' && (
                <>
                  <Button 
                    onClick={() => setShowSystemStatus(!showSystemStatus)}
                    variant="outline" 
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    {showSystemStatus ? 'Hide' : 'Show'} System Status
                  </Button>
                  <Button 
                    onClick={() => setShowDataSeeder(!showDataSeeder)}
                    variant="outline" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    {showDataSeeder ? 'Hide' : 'Show'} Data Seeder
                  </Button>
                </>
              )}
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                disabled={refreshing}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>
        </div>

        {/* System Status Component (for development/testing) */}
        {showSystemStatus && profile?.role === 'admin' && (
          <div className="mb-6">
            <PaymentSystemStatus />
          </div>
        )}

        {/* Data Seeder Component (for development/testing) */}
        {showDataSeeder && profile?.role === 'admin' && (
          <div className="mb-6">
            <DataSeeder />
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dashboardStats.map((stat, index) => (
            <Card key={index} className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm bg-white/90">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gray-100`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${loading ? 'animate-pulse text-gray-400' : 'text-gray-900'}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Real-time Order Status Overview */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span>Order Status Overview</span>
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Real-time Updates</span>
              <Button variant="outline" size="sm" asChild>
                <Link to="/order-status">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Pending Orders</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {loading ? '...' : recentOrders.filter(order => order.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs bg-yellow-200 text-yellow-800 border-yellow-300">
                    Awaiting approval
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">In Progress</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {loading ? '...' : recentOrders.filter(order => order.status === 'in_progress').length}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs bg-blue-200 text-blue-800 border-blue-300">
                    Active work
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Ready for Delivery</p>
                    <p className="text-2xl font-bold text-green-900">
                      {loading ? '...' : recentOrders.filter(order => order.status === 'ready').length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs bg-green-200 text-green-800 border-green-300">
                    Ready to ship
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">Overdue</p>
                    <p className="text-2xl font-bold text-red-900">
                      {loading ? '...' : dashboardData.overdueTasks}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-red-600" />
                </div>
                <div className="mt-2">
                  <Badge variant="destructive" className="text-xs">
                    Needs attention
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders Preview */}
          {recentOrders.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.order_number || `ORD-${index + 1}`}</p>
                        <p className="text-sm text-gray-600">{order.customer_name || 'Customer'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800 border-green-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {order.status?.replace('_', ' ') || 'pending'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Alerts Section */}
        {paymentAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <span>Payment Alerts</span>
              </h2>
              <Badge variant="destructive" className="animate-pulse">
                {paymentAlerts.length} Alert{paymentAlerts.length > 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentAlerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.priority === 'high' ? 'border-l-red-500 bg-red-50' : 
                  alert.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' : 
                  'border-l-blue-500 bg-blue-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {alert.type === 'overdue' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600" />
                        )}
                        <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {alert.type === 'overdue' ? 'OVERDUE' : 'DUE SOON'}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        ₹{alert.amount.toLocaleString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{alert.orderNumber}</h3>
                    <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Due: {new Date(alert.dueDate).toLocaleDateString()}</span>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/payments">View Payment</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Admin Approval Section */}
        {(profile?.role === 'admin' || profile?.role === 'cashier') && pendingApprovals.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <span>Pending Approvals</span>
              </h2>
              <Badge variant="secondary" className="animate-pulse">
                {pendingApprovals.length} Pending
              </Badge>
            </div>
            
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <Card key={approval.id} className="border-l-4 border-l-blue-500 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">{approval.orderNumber}</h3>
                          <Badge variant="outline" className="text-xs">
                            ₹{approval.amount.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Customer: {approval.customerName}</p>
                        <p className="text-xs text-gray-500">
                          Created: {formatTimeAgo(approval.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/order-status">
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-gray-50">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-xl ${action.color} text-white shadow-lg`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">{action.title}</CardTitle>
                      <CardDescription className="text-gray-600">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button asChild variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400">
                    <Link to={action.path}>
                      Get Started
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white shadow-lg border-0 backdrop-blur-sm bg-white/90">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span>Recent Activity</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Live Updates
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="bg-gray-200 p-3 rounded-full animate-pulse w-12 h-12"></div>
                    <div className="flex-1 space-y-2">
                      <div className="bg-gray-200 h-4 rounded animate-pulse w-3/4"></div>
                      <div className="bg-gray-200 h-3 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-3 rounded-full ${activity.color} shadow-sm`}>
                      <activity.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">{formatTimeAgo(activity.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-600">Activity will appear here as you use the system</p>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => navigate('/reports')}
              >
                <Eye className="mr-2 h-4 w-4" />
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;