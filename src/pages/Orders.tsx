import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  User, 
  Clock, 
  CheckCircle, 
  Truck,
  Package,
  Calendar,
  Edit,
  Trash,
  Eye,
  MoreVertical,
  ArrowRight,
  Phone,
  DollarSign,
  TrendingUp,
  Filter,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

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
  updated_at?: string;
  customers: {
    id: string;
    name: string;
    mobile: string;
    email?: string;
  };
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id?: string;
  description: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  clothing_type?: string;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
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
    icon: Clock 
  },
};

const Orders = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form state for order creation/editing
  const [formData, setFormData] = useState({
    customer_id: '',
    due_date: '',
    total_amount: 0,
    advance_amount: 0,
    notes: '',
    status: 'pending',
    delivery_date: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, mobile, email')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (id, name, mobile, email),
          order_items (id, description, item_type, quantity, unit_price, total_price, clothing_type)
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'tailor') {
        query = query.eq('assigned_tailor', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
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

  const createOrder = async () => {
    try {
      setLoading(true);
      
      const orderData = {
        customer_id: formData.customer_id,
        total_amount: formData.total_amount,
        advance_amount: formData.advance_amount,
        balance_amount: formData.total_amount - formData.advance_amount,
        status: formData.status as 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled',
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        order_number: `ORD-${Date.now()}`,
        created_by: profile?.id || '',
      };

      const { error } = await supabase
        .from('orders')
        .insert([orderData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order created successfully',
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchOrders();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async () => {
    try {
      if (!selectedOrder) return;
      setLoading(true);
      
      const updateData = {
        customer_id: formData.customer_id,
        total_amount: formData.total_amount,
        advance_amount: formData.advance_amount,
        balance_amount: formData.total_amount - formData.advance_amount,
        status: formData.status as 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled',
        due_date: formData.due_date || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });

      setIsEditDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async () => {
    try {
      if (!selectedOrder) return;
      setLoading(true);

      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', selectedOrder.id);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      due_date: '',
      total_amount: 0,
      advance_amount: 0,
      notes: '',
      status: 'pending',
      delivery_date: ''
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customers?.mobile?.includes(searchTerm);
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-2">Orders Management</h1>
              <p className="text-slate-600 text-sm sm:text-base">Manage your orders with ease</p>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="sm:hidden">New Order</span>
              <span className="hidden sm:inline">Create Order</span>
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">Total Orders</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">{orders.length}</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">Pending</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                      {orders.filter(order => order.status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">In Progress</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                      {orders.filter(order => order.status === 'in_progress').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                    <Truck className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">Completed</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                      {orders.filter(order => order.status === 'delivered').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 bg-white/50 backdrop-blur-sm text-sm sm:text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 border border-slate-200 rounded-lg bg-white/50 backdrop-blur-sm text-slate-700 text-sm sm:text-base"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white w-full sm:w-auto"
              >
                {viewMode === 'grid' ? (
                  <>
                    <List className="h-4 w-4 mr-2 sm:mr-0" />
                    <span className="sm:hidden">List View</span>
                  </>
                ) : (
                  <>
                    <Grid className="h-4 w-4 mr-2 sm:mr-0" />
                    <span className="sm:hidden">Grid View</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Orders Display */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
              <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-slate-600 mb-2">No Orders Found</h3>
              <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base">Start by creating your first order</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Orders Grid */}
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8" 
              : "space-y-4 mb-8"
            }>
              {currentOrders.map((order, index) => (
              <Card
                key={order.id}
                className="border-0 shadow-lg bg-white/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: 'fadeIn 0.5s ease-out forwards'
                }}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0">
                        <AvatarFallback className="text-slate-700 font-semibold text-sm sm:text-base">
                          {order.customers?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-lg font-semibold text-slate-800 truncate">
                          Order #{order.order_number}
                        </h3>
                        <p className="text-slate-600 text-xs sm:text-sm truncate">
                          {order.customers?.name || 'Unknown Customer'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className="hidden sm:inline">
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="sm:hidden">
                          {order.status === 'in_progress' ? 'PROG' : 
                           order.status === 'delivered' ? 'DONE' :
                           order.status === 'pending' ? 'PEND' :
                           order.status === 'ready' ? 'RDY' : 'CANC'}
                        </span>
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(order);
                            setIsViewDialogOpen(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(order);
                            setFormData({
                              customer_id: order.customer_id,
                              total_amount: order.total_amount,
                              advance_amount: order.advance_amount,
                              status: order.status,
                              due_date: order.due_date || '',
                              delivery_date: order.due_date || '',
                              notes: order.notes || ''
                            });
                            setIsEditDialogOpen(true);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Total:</span>
                      <span className="text-sm sm:text-lg font-bold text-slate-800">₹{order.total_amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Advance:</span>
                      <span className="text-xs sm:text-sm text-green-600 font-medium">₹{order.advance_amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Balance:</span>
                      <span className="text-xs sm:text-sm text-orange-600 font-medium">₹{order.balance_amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Items:</span>
                      <span className="text-xs sm:text-sm text-slate-800">{order.order_items?.length || 0} items</span>
                    </div>
                    {order.due_date && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-slate-600">Due:</span>
                        <span className="text-xs sm:text-sm text-slate-800">
                          {new Date(order.due_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: window.innerWidth > 640 ? 'numeric' : '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-slate-600">Created:</span>
                      <span className="text-xs sm:text-sm text-slate-800">
                        {new Date(order.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: window.innerWidth > 640 ? 'numeric' : '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                {/* Results Info */}
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center space-x-2">
                  {/* First Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="hidden sm:flex"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>

                  {/* Previous Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((page, index) => (
                      <div key={index}>
                        {page === '...' ? (
                          <span className="px-3 py-2 text-slate-400">...</span>
                        ) : (
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className={currentPage === page 
                              ? "bg-slate-900 text-white" 
                              : "hover:bg-slate-100"
                            }
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Next Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Last Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="hidden sm:flex"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Total Amount</label>
                <Input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                  className="mt-1 text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Advance Amount</label>
                <Input
                  type="number"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({...formData, advance_amount: parseFloat(e.target.value) || 0})}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={createOrder} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Total Amount</label>
                <Input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({...formData, total_amount: parseFloat(e.target.value) || 0})}
                  className="mt-1 text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Advance Amount</label>
                <Input
                  type="number"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({...formData, advance_amount: parseFloat(e.target.value) || 0})}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="mt-1 text-sm sm:text-base"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm sm:text-base"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={updateOrder} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Order Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Order Number:</span>
                        <span className="font-medium">#{selectedOrder.order_number}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm sm:text-base">
                        <span className="text-slate-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          selectedOrder.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                          selectedOrder.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                          selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedOrder.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Total Amount:</span>
                        <span className="font-medium">₹{selectedOrder.total_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Advance:</span>
                        <span className="font-medium text-green-600">₹{selectedOrder.advance_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Balance:</span>
                        <span className="font-medium text-orange-600">₹{selectedOrder.balance_amount}</span>
                      </div>
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Created:</span>
                        <span className="font-medium">
                          {new Date(selectedOrder.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedOrder.due_date && (
                        <div className="flex justify-between text-sm sm:text-base">
                          <span className="text-slate-600">Due Date:</span>
                          <span className="font-medium">
                            {new Date(selectedOrder.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Customer Information</h3>
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-slate-200 to-slate-300">
                        <AvatarFallback className="text-slate-700 font-semibold text-sm sm:text-base">
                          {selectedOrder.customers?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-800 text-sm sm:text-base">{selectedOrder.customers?.name || 'Unknown Customer'}</p>
                        <p className="text-slate-600 text-xs sm:text-sm">{selectedOrder.customers?.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-slate-600">Phone:</span>
                        <span className="font-medium">{selectedOrder.customers?.mobile}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Order Items</h3>
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrder.order_items.map((item, index) => (
                      <Card key={index} className="border border-slate-200">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800 text-sm sm:text-base">{item.description}</h4>
                              <p className="text-xs sm:text-sm text-slate-600">
                                Type: {item.item_type} • Quantity: {item.quantity}
                              </p>
                              {item.clothing_type && (
                                <p className="text-xs sm:text-sm text-slate-600">Clothing: {item.clothing_type}</p>
                              )}
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="font-medium text-slate-800 text-sm sm:text-base">₹{item.total_price}</p>
                              <p className="text-xs sm:text-sm text-slate-600">₹{item.unit_price} each</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 text-center py-4 text-sm sm:text-base">No items in this order</p>
                )}
              </div>

              {selectedOrder.notes && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Notes</h3>
                  <p className="text-slate-600 bg-slate-50 p-3 sm:p-4 rounded-lg text-sm sm:text-base">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              This action cannot be undone. This will permanently delete the order
              {selectedOrder && ` #${selectedOrder.order_number}`} and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrder}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Orders;