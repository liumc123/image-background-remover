// =====================================================
// POST /api/points/orders
// Create a PayPal order for points purchase
// =====================================================

import { verifyAuthToken, generateId, jsonResponse, errorResponse } from '@/lib/auth';
import { createPayPalOrder as createPayPalOrderDb, getUserById } from '@/lib/db';
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
      package_id: string;
    };
    
    if (!body.package_id) {
      return errorResponse('Package ID is required', 400);
    }
    
    // Get package
    const stmt = db.prepare('SELECT * FROM points_packages WHERE id = ?').bind(body.package_id);
    const pkg = await stmt.first() as any;
    
    if (!pkg) {
      return errorResponse('Points package not found', 404);
    }
    
    if (!pkg.is_active) {
      return errorResponse('Points package is not available', 400);
    }
    
    // Get user
    const user = await getUserById(db, payload.userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      amount: pkg.price_usd,
      description: `${pkg.name} - ${pkg.points_amount} points${pkg.bonus_points > 0 ? ` + ${pkg.bonus_points} bonus` : ''}`,
      referenceId: `points_${user.id}_${pkg.id}`
    });
    
    // Store order in DB
    const orderId = generateId('ord');
    await createPayPalOrderDb(db, {
      id: orderId,
      user_id: user.id,
      paypal_order_id: paypalOrder.orderId,
      type: 'points',
      reference_id: pkg.id,
      amount_usd: pkg.price_usd,
      status: 'CREATED'
    });
    
    return jsonResponse({
      orderId: paypalOrder.orderId,
      approveUrl: paypalOrder.approveUrl,
      amount: pkg.price_usd,
      packageName: pkg.name,
      pointsAmount: pkg.points_amount,
      bonusPoints: pkg.bonus_points,
      totalPoints: pkg.points_amount + pkg.bonus_points
    });
    
  } catch (error) {
    console.error('Create points order error:', error);
    return errorResponse('Internal server error', 500);
  }
}
