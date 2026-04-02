// =====================================================
// GET /api/points/transactions
// Get user's point transaction history
// =====================================================

import { verifyAuthToken, jsonResponse, errorResponse } from '@/lib/auth';
import { getPointTransactions } from '@/lib/db';

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
    
    // Parse query params
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Get transactions
    const transactions = await getPointTransactions(db, payload.userId, limit, offset);
    
    const formattedTransactions = transactions.map((txn: any) => ({
      id: txn.id,
      amount: txn.amount,
      balance_after: txn.balance_after,
      type: txn.type,
      description: txn.description,
      created_at: txn.created_at,
      isPositive: txn.amount > 0
    }));
    
    return jsonResponse({
      transactions: formattedTransactions,
      pagination: {
        limit,
        offset,
        hasMore: transactions.length === limit
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    return errorResponse('Internal server error', 500);
  }
}
