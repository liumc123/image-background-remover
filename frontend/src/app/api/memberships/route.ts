// =====================================================
// GET /api/memberships
// List all available membership levels
// =====================================================

import { verifyAuthToken, jsonResponse, errorResponse } from '@/lib/auth';
import { getMembershipLevels, getUserActiveMembership, parseJsonField } from '@/lib/db';

export async function onRequestGet(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    // Get all membership levels
    const levels = await getMembershipLevels(db);
    
    // Check if user has active membership (optional auth)
    let userMembership = null;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAuthToken(token, env.AUTH_SECRET || 'default-secret');
      
      if (payload) {
        userMembership = await getUserActiveMembership(db, payload.userId);
      }
    }
    
    const formattedLevels = levels.map((level: any) => ({
      id: level.id,
      name: level.name,
      level_value: level.level_value,
      price_usd: level.price_usd,
      benefits: parseJsonField(level.benefits, []),
      duration_days: level.duration_days,
      bonus_points: level.bonus_points,
      isActive: level.is_active === 1,
      userHasActive: userMembership?.membership_id === level.id,
      userMembershipExpiresAt: userMembership?.membership_id === level.id ? userMembership.expires_at : null
    }));
    
    return jsonResponse({ levels: formattedLevels });
    
  } catch (error) {
    console.error('Get memberships error:', error);
    return errorResponse('Internal server error', 500);
  }
}
