// =====================================================
// GET /api/users/me
// Get current user profile with bindings and membership
// =====================================================

import { verifyAuthToken, jsonResponse, errorResponse } from '@/lib/auth';
import { getUserById, getBindingsByUserId, getUserActiveMembership, getMembershipLevel, parseJsonField } from '@/lib/db';

export async function onRequestGet(context: { request: Request; env: CloudflareEnv }) {
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
    
    // Get user
    const user = await getUserById(db, payload.userId);
    if (!user) {
      return errorResponse('User not found', 404);
    }
    
    // Get bindings
    const bindings = await getBindingsByUserId(db, user.id);
    
    // Get active membership
    const membership = await getUserActiveMembership(db, user.id);
    
    let currentMembership = null;
    if (membership) {
      currentMembership = {
        id: membership.id,
        name: membership.membership_name,
        level_value: membership.level_value,
        benefits: parseJsonField(membership.benefits, []),
        expires_at: membership.expires_at,
        is_active: membership.is_active
      };
    }
    
    return jsonResponse({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      points_balance: user.points_balance,
      bindings: bindings.map((b: any) => ({
        id: b.id,
        provider: b.provider,
        created_at: b.created_at
      })),
      currentMembership
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// =====================================================
// PATCH /api/users/me
// Update user profile (nickname, avatar)
// =====================================================

export async function onRequestPatch(context: { request: Request; env: CloudflareEnv }) {
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
      nickname?: string;
      avatar_url?: string;
    };
    
    // Validate
    if (body.nickname && (body.nickname.length < 1 || body.nickname.length > 50)) {
      return errorResponse('Nickname must be 1-50 characters', 400);
    }
    
    // Update user
    const user = await db
      .prepare(`
        UPDATE users 
        SET nickname = COALESCE(?, nickname),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(body.nickname || null, body.avatar_url || null, payload.userId)
      .run();
    
    if (!user.success) {
      return errorResponse('Failed to update profile', 500);
    }
    
    // Get updated user
    const updatedUser = await getUserById(db, payload.userId);
    
    return jsonResponse({
      id: updatedUser.id,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      avatar_url: updatedUser.avatar_url,
      points_balance: updatedUser.points_balance
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse('Internal server error', 500);
  }
}
