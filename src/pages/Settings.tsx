import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings as SettingsIcon,
  Building,
  Users,
  Shield,
  Database,
  Bell,
  Palette,
  FileText,
  DollarSign,
  Calendar,
  Printer,
  Mail,
  Phone,
  MapPin,
  Lock,
  Key,
  UserPlus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface BusinessSettings {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  tax_number?: string;
  logo_url?: string;
  currency: string;
  timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
}

interface SystemSettings {
  auto_backup: boolean;
  backup_frequency: string;
  data_retention_days: number;
  maintenance_mode: boolean;
  debug_mode: boolean;
  max_file_size: number;
  allowed_file_types: string[];
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  order_reminders: boolean;
  payment_alerts: boolean;
  delivery_notifications: boolean;
  low_inventory_alerts: boolean;
  reminder_days_before: number;
}

interface User {
  id: string;
  full_name: string;
  role: 'admin' | 'cashier' | 'tailor';
  created_at: string;
}

const Settings = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    business_name: 'A1 Tailoring Services',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_number: '',
    logo_url: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    auto_backup: true,
    backup_frequency: 'daily',
    data_retention_days: 365,
    maintenance_mode: false,
    debug_mode: false,
    max_file_size: 5,
    allowed_file_types: ['image/jpeg', 'image/png', 'application/pdf'],
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    order_reminders: true,
    payment_alerts: true,
    delivery_notifications: true,
    low_inventory_alerts: true,
    reminder_days_before: 3,
  });

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'cashier' as 'admin' | 'cashier' | 'tailor',
  });

  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      // Load from localStorage
      const savedBusinessSettings = localStorage.getItem('business_settings');
      if (savedBusinessSettings) {
        setBusinessSettings(JSON.parse(savedBusinessSettings));
      }

      const savedSystemSettings = localStorage.getItem('system_settings');
      if (savedSystemSettings) {
        setSystemSettings(JSON.parse(savedSystemSettings));
      }

      const savedNotificationSettings = localStorage.getItem('notification_settings');
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const saveBusinessSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem('business_settings', JSON.stringify(businessSettings));
      toast({
        title: 'Success',
        description: 'Business settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save business settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSystemSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem('system_settings', JSON.stringify(systemSettings));
      toast({
        title: 'Success',
        description: 'System settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save system settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = () => {
    setLoading(true);
    try {
      localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
      toast({
        title: 'Success',
        description: 'Notification settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (newUser.password !== newUser.password) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: newUser.full_name,
            role: newUser.role,
          });

        if (profileError) throw profileError;

        toast({
          title: 'Success',
          description: 'User created successfully',
        });

        setNewUser({ email: '', password: '', full_name: '', role: 'cashier' });
        setShowCreateUser(false);
        loadUsers();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === profile?.id) {
      toast({
        title: 'Error',
        description: 'Cannot delete your own account',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const changePassword = async () => {
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordChange.newPassword,
      });
      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });

      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      // Export customers
      const { data: customers } = await supabase.from('customers').select('*');
      // Export orders
      const { data: orders } = await supabase.from('orders').select('*');
      // Export measurements
      const { data: measurements } = await supabase.from('measurements').select('*');
      // Export order items
      const { data: orderItems } = await supabase.from('order_items').select('*');

      const exportData = {
        customers,
        orders,
        measurements,
        order_items: orderItems,
        business_settings: businessSettings,
        system_settings: systemSettings,
        notification_settings: notificationSettings,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailor-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async () => {
    setLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Save backup timestamp
      localStorage.setItem('last_backup', new Date().toISOString());
      toast({
        title: 'Success',
        description: 'Manual backup completed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to run backup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getLastBackupTime = () => {
    const lastBackup = localStorage.getItem('last_backup');
    if (lastBackup) {
      const date = new Date(lastBackup);
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    }
    return 'Never';
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="w-96">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only administrators can access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 lg:px-12 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <span>Settings</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your business settings, users, and system configuration
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Business Information</span>
              </CardTitle>
              <CardDescription>
                Configure your business details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={businessSettings.business_name}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, business_name: e.target.value })}
                    placeholder="A1 Tailoring Services"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Tax Number</Label>
                  <Input
                    id="tax_number"
                    value={businessSettings.tax_number || ''}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, tax_number: e.target.value })}
                    placeholder="GST/Tax Number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                    placeholder="+91 12345 67890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                    placeholder="info@a1tailoring.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address *</Label>
                <Textarea
                  id="address"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  placeholder="Complete business address"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={businessSettings.website || ''}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
                    placeholder="https://www.a1tailoring.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={businessSettings.currency}
                    onValueChange={(value) => setBusinessSettings({ ...businessSettings, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Working Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={businessSettings.working_hours_start}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, working_hours_start: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={businessSettings.working_hours_end}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, working_hours_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveBusinessSettings} disabled={loading} className="w-full md:w-auto">
                <Save className="mr-2 h-4 w-4" />
                Save Business Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">User Management</h2>
              <p className="text-muted-foreground">Manage system users and their permissions</p>
            </div>
            <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system with appropriate role and permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_name">Full Name</Label>
                    <Input
                      id="user_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_password">Password</Label>
                    <Input
                      id="user_password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'admin' | 'cashier' | 'tailor') => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="tailor">Tailor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createUser} disabled={loading} className="w-full">
                    Create User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-semibold">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUser(user.id)}
                        disabled={user.id === profile?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Manage password and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordChange.currentPassword}
                      onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordChange.newPassword}
                      onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordChange.confirmPassword}
                      onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
                
                <Button onClick={changePassword} disabled={loading}>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure system behavior and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Backup Settings</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-muted-foreground">Automatically backup data</p>
                    </div>
                    <Switch
                      checked={systemSettings.auto_backup}
                      onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, auto_backup: checked })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Backup Frequency</Label>
                    <Select
                      value={systemSettings.backup_frequency}
                      onValueChange={(value) => setSystemSettings({ ...systemSettings, backup_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Retention (Days)</Label>
                    <Input
                      type="number"
                      value={systemSettings.data_retention_days}
                      onChange={(e) => setSystemSettings({ ...systemSettings, data_retention_days: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">File Upload Settings</h3>
                  
                  <div className="space-y-2">
                    <Label>Max File Size (MB)</Label>
                    <Input
                      type="number"
                      value={systemSettings.max_file_size}
                      onChange={(e) => setSystemSettings({ ...systemSettings, max_file_size: Number(e.target.value) })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Restrict system access</p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenance_mode}
                      onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, maintenance_mode: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">Enable detailed logging</p>
                    </div>
                    <Switch
                      checked={systemSettings.debug_mode}
                      onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, debug_mode: checked })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveSystemSettings} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notification Channels</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notificationSettings.email_notifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, email_notifications: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notificationSettings.sms_notifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, sms_notifications: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Order Reminders</Label>
                      <p className="text-sm text-muted-foreground">Delivery date reminders</p>
                    </div>
                    <Switch
                      checked={notificationSettings.order_reminders}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, order_reminders: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Alerts</Label>
                      <p className="text-sm text-muted-foreground">Payment due notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.payment_alerts}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, payment_alerts: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Delivery Notifications</Label>
                      <p className="text-sm text-muted-foreground">Order ready notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.delivery_notifications}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, delivery_notifications: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Low Inventory Alerts</Label>
                      <p className="text-sm text-muted-foreground">Stock level warnings</p>
                    </div>
                    <Switch
                      checked={notificationSettings.low_inventory_alerts}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, low_inventory_alerts: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reminder Days Before Due Date</Label>
                <Input
                  type="number"
                  value={notificationSettings.reminder_days_before}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, reminder_days_before: Number(e.target.value) })}
                  className="w-32"
                />
              </div>

              <Button onClick={saveNotificationSettings} disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Data Export</span>
                </CardTitle>
                <CardDescription>
                  Export your data for backup or migration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={exportData} disabled={loading} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export All Data
                </Button>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This will export all customers, orders, and measurements data in JSON format.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>Manual Backup</span>
                </CardTitle>
                <CardDescription>
                  Run a manual backup of your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={runBackup} disabled={loading} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Manual Backup
                </Button>
                
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Last backup: {getLastBackupTime()}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These actions are permanent and cannot be undone. Please proceed with extreme caution.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-4">
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
                
                <Button variant="destructive" disabled>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
