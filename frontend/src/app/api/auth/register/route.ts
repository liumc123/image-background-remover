// =====================================================
// POST /api/auth/register
// Create a new user account
// =====================================================

import { hashPassword, generateId, jsonResponse, errorResponse } from '@/lib/auth';
import { createUser, getUserByEmail } from '@/lib/db';

export async function onRequestPost(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    const body = await request.json() as {
      email: string;
      password: string;
      nickname?: string;
    };
    
    // Validate input
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }
    
    if (body.password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }
    
    // Check if user exists
    const existing = await getUserByEmail(db, body.email);
    if (existing) {
      return errorResponse('Email already registered', 409);
    }
    
    // Create user
    const passwordHash = await hashPassword(body.password);
    const userId = generateId('usr');
    
    const user = await createUser(db, {
      id: userId,
      email: body.email,
      password_hash: passwordHash,
      nickname: body.nickname || body.email.split('@')[0]
    });
    
    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        points_balance: user.points_balance
      }
    }, 201);
    
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Internal server error', 500);
  }
}
