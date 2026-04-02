// =====================================================
// POST /api/memberships/orders
// Create a PayPal order for membership purchase
// =====================================================

import { verifyAuthToken, generateId, jsonResponse, errorResponse } from '@/lib/auth';
import { getMembershipLevel, createPayPalOrder as createPayPalOrderDb, getUserById } from '@/lib/db';
import { createPayPalOrder } from '@/lib/paypal';

export async function onRequestPost(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 401);
    }
    
    const token = authHeader.substring(7);
    const payload = verifyAuthToken(token, env.AUTH_SECRET || 'default-secret');
    
    if (!payload) {
      return errorResponse('Invalid or expired token', 401);
    }
    
    const body = await request.json() as {
      membership_id: string;
    };
    
    if (!body.membership_id) {
      return errorResponse('Membership ID is required', 400);
    }
    
    // Get membership level
    const membership = await getMembershipLevel(db, body.membership_id);
    if (!membership) {
      return errorResponse('Membership level not found', 404);
    }
    
    if (!membership.is_active) {
      return errorResponse('Membership level is not available', 400);
    }
    
    // Get user
    const user = await getUserById(db, payload.userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      amount: membership.price_usd,
      description: `${membership.name} Membership - ${membership.duration_days} days`,
      referenceId: `membership_${user.id}_${membership.id}`
    });
    
    // Store order in DB
    const orderId = generateId('ord');
    await createPayPalOrderDb(db, {
      id: orderId,
      user_id: user.id,
      paypal_order_id: paypalOrder.orderId,
      type: 'membership',
      reference_id: membership.id,
      amount_usd: membership.price_usd,
      status: 'CREATED'
    });
    
    return jsonResponse({
      orderId: paypalOrder.orderId,
      approveUrl: paypalOrder.approveUrl,
      amount: membership.price_usd,
      membershipName: membership.name
    });
    
  } catch (error) {
    console.error('Create membership order error:', error);
    return errorResponse('Internal server error', 500);
  }
}
