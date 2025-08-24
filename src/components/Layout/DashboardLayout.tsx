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
  useSidebar,
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

      setNotifications(prev => {
        // Merge by ID, preserve isRead
        const prevMap = Object.fromEntries(prev.map(n => [n.id, n]));
        const merged = newNotifications.map(n => prevMap[n.id] ? { ...n, isRead: prevMap[n.id].isRead } : n);
        // Show toast only for truly new notifications
        merged.forEach(n => {
          if (!prevMap[n.id]) {
            if (n.type === 'overdue') {
              toast({ title: n.title, description: n.message, variant: 'destructive' });
            } else if (n.type === 'due_date_warning') {
              toast({ title: n.title, description: n.message });
            }
          }
        });
        // Update unread count
        setUnreadCount(merged.filter(n => !n.isRead).length);
        return merged;
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
        title: 'Payments',
        icon: CreditCard,
        path: '/payments',
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
        <DashboardSidebar 
          navigationItems={navigationItems} 
          pendingApprovals={pendingApprovals}
          profile={profile}
          location={location}
        />

        {/* Main Content */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-14 md:h-16 items-center justify-between border-b px-3 md:px-6 sticky top-0 z-10 backdrop-blur-sm bg-background/95">
            <div className="flex items-center space-x-2 md:space-x-4">
              <SidebarTrigger className="md:hidden h-10 w-10 touch-target hover:bg-sidebar-accent transition-colors" />
              <h1 className="font-semibold text-base md:text-lg truncate">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-1 md:space-x-3">
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 md:h-10 md:w-10 touch-target hover:bg-accent transition-colors"
                asChild
              >
                <Link to="/notifications">
                  <Bell className="h-4 w-4 md:h-5 md:w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 p-0 text-xs flex items-center justify-center animate-pulse"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 md:h-10 md:w-10 rounded-full touch-target hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8 md:h-8 md:w-8">
                      <AvatarFallback className="text-xs md:text-sm bg-primary text-primary-foreground">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 md:w-56 mr-2 md:mr-0" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {profile?.role ? getRoleDisplayName(profile.role) : 'Loading...'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center touch-target">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive touch-target"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-2 sm:p-3 lg:p-6 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

// Separate component for sidebar with mobile handling
const DashboardSidebar: React.FC<{
  navigationItems: any[];
  pendingApprovals: number;
  profile: any;
  location: any;
}> = ({ navigationItems, pendingApprovals, profile, location }) => {
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      // Add a small delay for better UX
      setTimeout(() => {
        setOpenMobile(false);
      }, 150);
    }
  };

  return (
    <Sidebar className="border-r transition-all duration-300 ease-in-out">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center space-x-2 px-3 md:px-4 py-3 md:py-4">
          <div className="bg-primary text-primary-foreground p-1.5 md:p-2 rounded-lg shadow-sm">
            <Scissors className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <ShoppingBag className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <div className="flex flex-col">
            <span className="font-bold text-sm md:text-base">A1 Billing</span>
            <span className="text-xs text-muted-foreground">Tailoring Solution</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive} className="transition-all duration-200 hover:bg-sidebar-accent rounded-lg mx-1">
                  <Link 
                    to={item.path} 
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg group"
                    onClick={handleNavClick}
                  >
                    <item.icon className="h-4 w-4 transition-colors group-hover:text-sidebar-primary" />
                    <span className="text-sm font-medium transition-colors group-hover:text-sidebar-primary">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        
        {/* Status Management Section */}
        <div className="mt-6 px-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Order Management
          </h3>
          
          <SidebarMenuButton asChild className="w-full justify-between mb-2 transition-all duration-200 hover:bg-sidebar-accent rounded-lg mx-1">
            <Link 
              to="/order-status" 
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg group"
              onClick={handleNavClick}
            >
              <div className="flex items-center space-x-3">
                <Package className="h-4 w-4 transition-colors group-hover:text-sidebar-primary" />
                <span className="text-sm font-medium transition-colors group-hover:text-sidebar-primary">Order Status</span>
              </div>
              {pendingApprovals > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 text-xs animate-pulse shadow-sm">
                  {pendingApprovals}
                </Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </div>

        {/* Mobile User Info */}
        {isMobile && profile && (
          <div className="mt-auto border-t border-sidebar-border pt-4 px-2">
            <div className="flex items-center space-x-3 px-3 py-2 bg-sidebar-accent rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {profile?.full_name ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default DashboardLayout;