import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { 
  Users, 
  Ruler, 
  ShoppingCart, 
  Home,
  LogOut,
  Menu,
  User,
  Receipt,
  Package,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  Scissors,
  ShoppingBag,
  MessageSquare,
  Globe,
  CheckCircle,
  Clock,
  AlertTriangle,
  Bell,
  Eye,
  Edit,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  due_date?: string;
  total_amount: number;
  created_at: string;
  customers: {
    name: string;
    mobile: string;
  };
}

interface NotificationData {
  id: string;
  type: 'due_date_warning' | 'overdue' | 'status_change';
  title: string;
  message: string;
  orderId: string;
  customerId: string;
  dueDate: string;
  isRead: boolean;
  createdAt: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  
  // State for order management
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    overdue: 0
  });

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'cashier') {
      fetchOrders();
      checkDueDateNotifications();
      
      // Set up real-time subscriptions
      const ordersSubscription = supabase
        .channel('orders_status_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
          checkDueDateNotifications();
        })
        .subscribe();

      // Check notifications every 5 minutes
      const notificationInterval = setInterval(checkDueDateNotifications, 5 * 60 * 1000);

      return () => {
        supabase.removeChannel(ordersSubscription);
        clearInterval(notificationInterval);
      };
    }
  }, [profile?.role]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          status,
          due_date,
          total_amount,
          created_at,
          customers(name, mobile)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersData = data || [];
      setOrders(ordersData);

      // Calculate statistics
      const today = new Date().toISOString().split('T')[0];
      const stats = {
        total: ordersData.length,
        pending: ordersData.filter(o => o.status === 'pending').length,
        inProgress: ordersData.filter(o => o.status === 'in_progress').length,
        ready: ordersData.filter(o => o.status === 'ready').length,
        delivered: ordersData.filter(o => o.status === 'delivered').length,
        overdue: ordersData.filter(o => o.due_date && o.due_date < today && o.status !== 'delivered').length
      };
      setOrderStats(stats);
      setPendingApprovals(stats.pending);

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDueDateNotifications = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_id,
          due_date,
          status,
          customers(name, mobile)
        `)
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .not('due_date', 'is', null);

      if (error) throw error;

      const today = new Date();
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(today.getDate() + 5);

      const newNotifications: NotificationData[] = [];

      orders?.forEach(order => {
        if (!order.due_date) return;

        const dueDate = new Date(order.due_date);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          // Overdue
          newNotifications.push({
            id: `overdue_${order.id}`,
            type: 'overdue',
            title: 'Order Overdue',
            message: `Order ${order.order_number} for ${order.customers?.name} is ${Math.abs(diffDays)} days overdue`,
            orderId: order.id,
            customerId: order.customer_id,
            dueDate: order.due_date,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        } else if (diffDays <= 5 && diffDays >= 0) {
          // Due soon
          newNotifications.push({
            id: `due_soon_${order.id}`,
            type: 'due_date_warning',
            title: 'Due Date Approaching',
            message: `Order ${order.order_number} for ${order.customers?.name} is due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
            orderId: order.id,
            customerId: order.customer_id,
            dueDate: order.due_date,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      });

      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);

      // Show toast for urgent notifications
      newNotifications.forEach(notification => {
        if (notification.type === 'overdue') {
          toast({
            title: notification.title,
            description: notification.message,
            variant: 'destructive',
          });
        } else if (notification.type === 'due_date_warning') {
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      });

    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return TrendingUp;
      case 'ready':
        return CheckCircle;
      case 'delivered':
        return CheckCircle;
      case 'cancelled':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const filteredOrders = orders.filter(order => {
    if (selectedStatusFilter === 'all') return true;
    if (selectedStatusFilter === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      return order.due_date && order.due_date < today && order.status !== 'delivered';
    }
    return order.status === selectedStatusFilter;
  });

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: 'Dashboard',
        icon: Home,
        path: '/',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Customers',
        icon: Users,
        path: '/customers',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Measurements',
        icon: Ruler,
        path: '/measurements',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Orders',
        icon: ShoppingCart,
        path: '/orders',
        roles: ['admin', 'cashier', 'tailor'],
      },
      {
        title: 'Billing',
        icon: FileText,
        path: '/billing',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Inventory',
        icon: Package,
        path: '/inventory',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Reports',
        icon: BarChart3,
        path: '/reports',
        roles: ['admin'],
      },
      {
        title: 'Notifications',
        icon: MessageSquare,
        path: '/notifications',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Customer Portal',
        icon: Globe,
        path: '/customer-portal',
        roles: ['admin', 'cashier'],
      },
      {
        title: 'Settings',
        icon: Settings,
        path: '/settings',
        roles: ['admin'],
      },
    ];

    return baseItems.filter(item => 
      profile?.role && item.roles.includes(profile.role)
    );
  };

  const navigationItems = getNavigationItems();

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center space-x-2 px-4 py-2">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Scissors className="h-5 w-5" />
              </div>
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">A1 Billing</span>
                <span className="text-xs text-muted-foreground">Tailoring Solution</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path} className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            
            {/* Status Management Section */}
            <div className="mt-6 px-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Order Management
              </h3>
              
              <SidebarMenuButton asChild className="w-full justify-between mb-2">
                <Link to="/order-status" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Status
                  </div>
                  {pendingApprovals > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                      {pendingApprovals}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
              
              <SidebarMenuButton asChild className="w-full justify-between mb-2">
                <Link to="/notifications" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </div>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <h1 className="font-semibold text-lg">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                asChild
              >
                <Link to="/notifications">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;