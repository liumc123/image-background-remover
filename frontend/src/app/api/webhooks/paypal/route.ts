// =====================================================
// POST /api/webhooks/paypal
// Handle PayPal webhooks for order completion
// =====================================================

import { generateId, jsonResponse, errorResponse } from '@/lib/auth';
import { 
  getPayPalOrderByExternalId, 
  updatePayPalOrderStatus,
  getMembershipLevel,
  createUserMembership,
  updateUserPoints,
  createPointTransaction,
  getPointsPackages,
  getUserById
} from '@/lib/db';
import { capturePayPalOrder } from '@/lib/paypal';

export async function onRequestPost(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    // Get raw body for signature verification
    const body = await request.text();
    const headers = request.headers;
    
    // Verify webhook signature (in production)
    // const isValid = await verifyPayPalWebhook(body, headers, env.PAYPAL_WEBHOOK_ID);
    // if (!isValid) return errorResponse('Invalid webhook', 401);
    
    const event = JSON.parse(body);
    console.log('PayPal webhook event:', event.event_type);
    
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED': {
        const orderId = event.resource.id;
        
        // Get stored order
        const storedOrder = await getPayPalOrderByExternalId(db, orderId);
        if (!storedOrder) {
          console.log('Order not found:', orderId);
          return jsonResponse({ received: true });
        }
        
        if (storedOrder.status !== 'CREATED') {
          console.log('Order already processed:', storedOrder.status);
          return jsonResponse({ received: true });
        }
        
        // Capture the payment
        const captureResult = await capturePayPalOrder(orderId);
        
        if (captureResult.status === 'COMPLETED') {
          // Update order status
          await updatePayPalOrderStatus(db, storedOrder.id, 'COMPLETED');
          
          // Process based on order type
          if (storedOrder.type === 'membership') {
            await processMembershipPurchase(db, storedOrder.user_id, storedOrder.reference_id);
          } else if (storedOrder.type === 'points') {
            await processPointsPurchase(db, storedOrder.user_id, storedOrder.reference_id);
          }
          
          console.log('Order completed:', orderId);
        } else {
          await updatePayPalOrderStatus(db, storedOrder.id, 'FAILED');
          console.log('Order capture failed:', orderId);
        }
        
        break;
      }
      
      case 'PAYMENT.CAPTURE.REFUNDED': {
        // Handle refunds
        const captureId = event.resource.id;
        console.log('Refund received for capture:', captureId);
        // Find and update the related order
        break;
      }
      
      default:
        console.log('Unhandled event type:', event.event_type);
    }
    
    return jsonResponse({ received: true });
    
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// =====================================================
// Process Membership Purchase
// =====================================================

async function processMembershipPurchase(db: D1Database, userId: string, membershipId: string) {
  // Get membership details
  const membership = await getMembershipLevel(db, membershipId);
  if (!membership) return;
  
  // Calculate expiry
  const startsAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + membership.duration_days * 24 * 60 * 60 * 1000).toISOString();
  
  // Create user membership
  await createUserMembership(db, {
    id: generateId('mem'),
    user_id: userId,
    membership_id: membershipId,
    starts_at: startsAt,
    expires_at: expiresAt
  });
  
  // Grant bonus points if any
  if (membership.bonus_points > 0) {
    const user = await getUserById(db, userId);
    const newBalance = await updateUserPoints(db, userId, membership.bonus_points);
    
    await createPointTransaction(db, {
      id: generateId('txn'),
      user_id: userId,
      amount: membership.bonus_points,
      balance_after: newBalance,
      type: 'reward',
      reference_id: membershipId,
      description: `Welcome bonus for ${membership.name} membership`
    });
  }
  
  console.log(`Membership ${membership.name} activated for user ${userId}`);
}

// =====================================================
// Process Points Purchase
// =====================================================

async function processPointsPurchase(db: D1Database, userId: string, packageId: string) {
  // Get package details
  const stmt = db.prepare('SELECT * FROM points_packages WHERE id = ?').bind(packageId);
  const pkg = await stmt.first() as any;
  if (!pkg) return;
  
  const totalPoints = pkg.points_amount + pkg.bonus_points;
  
  // Update user points
  const newBalance = await updateUserPoints(db, userId, totalPoints);
  
  // Record transaction
  await createPointTransaction(db, {
    id: generateId('txn'),
    user_id: userId,
    amount: totalPoints,
    balance_after: newBalance,
    type: 'purchase',
    reference_id: packageId,
    description: `Purchased ${pkg.name}`
  });
  
  console.log(`Added ${totalPoints} points to user ${userId}`);
}
