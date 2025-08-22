// SMS/WhatsApp Integration Service
export interface NotificationTemplate {
  type: 'bill_receipt' | 'delivery_reminder' | 'order_status' | 'measurement_ready';
  subject: string;
  message: string;
}

export interface CustomerNotification {
  id: string;
  customer_id: string;
  order_id?: string;
  invoice_id?: string;
  type: NotificationTemplate['type'];
  channel: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  created_at: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private baseUrl = process.env.REACT_APP_NOTIFICATION_API_URL || '';
  private apiKey = process.env.REACT_APP_NOTIFICATION_API_KEY || '';

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // SMS Templates
  private getTemplate(type: NotificationTemplate['type'], data: any): NotificationTemplate {
    const templates: Record<NotificationTemplate['type'], NotificationTemplate> = {
      bill_receipt: {
        type: 'bill_receipt',
        subject: 'Bill Receipt - Tailor Bill Buddy',
        message: `Dear ${data.customerName},

Your bill receipt for Invoice #${data.invoiceNumber}:
Total Amount: ₹${data.totalAmount}
Date: ${data.date}

Items:
${data.items.map((item: any) => `• ${item.description} - ₹${item.total_price}`).join('\n')}

Thank you for your business!
- Tailor Bill Buddy`
      },
      delivery_reminder: {
        type: 'delivery_reminder',
        subject: 'Delivery Ready - Tailor Bill Buddy',
        message: `Dear ${data.customerName},

Your order #${data.orderNumber} is ready for pickup!

Items ready:
${data.items.map((item: any) => `• ${item.description}`).join('\n')}

Please visit our shop at your convenience.
Contact: ${data.shopContact}

- Tailor Bill Buddy`
      },
      order_status: {
        type: 'order_status',
        subject: 'Order Status Update - Tailor Bill Buddy',
        message: `Dear ${data.customerName},

Order #${data.orderNumber} status updated to: ${data.status.toUpperCase()}

${data.status === 'in_progress' ? 'Your order is being worked on by our skilled tailors.' : 
  data.status === 'ready' ? 'Your order is ready for pickup!' : 
  data.status === 'delivered' ? 'Order successfully delivered. Thank you!' : 
  'Order details updated.'}

Expected delivery: ${data.dueDate || 'To be confirmed'}

- Tailor Bill Buddy`
      },
      measurement_ready: {
        type: 'measurement_ready',
        subject: 'Measurements Recorded - Tailor Bill Buddy',
        message: `Dear ${data.customerName},

Your measurements for ${data.clothingType} have been successfully recorded.

You can now place orders based on these measurements.
Visit us or call ${data.shopContact} to place your order.

- Tailor Bill Buddy`
      }
    };

    return templates[type];
  }

  // Send SMS via third-party service (Twilio, TextLocal, etc.)
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Example using a generic SMS API
      const response = await fetch(`${this.baseUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          from: 'TailorBuddy'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  // Send WhatsApp message via WhatsApp Business API
  async sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Example using WhatsApp Business API
      const response = await fetch(`${this.baseUrl}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          type: 'text',
          text: { body: message }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return false;
    }
  }

  // Send bill receipt to customer
  async sendBillReceipt(customer: any, invoice: any, channel: 'sms' | 'whatsapp' = 'sms'): Promise<boolean> {
    const template = this.getTemplate('bill_receipt', {
      customerName: customer.name,
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount.toFixed(2),
      date: new Date(invoice.created_at).toLocaleDateString(),
      items: invoice.items
    });

    const phoneNumber = customer.mobile.startsWith('+') ? customer.mobile : `+91${customer.mobile}`;
    
    if (channel === 'whatsapp') {
      return await this.sendWhatsApp(phoneNumber, template.message);
    } else {
      return await this.sendSMS(phoneNumber, template.message);
    }
  }

  // Send delivery reminder
  async sendDeliveryReminder(customer: any, order: any, channel: 'sms' | 'whatsapp' = 'sms'): Promise<boolean> {
    const template = this.getTemplate('delivery_reminder', {
      customerName: customer.name,
      orderNumber: order.order_number,
      items: order.items || [],
      shopContact: process.env.REACT_APP_SHOP_CONTACT || '+91-XXXXXXXXXX'
    });

    const phoneNumber = customer.mobile.startsWith('+') ? customer.mobile : `+91${customer.mobile}`;
    
    if (channel === 'whatsapp') {
      return await this.sendWhatsApp(phoneNumber, template.message);
    } else {
      return await this.sendSMS(phoneNumber, template.message);
    }
  }

  // Send order status update
  async sendOrderStatusUpdate(customer: any, order: any, channel: 'sms' | 'whatsapp' = 'sms'): Promise<boolean> {
    const template = this.getTemplate('order_status', {
      customerName: customer.name,
      orderNumber: order.order_number,
      status: order.status,
      dueDate: order.due_date ? new Date(order.due_date).toLocaleDateString() : null
    });

    const phoneNumber = customer.mobile.startsWith('+') ? customer.mobile : `+91${customer.mobile}`;
    
    if (channel === 'whatsapp') {
      return await this.sendWhatsApp(phoneNumber, template.message);
    } else {
      return await this.sendSMS(phoneNumber, template.message);
    }
  }

  // Send measurement confirmation
  async sendMeasurementConfirmation(customer: any, measurement: any, channel: 'sms' | 'whatsapp' = 'sms'): Promise<boolean> {
    const template = this.getTemplate('measurement_ready', {
      customerName: customer.name,
      clothingType: measurement.clothing_type,
      shopContact: process.env.REACT_APP_SHOP_CONTACT || '+91-XXXXXXXXXX'
    });

    const phoneNumber = customer.mobile.startsWith('+') ? customer.mobile : `+91${customer.mobile}`;
    
    if (channel === 'whatsapp') {
      return await this.sendWhatsApp(phoneNumber, template.message);
    } else {
      return await this.sendSMS(phoneNumber, template.message);
    }
  }
}

export default NotificationService;
