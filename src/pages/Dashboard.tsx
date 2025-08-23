import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Calendar
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LoadingSpinner, LoadingCard, LoadingStats } from '@/components/ui/loading';

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    activeOrders: 0,
    monthlyRevenue: 0,
    pendingDeliveries: 0,
    overdueTasks: 0,
    todayDue: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

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
      setIsLoading(true);
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
          status, 
          total_amount, 
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

      setDashboardData({
        totalCustomers,
        activeOrders,
        monthlyRevenue,
        pendingDeliveries,
        overdueTasks,
        todayDue
      });

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
      if (payments) {
        payments.slice(0, 2).forEach(payment => {
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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
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
      value: dashboardData.totalCustomers.toString(),
      icon: Users,
      description: 'Registered customers',
      color: 'text-blue-600',
    },
    {
      title: 'Active Orders',
      value: dashboardData.activeOrders.toString(),
      icon: ShoppingCart,
      description: `${dashboardData.todayDue} due today`,
      color: 'text-green-600',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${dashboardData.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'Current month earnings',
      color: 'text-purple-600',
    },
    {
      title: 'Pending Deliveries',
      value: dashboardData.pendingDeliveries.toString(),
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
                You're logged in as {profile?.role ? getRoleDisplayName(profile.role) : 'User'}. 
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
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                disabled={isRefreshing}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {isLoading ? (
          <LoadingStats count={4} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" />
        ) : (
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
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingCard key={i} className="h-32" />
              ))}
            </div>
          ) : (
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
          )}
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
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-3 rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
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