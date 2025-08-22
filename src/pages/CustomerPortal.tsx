import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, 
  Search, 
  Eye, 
  User, 
  Package, 
  Ruler, 
  Calendar,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Truck
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  due_date?: string;
  total_amount: number;
  created_at: string;
  items?: any[];
}

interface Measurement {
  id: string;
  customer_id: string;
  clothing_type: string;
  measurements: any;
  created_at: string;
}

const CustomerPortal = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);

  const searchCustomers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${query}%,mobile.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerData = async (customerId: string) => {
    setLoading(true);
    try {
      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setCustomerOrders(orders || []);

      // Fetch measurements
      const { data: measurements, error: measurementsError } = await supabase
        .from('measurements')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (measurementsError) throw measurementsError;
      setCustomerMeasurements(measurements || []);

    } catch (error: any) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchResults([]);
    setSearchQuery('');
    fetchCustomerData(customer.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'in_progress': return 'secondary';
      case 'ready': return 'default';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Package className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'delivered': return <Truck className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const timer = setTimeout(() => {
        searchCustomers(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground">Online access for customers to view measurements & order status</p>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-primary" />
          <Badge variant="outline">Future-Ready Feature</Badge>
        </div>
      </div>

      {/* Customer Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Customer Lookup
          </CardTitle>
          <CardDescription>
            Search for a customer to view their measurements and order status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary/50"
                  onClick={() => selectCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {customer.mobile}
                      </div>
                    </div>
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details */}
      {selectedCustomer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <div className="text-lg">{selectedCustomer.name}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Mobile</Label>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {selectedCustomer.mobile}
                </div>
              </div>
              {selectedCustomer.email && (
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <div>{selectedCustomer.email}</div>
                </div>
              )}
              {selectedCustomer.address && (
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Orders Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {customerOrders.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {customerOrders.filter(o => o.status === 'delivered').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {customerOrders.filter(o => ['pending', 'in_progress', 'ready'].includes(o.status)).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {customerMeasurements.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Measurements</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="w-4 h-4 mr-2" />
                Generate Customer Portal Link
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Phone className="w-4 h-4 mr-2" />
                Send Status Update
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Appointment
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      {selectedCustomer && customerOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>All orders for {selectedCustomer.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.order_number}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.status)} className="flex items-center w-fit">
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>₹{order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.items?.length || 0} items
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Measurements */}
      {selectedCustomer && customerMeasurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ruler className="w-5 h-5 mr-2" />
              Customer Measurements
            </CardTitle>
            <CardDescription>Saved measurements for {selectedCustomer.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerMeasurements.map((measurement) => (
                <Card key={measurement.id} className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg capitalize">
                      {measurement.clothing_type.replace('_', ' ')}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      Recorded: {new Date(measurement.created_at).toLocaleDateString()}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {Object.entries(measurement.measurements || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace('_', ' ')}:</span>
                          <span className="font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedCustomer && (
        <Card className="text-center py-12">
          <CardContent>
            <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Customer Portal</h3>
            <p className="text-muted-foreground mb-4">
              This feature allows customers to view their measurements and order status online.
            </p>
            <p className="text-sm text-muted-foreground">
              Search for a customer above to preview their portal view.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerPortal;
