import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Bell, 
  Settings, 
  Users, 
  Mail,
  Smartphone,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import NotificationService from '@/services/NotificationService';

interface NotificationSettings {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  auto_send_bill_receipt: boolean;
  auto_send_delivery_reminder: boolean;
  auto_send_status_updates: boolean;
  reminder_days_before_delivery: number;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
}

interface NotificationLog {
  id: string;
  customer_id: string;
  customer: Customer;
  type: string;
  channel: string;
  status: string;
  sent_at: string;
  message: string;
}

const NotificationCenter = () => {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    sms_enabled: true,
    whatsapp_enabled: false,
    email_enabled: false,
    auto_send_bill_receipt: true,
    auto_send_delivery_reminder: true,
    auto_send_status_updates: true,
    reminder_days_before_delivery: 1
  });

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [messageType, setMessageType] = useState<'custom' | 'bill_receipt' | 'delivery_reminder' | 'order_status'>('custom');
  const [customMessage, setCustomMessage] = useState('');
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'email'>('sms');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'logs'>('send');

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    fetchCustomers();
    fetchNotificationLogs();
    loadSettings();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      // For now, simulate notification logs since we don't have the table yet
      setNotificationLogs([]);
    } catch (error: any) {
      console.error('Error fetching notification logs:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Notification preferences have been updated.",
    });
  };

  const sendBulkNotification = async () => {
    if (selectedCustomers.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select at least one customer.",
        variant: "destructive"
      });
      return;
    }

    if (messageType === 'custom' && !customMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a custom message.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const customerId of selectedCustomers) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) continue;

        let success = false;

        if (messageType === 'custom') {
          const phoneNumber = customer.mobile.startsWith('+') ? customer.mobile : `+91${customer.mobile}`;
          if (channel === 'sms') {
            success = await notificationService.sendSMS(phoneNumber, customMessage);
          } else if (channel === 'whatsapp') {
            success = await notificationService.sendWhatsApp(phoneNumber, customMessage);
          }
        }

        if (success) successCount++;
        else failCount++;
      }

      toast({
        title: "Bulk Notification Sent",
        description: `${successCount} sent successfully, ${failCount} failed.`,
      });

    } catch (error: any) {
      console.error('Error sending bulk notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notifications.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setSelectedCustomers([]);
      setCustomMessage('');
    }
  };

  const sendTestMessage = async () => {
    if (!customMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a test message.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const testNumber = process.env.REACT_APP_TEST_PHONE_NUMBER || '+91XXXXXXXXXX';
      let success = false;

      if (channel === 'sms') {
        success = await notificationService.sendSMS(testNumber, customMessage);
      } else if (channel === 'whatsapp') {
        success = await notificationService.sendWhatsApp(testNumber, customMessage);
      }

      if (success) {
        toast({
          title: "Test Message Sent",
          description: `Test ${channel.toUpperCase()} sent successfully.`,
        });
      } else {
        throw new Error('Failed to send test message');
      }
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: "Failed to send test message. Check your configuration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Center</h1>
          <p className="text-muted-foreground">Send SMS, WhatsApp messages and manage notifications</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={activeTab === 'send' ? 'default' : 'outline'}
            onClick={() => setActiveTab('send')}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Messages
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('logs')}
          >
            <Bell className="w-4 h-4 mr-2" />
            Logs
          </Button>
        </div>
      </div>

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Composition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Compose Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="message-type">Message Type</Label>
                <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Message</SelectItem>
                    <SelectItem value="bill_receipt">Bill Receipt</SelectItem>
                    <SelectItem value="delivery_reminder">Delivery Reminder</SelectItem>
                    <SelectItem value="order_status">Order Status Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="channel">Channel</Label>
                <Select value={channel} onValueChange={(value: any) => setChannel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 mr-2" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {messageType === 'custom' && (
                <div>
                  <Label htmlFor="custom-message">Message</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Enter your message..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={4}
                    maxLength={160}
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    {customMessage.length}/160 characters
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button onClick={sendTestMessage} variant="outline" disabled={loading}>
                  <Phone className="w-4 h-4 mr-2" />
                  Send Test
                </Button>
                <Button 
                  onClick={sendBulkNotification} 
                  disabled={loading || selectedCustomers.length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Sending...' : `Send to ${selectedCustomers.length} customers`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Select Recipients
              </CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={selectAllCustomers}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Badge variant="secondary">
                  {selectedCustomers.length} selected
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomers.includes(customer.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleCustomerSelection(customer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {customer.mobile}
                        </div>
                      </div>
                      {selectedCustomers.includes(customer.id) && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure automatic notifications and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Channels</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>SMS Notifications</span>
                  </div>
                  <Switch
                    checked={settings.sms_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sms_enabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Notifications</span>
                  </div>
                  <Switch
                    checked={settings.whatsapp_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, whatsapp_enabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Notifications</span>
                  </div>
                  <Switch
                    checked={settings.email_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_enabled: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Automatic Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Send bill receipt automatically</span>
                  <Switch
                    checked={settings.auto_send_bill_receipt}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_bill_receipt: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Send delivery reminders</span>
                  <Switch
                    checked={settings.auto_send_delivery_reminder}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_delivery_reminder: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Send order status updates</span>
                  <Switch
                    checked={settings.auto_send_status_updates}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_status_updates: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Timing</h3>
              <div>
                <Label htmlFor="reminder-days">Send delivery reminder (days before due date)</Label>
                <Input
                  id="reminder-days"
                  type="number"
                  min="1"
                  max="7"
                  value={settings.reminder_days_before_delivery}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    reminder_days_before_delivery: parseInt(e.target.value) || 1 
                  }))}
                  className="w-32"
                />
              </div>
            </div>

            <Button onClick={saveSettings}>
              Save Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Notification Logs</span>
              <Button variant="outline" size="sm" onClick={fetchNotificationLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>History of all sent notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No notification logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  notificationLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{log.customer.mobile}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.channel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          log.status === 'delivered' ? 'default' : 
                          log.status === 'sent' ? 'secondary' : 
                          log.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(log.sent_at).toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationCenter;
