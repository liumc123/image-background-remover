// =====================================================
// POST /api/auth/google
// Handle Google OAuth callback / token exchange
// =====================================================

import { createAuthToken, generateId, getGoogleUserInfo, jsonResponse, errorResponse } from '@/lib/auth';
import { getUserByEmail, createUser, createSession, getBindingByProvider, createBinding, getBindingsByUserId, getUserById } from '@/lib/db';

export async function onRequestPost(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { request, env } = context;
    const db = env.DB;
    
    const body = await request.json() as {
      id_token: string;
      access_token?: string;
    };
    
    if (!body.id_token && !body.access_token) {
      return errorResponse('ID token or access token required', 400);
    }
    
    // Verify Google token and get user info
    // In production, verify the token server-side with Google's tokeninfo endpoint
    // For now, we'll decode the JWT (in production, verify signature!)
    let googleUser: any;
    
    if (body.access_token) {
      googleUser = await getGoogleUserInfo(body.access_token);
    } else if (body.id_token) {
      // Decode JWT without verification for demo
      // In production, use google-auth-library to verify
      const payload = JSON.parse(atob(body.id_token.split('.')[1]));
      googleUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified
      };
    }
    
    if (!googleUser || !googleUser.email) {
      return errorResponse('Invalid Google token', 401);
    }
    
    // Check if binding exists
    let binding = await getBindingByProvider(db, 'google', googleUser.sub);
    
    let user: any;
    let isNewUser = false;
    
    if (binding) {
      // Existing user - get user data
      user = await getUserById(db, binding.user_id);
    } else {
      // Check if user exists by email
      user = await getUserByEmail(db, googleUser.email);
      
      if (user) {
        // Link Google account to existing email user
        await createBinding(db, {
          id: generateId('bind'),
          user_id: user.id,
          provider: 'google',
          provider_user_id: googleUser.sub
        });
      } else {
        // Create new user
        user = await createUser(db, {
          id: generateId('usr'),
          email: googleUser.email,
          nickname: googleUser.name,
          avatar_url: googleUser.picture
        });
        
        // Create binding
        await createBinding(db, {
          id: generateId('bind'),
          user_id: user.id,
          provider: 'google',
          provider_user_id: googleUser.sub
        });
        
        isNewUser = true;
      }
    }
    
    // Create session token
    const token = createAuthToken(
      { userId: user.id, email: user.email },
      env.AUTH_SECRET || 'default-secret'
    );
    
    // Store session
    await createSession(db, {
      id: generateId('sess'),
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
      },
      isNewUser
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    return errorResponse('Internal server error', 500);
  }
}
