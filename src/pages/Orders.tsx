import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Package,
  Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  assigned_tailor?: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  due_date?: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  notes?: string;
  created_at: string;
  customers: {
    id: string;
    name: string;
    mobile: string;
  };
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock 
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Package 
  },
  ready: { 
    label: 'Ready', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle 
  },
  delivered: { 
    label: 'Delivered', 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: CheckCircle 
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle 
  },
};

const Orders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (id, name, mobile)
        `)
        .order('created_at', { ascending: false });

      // If user is a tailor, only show orders assigned to them
      if (profile?.role === 'tailor') {
        query = query.eq('assigned_tailor', profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus as 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });

      fetchOrders();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const canUpdateStatus = (order: Order) => {
    // Admin and cashier can update any order
    if (profile?.role === 'admin' || profile?.role === 'cashier') {
      return true;
    }
    
    // Tailor can only update orders assigned to them
    if (profile?.role === 'tailor' && profile?.id) {
      return order.assigned_tailor === profile.id;
    }
    
    return false;
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'pending': 'in_progress',
      'in_progress': 'ready', 
      'ready': 'delivered'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers.mobile.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getDaysDifference = (dateString: string) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
            <ShoppingCart className="h-8 w-8 text-primary" />
            <span>Order Management</span>
          </h1>
          <p className="text-muted-foreground">
            Track and manage stitching orders and deliveries
          </p>
        </div>
        
        {(profile?.role === 'admin' || profile?.role === 'cashier') && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        )}
      </div>

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
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground">
                  {orders.length === 0 
                    ? "No orders have been created yet" 
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const statusInfo = statusConfig[order.status];
            const StatusIcon = statusInfo.icon;
            const nextStatus = getNextStatus(order.status);
            const daysUntilDue = order.due_date ? getDaysDifference(order.due_date) : null;
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{order.customers.name} - {order.customers.mobile}</span>
                      </div>
                      
                      {order.due_date && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>
                          {daysUntilDue !== null && (
                            <Badge 
                              variant={daysUntilDue < 0 ? "destructive" : daysUntilDue <= 2 ? "secondary" : "outline"}
                            >
                              {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                               daysUntilDue === 0 ? 'Due today' :
                               `${daysUntilDue} days left`}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {canUpdateStatus(order) && nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                        variant="outline"
                      >
                        Mark as {statusConfig[nextStatus as keyof typeof statusConfig].label}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-semibold text-lg">{formatCurrency(order.total_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Advance Paid</p>
                      <p className="font-medium text-green-600">{formatCurrency(order.advance_amount)}</p>
                    </div>
                    
                    <div>
                      <p className="text-muted-foreground">Balance Due</p>
                      <p className="font-medium text-orange-600">{formatCurrency(order.balance_amount)}</p>
                    </div>
                  </div>
                  
                  {order.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {order.notes}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                    Created on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Orders;