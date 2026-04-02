// =====================================================
// POST /api/auth/login
// Authenticate user and return token
// =====================================================

import { verifyPassword, createAuthToken, generateId, jsonResponse, errorResponse } from '@/lib/auth';
import { getUserByEmail, createSession } from '@/lib/db';

export async function onRequestPost(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    const body = await request.json() as {
      email: string;
      password: string;
    };
    
    // Validate input
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }
    
    // Find user
    const user = await getUserByEmail(db, body.email);
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }
    
    // Check password
    if (!user.password_hash) {
      return errorResponse('This account uses OAuth. Please sign in with Google.', 401);
    }
    
    const isValid = await verifyPassword(body.password, user.password_hash);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }
    
    // Create session token
    const token = createAuthToken(
      { userId: user.id, email: user.email },
      env.AUTH_SECRET || 'default-secret'
    );
    
    // Store session in DB (optional, for future session revocation)
    const sessionId = generateId('sess');
    await createSession(db, {
      id: sessionId,
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    return jsonResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        points_balance: user.points_balance
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}
