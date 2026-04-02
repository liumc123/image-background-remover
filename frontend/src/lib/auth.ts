// =====================================================
// Authentication Utilities
// Password hashing, session management, token generation
// =====================================================

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// =====================================================
// Password Hashing (bcrypt-like using PBKDF2)
// =====================================================

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha256';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const hash = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    
    const verifyHash = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH);
    
    // Use timing-safe comparison to prevent timing attacks
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(verifyHash, 'hex');
    
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function pbkdf2(password: string, salt: string, iterations: number, length: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const key = createHash(DIGEST)
      .update(salt + password)
      .digest('hex');
    
    // Simplified PBKDF2 - in production use crypto.pbkdf2
    // This is a single round hash for demo; use proper PBKDF2
    let result = key;
    for (let i = 1; i < iterations; i++) {
      result = createHash(DIGEST).update(result + salt + password).digest('hex');
    }
    resolve(result);
  });
}

// =====================================================
// Token Generation
// =====================================================

export function generateToken(length = 64): string {
  return randomBytes(length).toString('hex');
}

export function generateSessionExpiry(days = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// =====================================================
// Simple JWT-like Token (for API auth)
// =====================================================

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export function createAuthToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresInDays = 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInDays * 24 * 60 * 60);
  
  const payloadWithTime = { ...payload, iat: now, exp };
  const payloadEncoded = Buffer.from(JSON.stringify(payloadWithTime)).toString('base64url');
  
  const signature = createHash('sha256')
    .update(`${header}.${payloadEncoded}.${secret}`)
    .digest('base64url');
  
  return `${header}.${payloadEncoded}.${signature}`;
}

export function verifyAuthToken(token: string, secret: string): TokenPayload | null {
  try {
    const [header, payload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = createHash('sha256')
      .update(`${header}.${payload}.${secret}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    // Decode and check expiry
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload;
    
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;
    
    return decoded;
  } catch {
    return null;
  }
}

// =====================================================
// OAuth Helpers
// =====================================================

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// =====================================================
// API Response Helpers
// =====================================================

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// Auth Middleware
// =====================================================

export interface AuthContext {
  user: {
    id: string;
    email: string;
    nickname: string | null;
    avatar_url: string | null;
    points_balance: number;
  };
}

export async function getAuthUser(request: Request, env: CloudflareEnv): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = verifyAuthToken(token, env.AUTH_SECRET || 'default-secret');
  
  if (!payload) {
    return null;
  }
  
  return {
    user: {
      id: payload.userId,
      email: payload.email,
      nickname: null,
      avatar_url: null,
      points_balance: 0
    }
  };
}
