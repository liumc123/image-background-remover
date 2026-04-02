// =====================================================
// PayPal Integration
// Creates orders, handles webhooks, captures payments
// =====================================================

export interface PayPalOrderRequest {
  amount: number;
  currency?: string;
  description: string;
  referenceId: string;
}

export interface PayPalOrderResponse {
  orderId: string;
  status: string;
  approveUrl: string;
}

export interface PayPalCaptureResult {
  orderId: string;
  status: 'COMPLETED' | 'FAILED';
  payerId?: string;
  amount?: number;
}

// =====================================================
// PayPal API Base
// =====================================================

const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Use api-m.paypal.com for live
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }
  
  const data = await response.json() as { access_token: string };
  return data.access_token;
}

// =====================================================
// Create PayPal Order
// =====================================================

export async function createPayPalOrder(request: PayPalOrderRequest): Promise<PayPalOrderResponse> {
  const accessToken = await getAccessToken();
  
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: request.referenceId,
      description: request.description,
      amount: {
        currency_code: request.currency || 'USD',
        value: request.amount.toFixed(2)
      }
    }],
    application_context: {
      brand_name: 'RMBG Studio',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: `${process.env.NEXTAUTH_URL || 'https://rmbg-176.pages.dev'}/api/paypal/success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'https://rmbg-176.pages.dev'}/api/paypal/cancel`
    }
  };
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal order: ${error}`);
  }
  
  const order = await response.json() as any;
  
  // Find the approve link
  const approveLink = order.links?.find((link: any) => link.rel === 'approve')?.href;
  
  return {
    orderId: order.id,
    status: order.status,
    approveUrl: approveLink || ''
  };
}

// =====================================================
// Capture PayPal Order (after user approval)
// =====================================================

export async function capturePayPalOrder(orderId: string): Promise<PayPalCaptureResult> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    return {
      orderId,
      status: 'FAILED'
    };
  }
  
  const order = await response.json() as any;
  
  if (order.status === 'COMPLETED') {
    const purchaseUnit = order.purchase_units?.[0];
    const amount = purchaseUnit?.payments?.captures?.[0]?.amount?.value;
    
    return {
      orderId,
      status: 'COMPLETED',
      payerId: order.payer?.payer_id,
      amount: amount ? parseFloat(amount) : undefined
    };
  }
  
  return {
    orderId,
    status: 'FAILED'
  };
}

// =====================================================
// Verify PayPal Webhook Signature
// =====================================================

export async function verifyPayPalWebhook(
  body: string,
  headers: Headers,
  webhookId: string
): Promise<boolean> {
  const accessToken = await getAccessToken();
  
  const payload = {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_id: webhookId,
    webhook_event: JSON.parse(body)
  };
  
  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    return false;
  }
  
  const result = await response.json() as { verification_status: string };
  return result.verification_status === 'SUCCESS';
}

// =====================================================
// Refund PayPal Order
// =====================================================

export async function refundPayPalCapture(captureId: string, amount?: number): Promise<boolean> {
  const accessToken = await getAccessToken();
  
  const payload: any = {
    amount: {
      currency_code: 'USD',
      value: amount?.toFixed(2)
    }
  };
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(amount ? payload : {})
  });
  
  return response.ok;
}

// =====================================================
// Get PayPal Order Details
// =====================================================

export async function getPayPalOrderDetails(orderId: string): Promise<any> {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    return null;
  }
  
  return await response.json();
}
