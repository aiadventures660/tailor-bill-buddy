-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL CHECK (type IN ('bill_receipt', 'delivery_reminder', 'order_status', 'measurement_ready', 'custom')),
    channel VARCHAR NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    recipient VARCHAR NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    tailor_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tailor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    email_enabled BOOLEAN DEFAULT false,
    auto_send_bill_receipt BOOLEAN DEFAULT true,
    auto_send_delivery_reminder BOOLEAN DEFAULT true,
    auto_send_status_updates BOOLEAN DEFAULT true,
    reminder_days_before_delivery INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tailor_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer_id ON notification_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_notification_logs_updated_at 
    BEFORE UPDATE ON notification_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_logs
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (tailor_id = auth.uid());

CREATE POLICY "Users can insert their own notification logs" ON notification_logs
    FOR INSERT WITH CHECK (tailor_id = auth.uid());

CREATE POLICY "Users can update their own notification logs" ON notification_logs
    FOR UPDATE USING (tailor_id = auth.uid());

-- Create RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (tailor_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (tailor_id = auth.uid());

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (tailor_id = auth.uid());

-- Insert default notification settings for existing users
INSERT INTO notification_settings (tailor_id, sms_enabled, auto_send_bill_receipt, auto_send_delivery_reminder, auto_send_status_updates)
SELECT id, true, true, true, true 
FROM profiles 
WHERE id NOT IN (SELECT tailor_id FROM notification_settings);
