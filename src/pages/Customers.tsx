import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner, LoadingStats, LoadingTable, LoadingPage, LoadingButton } from '@/components/ui/loading';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, Eye, Calendar, ShoppingBag, Ruler, ArrowRight, Filter, Grid3X3, List, MoreVertical, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  created_at: string;
}

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setIsStatsLoading(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch customers',
          variant: 'destructive',
        });
        return;
      }

      setCustomers(data || []);
      
      // Fetch customer statistics
      if (data?.length) {
        await fetchCustomerStats(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  };

  const fetchCustomerStats = async (customerList: Customer[]) => {
    const stats: Record<string, CustomerStats> = {};
    
    for (const customer of customerList) {
      try {
        // Fetch orders for this customer
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, created_at')
          .eq('customer_id', customer.id);

        if (orders) {
          stats[customer.id] = {
            totalOrders: orders.length,
            totalSpent: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
            lastOrderDate: orders.length > 0 ? orders[0].created_at : undefined,
          };
        } else {
          stats[customer.id] = {
            totalOrders: 0,
            totalSpent: 0,
          };
        }
      } catch (error) {
        console.error(`Error fetching stats for customer ${customer.id}:`, error);
        stats[customer.id] = {
          totalOrders: 0,
          totalSpent: 0,
        };
      }
    }
    
    setCustomerStats(stats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Customer updated successfully',
          variant: 'success',
        });
      } else {
        // Add new customer
        const { error } = await supabase
          .from('customers')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Customer added successfully',
          variant: 'success',
        });
      }

      // Reset form and refresh list
      setFormData({ name: '', mobile: '', email: '', address: '' });
      setIsAddDialogOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save customer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      // Check for associated orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customer.id);

      if (ordersError) throw ordersError;

      // Check for associated measurements
      const { data: measurements, error: measurementsError } = await supabase
        .from('measurements')
        .select('id')
        .eq('customer_id', customer.id);

      if (measurementsError) throw measurementsError;

      const totalAssociations = (orders?.length || 0) + (measurements?.length || 0);

      if (totalAssociations > 0) {
        const associations = [];
        if (orders?.length) associations.push(`${orders.length} order(s)`);
        if (measurements?.length) associations.push(`${measurements.length} measurement(s)`);

        toast({
          title: 'Cannot Delete Customer',
          description: `This customer has ${associations.join(' and ')}. Please delete these records first before deleting the customer.`,
          variant: 'destructive',
        });
        return;
      }

      // If no associations, proceed with deletion
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
        variant: 'success',
      });

      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      
      // Handle specific database constraint errors
      if (error.code === '23503') {
        toast({
          title: 'Cannot Delete Customer',
          description: 'This customer has associated records. Please remove those first.',
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete customer',
          variant: 'destructive',
        });
      }
    }
  };

  const handleView = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email || '',
      address: customer.address || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', mobile: '', email: '', address: '' });
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingCustomer(null);
  };

  const getCustomerInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCustomerTypeLabel = (stats: CustomerStats) => {
    if (stats.totalOrders === 0) return { label: 'New', color: 'bg-blue-100 text-blue-800' };
    if (stats.totalOrders >= 10) return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
    if (stats.totalOrders >= 5) return { label: 'Loyal', color: 'bg-green-100 text-green-800' };
    return { label: 'Regular', color: 'bg-gray-100 text-gray-800' };
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.mobile.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterType === 'all') return matchesSearch;
    
    const stats = customerStats[customer.id];
    if (!stats) return matchesSearch;
    
    const customerType = getCustomerTypeLabel(stats);
    return matchesSearch && customerType.label.toLowerCase() === filterType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const startIndex = (currentPage - 1) * customersPerPage;
  const endIndex = startIndex + customersPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
  <div className="w-full pl-4 pr-2 sm:pl-8 sm:pr-4 lg:pl-12 lg:pr-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 flex items-center space-x-3">
                <div className="p-3 bg-gray-900 rounded-xl">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <span>Customer Management</span>
              </h1>
              <p className="text-gray-600 text-lg">
                Manage your customer database with advanced analytics and insights
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{customers.length} Total Customers</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>{filteredCustomers.length} Showing</span>
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Dialog 
                open={isAddDialogOpen} 
                onOpenChange={(open) => {
                  if (!open) {
                    handleCloseDialog();
                  } else {
                    setIsAddDialogOpen(true);
                  }
                }}
              >
                <DialogTrigger asChild>
                  {/* Quick Add Customer button removed as requested */}
                </DialogTrigger>
              </Dialog>
              
              <Button 
                onClick={() => navigate('/customers/new')} 
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Customer Account
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6">
              <Label className="text-gray-700 font-medium mb-2 block">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by name, mobile, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900 text-base py-3"
                />
              </div>
            </div>
            
            <div className="lg:col-span-3">
              <Label className="text-gray-700 font-medium mb-2 block">Filter by Type</Label>
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-gray-900 focus:ring-gray-900 bg-white"
                >
                  <option value="all">All Customers</option>
                  <option value="new">New Customers</option>
                  <option value="regular">Regular Customers</option>
                  <option value="loyal">Loyal Customers</option>
                  <option value="vip">VIP Customers</option>
                </select>
              </div>
            </div>

            <div className="lg:col-span-3">
              <Label className="text-gray-700 font-medium mb-2 block">View Mode</Label>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer List/Grid */}
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border-0 p-12 text-center backdrop-blur-sm bg-white/90">
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">No customers found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {customers.length === 0 
                    ? "Get started by adding your first customer to build your customer database" 
                    : "Try adjusting your search terms or filters to find the customers you're looking for"
                  }
                </p>
                {customers.length === 0 && (
                  <Button 
                    onClick={() => navigate('/customers/new')}
                    className="bg-gray-900 hover:bg-gray-800 text-white mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Customer
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Customer Grid/List */}
              {isLoading ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-white rounded-xl shadow-lg border p-6 space-y-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-24"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          </div>
                          <div className="flex justify-between">
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <LoadingTable rows={6} columns={4} />
                )
              ) : (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                  : "space-y-4"
                }>
                {currentCustomers.map((customer, index) => {
                const stats = customerStats[customer.id] || { totalOrders: 0, totalSpent: 0 };
                const customerType = getCustomerTypeLabel(stats);
                
                return (
                  <div
                    key={customer.id}
                    className={`group bg-white rounded-xl shadow-lg border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm bg-white/90 ${
                      viewMode === 'list' ? 'p-4' : 'p-6'
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.5s ease-out forwards'
                    }}
                  >
                    <div className={`${viewMode === 'list' ? 'flex items-center space-x-4' : 'space-y-4'}`}>
                      {/* Avatar and Basic Info */}
                      <div className={`${viewMode === 'list' ? 'flex-shrink-0' : 'flex items-start justify-between'}`}>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12 border-2 border-gray-200 group-hover:border-gray-900 transition-colors">
                            <AvatarFallback className="bg-gray-900 text-white font-bold">
                              {getCustomerInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                              {customer.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Customer since {new Date(customer.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        {viewMode === 'grid' && (
                          <div className="flex items-center space-x-2">
                            <Badge className={`${customerType.color} text-xs font-medium px-2 py-1`}>
                              {customerType.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleView(customer)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Customer
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/measurements', { state: { customerId: customer.id } })}>
                                  <Ruler className="h-4 w-4 mr-2" />
                                  Measurements
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Customer
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete {customer.name}'s record. Note: Customers with existing orders cannot be deleted until those orders are removed first.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDelete(customer)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete Customer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className={`${viewMode === 'list' ? 'flex-1 grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-3'}`}>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{customer.mobile}</span>
                          </div>
                          
                          {customer.email && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700 truncate">{customer.email}</span>
                            </div>
                          )}
                          
                          {customer.address && (
                            <div className="flex items-start space-x-2 text-sm">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700 line-clamp-2">{customer.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Statistics */}
                        {viewMode === 'grid' && (
                          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
                              <div className="text-xs text-gray-500">Orders</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">₹{stats.totalSpent}</div>
                              <div className="text-xs text-gray-500">Total Spent</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {stats.lastOrderDate ? new Date(stats.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                              </div>
                              <div className="text-xs text-gray-500">Last Order</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons for List View */}
                      {viewMode === 'list' && (
                        <div className="flex items-center space-x-2">
                          <Badge className={`${customerType.color} text-xs font-medium px-2 py-1`}>
                            {customerType.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(customer)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate('/measurements', { state: { customerId: customer.id } })}>
                                <Ruler className="h-4 w-4 mr-2" />
                                Measurements
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {customer.name}? This action cannot be undone. Note: Customers with existing orders cannot be deleted until those orders are removed first.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(customer)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 bg-white rounded-xl shadow-lg border-0 p-6 backdrop-blur-sm bg-white/90">
                  {/* Results Info */}
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center space-x-2">
                    {/* First Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="hidden sm:flex border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    {/* Previous Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((page, index) => (
                        <div key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-2 text-gray-400">...</span>
                          ) : (
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className={currentPage === page 
                                ? "bg-gray-900 text-white" 
                                : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
                      className="hidden sm:flex border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Customer Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingCustomer ? 'Update customer information below' : 'Enter customer details to add to your database'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter customer's full name"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-gray-700 font-medium">Mobile Number *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Enter mobile number"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-700 font-medium">Address (Optional)</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter customer address"
                    className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <LoadingButton 
                  type="submit" 
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </LoadingButton>
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="border-gray-300 text-gray-700 hover:bg-gray-50" disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Customer Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            {viewingCustomer && (
              <>
                <DialogHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 border-2 border-gray-200">
                      <AvatarFallback className="bg-gray-900 text-white text-xl font-bold">
                        {getCustomerInitials(viewingCustomer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-gray-900">
                        {viewingCustomer.name}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600">
                        Customer since {new Date(viewingCustomer.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Customer Statistics */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">
                        {customerStats[viewingCustomer.id]?.totalOrders || 0}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span>Total Orders</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        ₹{customerStats[viewingCustomer.id]?.totalSpent || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Spent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {customerStats[viewingCustomer.id]?.lastOrderDate 
                          ? new Date(customerStats[viewingCustomer.id].lastOrderDate!).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Last Order</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-sm">Mobile Number</Label>
                        <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{viewingCustomer.mobile}</span>
                        </div>
                      </div>
                      
                      {viewingCustomer.email && (
                        <div className="space-y-2">
                          <Label className="text-gray-600 text-sm">Email Address</Label>
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{viewingCustomer.email}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {viewingCustomer.address && (
                      <div className="space-y-2">
                        <Label className="text-gray-600 text-sm">Address</Label>
                        <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="font-medium">{viewingCustomer.address}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                    <Button 
                      onClick={() => {
                        handleCloseViewDialog();
                        handleEdit(viewingCustomer);
                      }}
                      variant="outline"
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit Customer
                    </Button>
                    <Button 
                      onClick={() => {
                        handleCloseViewDialog();
                        navigate('/measurements', { state: { customerId: viewingCustomer.id } });
                      }}
                      variant="outline"
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Ruler className="mr-2 h-4 w-4" />
                      Measurements
                    </Button>
                    <Button 
                      onClick={() => {
                        handleCloseViewDialog();
                        navigate('/orders', { state: { customerId: viewingCustomer.id } });
                      }}
                      className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View Orders
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Customers;