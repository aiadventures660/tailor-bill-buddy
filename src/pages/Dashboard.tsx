import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Ruler, 
  ShoppingCart, 
  FileText, 
  Package, 
  TrendingUp,
  DollarSign,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { profile } = useAuth();

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

  // Mock data for dashboard stats
  const dashboardStats = [
    {
      title: 'Total Customers',
      value: '248',
      icon: Users,
      description: '+12 from last month',
      color: 'text-blue-600',
    },
    {
      title: 'Active Orders',
      value: '34',
      icon: ShoppingCart,
      description: '8 due today',
      color: 'text-green-600',
    },
    {
      title: 'Monthly Revenue',
      value: '₹45,280',
      icon: DollarSign,
      description: '+18% from last month',
      color: 'text-purple-600',
    },
    {
      title: 'Pending Deliveries',
      value: '12',
      icon: Clock,
      description: '3 overdue',
      color: 'text-orange-600',
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          You're logged in as {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}. 
          Here's what's happening in your tailoring business today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">New customer registered</p>
                <p className="text-muted-foreground">Rajesh Kumar - Mobile: +91 9876543210</p>
              </div>
              <span className="text-xs text-muted-foreground">2 min ago</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="bg-green-100 p-2 rounded-full">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Order completed</p>
                <p className="text-muted-foreground">ORD202401180001 - Shirt stitching for Amit Sharma</p>
              </div>
              <span className="text-xs text-muted-foreground">15 min ago</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Payment received</p>
                <p className="text-muted-foreground">₹2,500 payment for Order #ORD202401180002</p>
              </div>
              <span className="text-xs text-muted-foreground">1 hour ago</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;