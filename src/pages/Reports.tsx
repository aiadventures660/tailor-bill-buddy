import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingCard, LoadingTable, LoadingStats, LoadingButton } from '@/components/ui/loading';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  Users,
  ShoppingCart,
  Package,
  Receipt,
  IndianRupee,
  PieChart
} from 'lucide-react';

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  readyMadeSales: number;
  stitchingSales: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  topCustomers: Array<{
    name: string;
    mobile: string;
    totalSpent: number;
    orderCount: number;
  }>;
  salesByCategory: Array<{
    category: string;
    count: number;
    total: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
}

const Reports = () => {
  const { profile } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setIsStatsLoading(true);
    try {
      // Fetch orders with related data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, mobile),
          order_items (*),
          payments (amount)
        `)
        .gte('created_at', `${dateRange.startDate}T00:00:00`)
        .lte('created_at', `${dateRange.endDate}T23:59:59`);

      if (ordersError) throw ordersError;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      // Fetch ready made items for category analysis
      const { data: readyMadeData, error: readyMadeError } = await supabase
        .from('ready_made_items')
        .select('*');

      if (readyMadeError) throw readyMadeError;

      // Process the data
      const orders = ordersData || [];
      const customers = customersData || [];

      const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const totalOrders = orders.length;
      const totalCustomers = customers.length;

      // Calculate ready-made vs stitching sales
      let readyMadeSales = 0;
      let stitchingSales = 0;

      orders.forEach(order => {
        (order.order_items || []).forEach((item: any) => {
          if (item.item_type === 'ready_made') {
            readyMadeSales += item.total_price || 0;
          } else if (item.item_type === 'stitching') {
            stitchingSales += item.total_price || 0;
          }
        });
      });

      const pendingOrders = orders.filter(order => order.status === 'pending').length;
      const completedOrders = orders.filter(order => order.status === 'delivered').length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Top customers analysis
      const customerMap = new Map();
      orders.forEach(order => {
        const customerId = order.customer_id;
        const customerInfo = order.customers;
        
        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId);
          existing.totalSpent += order.total_amount || 0;
          existing.orderCount += 1;
        } else {
          customerMap.set(customerId, {
            name: customerInfo?.name || 'Unknown',
            mobile: customerInfo?.mobile || 'N/A',
            totalSpent: order.total_amount || 0,
            orderCount: 1
          });
        }
      });

      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Sales by category (for ready-made items)
      const categoryMap = new Map();
      orders.forEach(order => {
        (order.order_items || []).forEach((item: any) => {
          if (item.item_type === 'ready_made') {
            // Try to find the category from ready_made_items
            const readyMadeItem = readyMadeData?.find(rmi => rmi.id === item.ready_made_item_id);
            const category = readyMadeItem?.category || 'Unknown';
            
            if (categoryMap.has(category)) {
              const existing = categoryMap.get(category);
              existing.count += item.quantity || 1;
              existing.total += item.total_price || 0;
            } else {
              categoryMap.set(category, {
                category,
                count: item.quantity || 1,
                total: item.total_price || 0
              });
            }
          }
        });
      });

      const salesByCategory = Array.from(categoryMap.values())
        .sort((a, b) => b.total - a.total);

      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });

        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          sales: monthOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
          orders: monthOrders.length
        });
      }

      setReportData({
        totalSales,
        totalOrders,
        totalCustomers,
        readyMadeSales,
        stitchingSales,
        pendingOrders,
        completedOrders,
        averageOrderValue,
        topCustomers,
        salesByCategory,
        monthlyTrends
      });

    } catch (error: any) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
      setIsStatsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['A1 Billing Software - Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Date Range:', `${dateRange.startDate} to ${dateRange.endDate}`],
      [''],
      ['Summary'],
      ['Total Sales', formatCurrency(reportData.totalSales)],
      ['Total Orders', reportData.totalOrders.toString()],
      ['Total Customers', reportData.totalCustomers.toString()],
      ['Average Order Value', formatCurrency(reportData.averageOrderValue)],
      [''],
      ['Sales Breakdown'],
      ['Ready-made Sales', formatCurrency(reportData.readyMadeSales)],
      ['Stitching Sales', formatCurrency(reportData.stitchingSales)],
      [''],
      ['Order Status'],
      ['Pending Orders', reportData.pendingOrders.toString()],
      ['Completed Orders', reportData.completedOrders.toString()],
      [''],
      ['Top Customers'],
      ['Name', 'Mobile', 'Total Spent', 'Order Count'],
      ...reportData.topCustomers.map(customer => [
        customer.name,
        customer.mobile,
        formatCurrency(customer.totalSpent),
        customer.orderCount.toString()
      ])
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `A1-Report-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span>Reports & Analytics</span>
          </h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
        
        <Button onClick={exportReport} disabled={!reportData}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Date Range and Report Type */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="sales">Sales Analysis</SelectItem>
                  <SelectItem value="customers">Customer Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Overview Stats */}
          {isStatsLoading ? (
            <LoadingStats count={4} className="mb-6" />
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    Period revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    Orders processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.averageOrderValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per order average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">
                    Total registered
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sales Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Sales by Type</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span>Ready-made Sales</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(reportData.readyMadeSales)}</div>
                    <div className="text-sm text-muted-foreground">
                      {reportData.totalSales > 0 
                        ? ((reportData.readyMadeSales / reportData.totalSales) * 100).toFixed(1)
                        : 0
                      }%
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Receipt className="h-4 w-4 text-green-600" />
                    <span>Stitching Sales</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(reportData.stitchingSales)}</div>
                    <div className="text-sm text-muted-foreground">
                      {reportData.totalSales > 0 
                        ? ((reportData.stitchingSales / reportData.totalSales) * 100).toFixed(1)
                        : 0
                      }%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Completed Orders</span>
                  </div>
                  <Badge variant="default">
                    {reportData.completedOrders}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    <span>Pending Orders</span>
                  </div>
                  <Badge variant="secondary">
                    {reportData.pendingOrders}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  Completion Rate: {
                    reportData.totalOrders > 0 
                      ? ((reportData.completedOrders / reportData.totalOrders) * 100).toFixed(1)
                      : 0
                  }%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Customers */}
          {reportData.topCustomers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>
                  Customers with highest total spending in the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topCustomers.map((customer, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.mobile}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(customer.totalSpent)}</div>
                        <div className="text-sm text-muted-foreground">{customer.orderCount} orders</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sales by Category */}
          {reportData.salesByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ready-made Sales by Category</CardTitle>
                <CardDescription>
                  Performance breakdown by product categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.salesByCategory.map((category, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{category.category}</div>
                        <div className="text-sm text-muted-foreground">{category.count} items sold</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(category.total)}</div>
                        <div className="text-sm text-muted-foreground">
                          {reportData.totalSales > 0 
                            ? ((category.total / reportData.totalSales) * 100).toFixed(1)
                            : 0
                          }% of total
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>6-Month Trend</CardTitle>
              <CardDescription>
                Sales and order trends over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.monthlyTrends.map((month, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{month.month}</div>
                      <div className="text-sm text-muted-foreground">{month.orders} orders</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(month.sales)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;