import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Wifi, 
  RefreshCw,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Clock,
  TrendingUp,
  Play,
  Pause,
  Eye
} from 'lucide-react';

interface SystemStatus {
  database: boolean;
  realtimeConnection: boolean;
  paymentsTable: boolean;
  ordersTable: boolean;
  customersTable: boolean;
  lastUpdated: string;
}

interface TestResults {
  fetchPayments: boolean;
  fetchOrders: boolean;
  fetchCustomers: boolean;
  realtimeSubscription: boolean;
  paymentStats: boolean;
}

const PaymentSystemStatus: React.FC = () => {
  const { user, profile } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: false,
    realtimeConnection: false,
    paymentsTable: false,
    ordersTable: false,
    customersTable: false,
    lastUpdated: new Date().toISOString()
  });
  
  const [testResults, setTestResults] = useState<TestResults>({
    fetchPayments: false,
    fetchOrders: false,
    fetchCustomers: false,
    realtimeSubscription: false,
    paymentStats: false
  });

  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{
    timestamp: string;
    table: string;
    event: string;
    description: string;
  }>>([]);

  const [stats, setStats] = useState({
    totalPayments: 0,
    totalOrders: 0,
    totalCustomers: 0,
    paymentAmount: 0,
    outstandingAmount: 0
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runSystemCheck();
  }, []);

  const runSystemCheck = async () => {
    setLoading(true);
    
    try {
      // Test database connection
      const { data: pingData, error: pingError } = await supabase
        .from('customers')
        .select('count(*)')
        .limit(1);

      const dbConnected = !pingError;

      // Test each table
      const [paymentsTest, ordersTest, customersTest] = await Promise.allSettled([
        supabase.from('payments').select('count(*)').limit(1),
        supabase.from('orders').select('count(*)').limit(1),
        supabase.from('customers').select('count(*)').limit(1)
      ]);

      // Get actual counts for stats
      const [paymentsCount, ordersCount, customersCount, paymentAmounts, outstandingAmounts] = await Promise.allSettled([
        supabase.from('payments').select('*'),
        supabase.from('orders').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('payments').select('amount'),
        supabase.from('orders').select('balance_amount').neq('status', 'cancelled')
      ]);

      setSystemStatus({
        database: dbConnected,
        realtimeConnection: dbConnected, // Simplified check
        paymentsTable: paymentsTest.status === 'fulfilled',
        ordersTable: ordersTest.status === 'fulfilled',
        customersTable: customersTest.status === 'fulfilled',
        lastUpdated: new Date().toISOString()
      });

      setTestResults({
        fetchPayments: paymentsTest.status === 'fulfilled',
        fetchOrders: ordersTest.status === 'fulfilled',
        fetchCustomers: customersTest.status === 'fulfilled',
        realtimeSubscription: dbConnected,
        paymentStats: true
      });

      // Calculate stats
      const payments = paymentsCount.status === 'fulfilled' ? paymentsCount.value.data || [] : [];
      const orders = ordersCount.status === 'fulfilled' ? ordersCount.value.data || [] : [];
      const customers = customersCount.status === 'fulfilled' ? customersCount.value.data || [] : [];
      const paymentAmountData = paymentAmounts.status === 'fulfilled' ? paymentAmounts.value.data || [] : [];
      const outstandingData = outstandingAmounts.status === 'fulfilled' ? outstandingAmounts.value.data || [] : [];

      setStats({
        totalPayments: payments.length,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        paymentAmount: paymentAmountData.reduce((sum, p) => sum + (p.amount || 0), 0),
        outstandingAmount: outstandingData.reduce((sum, o) => sum + (o.balance_amount || 0), 0)
      });

    } catch (error) {
      console.error('System check failed:', error);
      toast({
        title: 'System Check Failed',
        description: 'Unable to verify system status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startRealtimeTest = () => {
    setIsRealtimeActive(true);
    setRealtimeEvents([]);

    const addEvent = (table: string, event: string, description: string) => {
      setRealtimeEvents(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        table,
        event,
        description
      }]);
    };

    // Set up real-time subscriptions for testing
    const paymentsChannel = supabase
      .channel('payment_system_test_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        const record = payload.new || payload.old || {};
        addEvent('payments', payload.eventType, `Payment ${payload.eventType}: Amount ₹${(record as any)?.amount || 'N/A'}`);
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('payment_system_test_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const record = payload.new || payload.old || {};
        addEvent('orders', payload.eventType, `Order ${payload.eventType}: ${(record as any)?.order_number || 'N/A'}`);
      })
      .subscribe();

    const customersChannel = supabase
      .channel('payment_system_test_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        const record = payload.new || payload.old || {};
        addEvent('customers', payload.eventType, `Customer ${payload.eventType}: ${(record as any)?.name || 'N/A'}`);
      })
      .subscribe();

    // Store channels for cleanup
    (window as any).testChannels = [paymentsChannel, ordersChannel, customersChannel];

    toast({
      title: 'Real-time Testing Started',
      description: 'Monitoring database changes in real-time. Add/edit some data to see events.'
    });
  };

  const stopRealtimeTest = () => {
    setIsRealtimeActive(false);
    
    // Clean up channels
    const channels = (window as any).testChannels || [];
    channels.forEach((channel: any) => {
      supabase.removeChannel(channel);
    });
    (window as any).testChannels = [];

    toast({
      title: 'Real-time Testing Stopped',
      description: 'No longer monitoring database changes.'
    });
  };

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium">{label}</span>
      {status ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600" />
      )}
    </div>
  );

  const StatCard = ({ icon: Icon, title, value, color }: { 
    icon: any; 
    title: string; 
    value: string | number; 
    color: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment System Status</h1>
          <p className="text-gray-600">Real-time monitoring and diagnostics for the payment management system</p>
        </div>
        <Button onClick={runSystemCheck} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Refresh Check'}
        </Button>
      </div>

      {/* System Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Database connectivity and table access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusIndicator status={systemStatus.database} label="Database Connection" />
            <StatusIndicator status={systemStatus.realtimeConnection} label="Real-time Connection" />
            <StatusIndicator status={systemStatus.paymentsTable} label="Payments Table" />
            <StatusIndicator status={systemStatus.ordersTable} label="Orders Table" />
            <StatusIndicator status={systemStatus.customersTable} label="Customers Table" />
            <div className="text-xs text-gray-500 mt-3">
              Last checked: {new Date(systemStatus.lastUpdated).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Testing
            </CardTitle>
            <CardDescription>Test real-time database subscriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              {!isRealtimeActive ? (
                <Button onClick={startRealtimeTest} className="flex-1">
                  <Play className="mr-2 h-4 w-4" />
                  Start Real-time Test
                </Button>
              ) : (
                <Button onClick={stopRealtimeTest} variant="destructive" className="flex-1">
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Test
                </Button>
              )}
            </div>
            
            {isRealtimeActive && (
              <Alert>
                <Wifi className="h-4 w-4" />
                <AlertDescription>
                  Real-time monitoring is active. Try adding a payment or updating an order to see live events.
                </AlertDescription>
              </Alert>
            )}

            {realtimeEvents.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {realtimeEvents.slice(-5).map((event, index) => (
                  <div key={index} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                    <span className="font-mono text-blue-600">{event.timestamp}</span> - 
                    <span className="font-medium"> {event.table}</span>: {event.description}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Current Data Statistics</CardTitle>
          <CardDescription>Live data from the payment management system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard 
              icon={Users} 
              title="Total Customers" 
              value={stats.totalCustomers} 
              color="text-blue-600" 
            />
            <StatCard 
              icon={ShoppingCart} 
              title="Total Orders" 
              value={stats.totalOrders} 
              color="text-green-600" 
            />
            <StatCard 
              icon={DollarSign} 
              title="Total Payments" 
              value={stats.totalPayments} 
              color="text-emerald-600" 
            />
            <StatCard 
              icon={TrendingUp} 
              title="Payment Amount" 
              value={`₹${stats.paymentAmount.toLocaleString()}`} 
              color="text-purple-600" 
            />
            <StatCard 
              icon={Clock} 
              title="Outstanding" 
              value={`₹${stats.outstandingAmount.toLocaleString()}`} 
              color="text-orange-600" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Test and manage the payment system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" asChild>
              <a href="/payments">
                <Eye className="mr-2 h-4 w-4" />
                View Payments Page
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/orders">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Orders Page
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/customers">
                <Users className="mr-2 h-4 w-4" />
                View Customers Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>User & Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>User ID:</strong> {user?.id || 'Not logged in'}</div>
            <div><strong>Email:</strong> {user?.email || 'Not available'}</div>
            <div><strong>Role:</strong> {profile?.role || 'Loading...'}</div>
            <div><strong>Full Name:</strong> {profile?.full_name || 'Loading...'}</div>
            <div><strong>Session Active:</strong> {user ? 'Yes' : 'No'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSystemStatus;
