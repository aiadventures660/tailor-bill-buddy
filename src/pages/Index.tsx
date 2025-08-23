import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  ShoppingBag, 
  Ruler, 
  Receipt, 
  Package, 
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  ArrowRight,
  Shirt,
  Scissors,
  Calculator,
  FileText,
  Target,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Index = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    readyOrders: 0,
    todayOrders: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      // Fetch customers count
      const { data: customers } = await supabase
        .from('customers')
        .select('id');

      // Fetch orders with status
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at');

      // Fetch payments for revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount');

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter(order => 
        order.created_at.startsWith(today)
      ).length || 0;

      const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
      const readyOrders = orders?.filter(order => order.status === 'ready').length || 0;

      setStats({
        totalCustomers: customers?.length || 0,
        totalOrders: orders?.length || 0,
        totalRevenue,
        pendingOrders,
        readyOrders,
        todayOrders
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-32">
            <div className="text-center">
              <div className="flex justify-center mb-8">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <Scissors className="h-16 w-16 text-white" />
                </div>
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 tracking-tight">
                Tailor
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Pro</span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Complete business management solution for modern tailoring shops. 
                Manage customers, orders, measurements, billing, and inventory all in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 text-lg px-8 py-4 rounded-xl font-semibold"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4 rounded-xl font-semibold"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-400">Powerful features designed for tailoring businesses</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Customer Management',
                description: 'Complete customer database with contact details, order history, and preferences'
              },
              {
                icon: Ruler,
                title: 'Digital Measurements',
                description: 'Store and manage detailed measurements for all clothing types with easy access'
              },
              {
                icon: ShoppingBag,
                title: 'Order Tracking',
                description: 'Track orders from creation to delivery with status updates and notifications'
              },
              {
                icon: Receipt,
                title: 'Smart Billing',
                description: 'Generate professional invoices with GST calculation and payment tracking'
              },
              {
                icon: Package,
                title: 'Inventory Control',
                description: 'Manage ready-made items, track stock levels, and get low-stock alerts'
              },
              {
                icon: BarChart3,
                title: 'Business Analytics',
                description: 'Detailed reports and insights to help grow your tailoring business'
              }
            ].map((feature, index) => (
              <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300">
                <CardHeader>
                  <div className="p-3 bg-white/10 rounded-lg w-fit">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
            <h3 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h3>
            <p className="text-gray-300 text-lg mb-8">
              Join hundreds of tailors who have modernized their business with TailorPro
            </p>
            <Button 
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg px-8 py-4 rounded-xl font-semibold"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Welcome Header */}
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
                Here's your business overview for today
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Data</span>
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
                onClick={() => navigate('/dashboard')}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Full Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Customers</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</div>
              <p className="text-xs text-gray-500 mt-1">Registered customers</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Orders</CardTitle>
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.todayOrders} orders today</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Revenue</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Pending Orders</CardTitle>
              <Clock className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.readyOrders} ready for delivery</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500 rounded-xl text-white">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900">Manage Customers</CardTitle>
                  <CardDescription className="text-gray-600">Add and manage customer database</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/customers">
                  View Customers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500 rounded-xl text-white">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900">Process Orders</CardTitle>
                  <CardDescription className="text-gray-600">Create and track orders</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/orders">
                  Manage Orders
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500 rounded-xl text-white">
                  <Ruler className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900">Take Measurements</CardTitle>
                  <CardDescription className="text-gray-600">Record customer measurements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/measurements">
                  Add Measurements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-20 flex-col space-y-2">
            <Link to="/billing">
              <Receipt className="h-6 w-6" />
              <span>Create Bill</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-20 flex-col space-y-2">
            <Link to="/inventory">
              <Package className="h-6 w-6" />
              <span>Manage Inventory</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-20 flex-col space-y-2">
            <Link to="/payments">
              <DollarSign className="h-6 w-6" />
              <span>Track Payments</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-20 flex-col space-y-2">
            <Link to="/reports">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
