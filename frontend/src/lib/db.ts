// =====================================================
// D1 Database Utility
// Wraps Cloudflare D1 for type-safe queries
// =====================================================

import type { D1Database } from '@cloudflare/workers-types';

// Extend the runtime binding type
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

// =====================================================
// Query Helpers
// =====================================================

export async function getUserById(db: D1Database, id: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?').bind(id);
  const result = await stmt.first();
  return result as any;
}

export async function getUserByEmail(db: D1Database, email: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?').bind(email);
  const result = await stmt.first();
  return result as any;
}

export async function createUser(db: D1Database, data: {
  id: string;
  email: string;
  password_hash?: string;
  nickname?: string;
  avatar_url?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, nickname, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `).bind(data.id, data.email, data.password_hash || null, data.nickname || null, data.avatar_url || null);
  
  await stmt.run();
  return getUserById(db, data.id);
}

export async function updateUser(db: D1Database, id: string, data: {
  nickname?: string;
  avatar_url?: string;
}) {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.nickname !== undefined) {
    updates.push('nickname = ?');
    values.push(data.nickname);
  }
  if (data.avatar_url !== undefined) {
    updates.push('avatar_url = ?');
    values.push(data.avatar_url);
  }
  
  if (updates.length === 0) return getUserById(db, id);
  
  updates.push("updated_at = datetime('now')");
  values.push(id);
  
  const stmt = db.prepare(`
    UPDATE users SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values);
  
  await stmt.run();
  return getUserById(db, id);
}

export async function updateUserPoints(db: D1Database, userId: string, amount: number) {
  // Use a transaction to ensure atomicity
  const user = await getUserById(db, userId);
  if (!user) throw new Error('User not found');
  
  const newBalance = user.points_balance + amount;
  if (newBalance < 0) throw new Error('Insufficient points');
  
  const stmt = db.prepare(`
    UPDATE users SET points_balance = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(newBalance, userId);
  
  await stmt.run();
  return newBalance;
}

// =====================================================
// Account Bindings
// =====================================================

export async function getBindingsByUserId(db: D1Database, userId: string) {
  const stmt = db.prepare('SELECT * FROM account_bindings WHERE user_id = ?').bind(userId);
  const result = await stmt.all();
  return result.results as any[];
}

export async function createBinding(db: D1Database, data: {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO account_bindings (id, user_id, provider, provider_user_id)
    VALUES (?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.provider, data.provider_user_id);
  
  await stmt.run();
  return stmt;
}

export async function getBindingByProvider(db: D1Database, provider: string, providerUserId: string) {
  const stmt = db.prepare(`
    SELECT * FROM account_bindings WHERE provider = ? AND provider_user_id = ?
  `).bind(provider, providerUserId);
  
  return await stmt.first() as any;
}

// =====================================================
// Membership
// =====================================================

export async function getMembershipLevels(db: D1Database) {
  const stmt = db.prepare('SELECT * FROM membership_levels WHERE is_active = 1 ORDER BY level_value ASC');
  const result = await stmt.all();
  return result.results as any[];
}

export async function getMembershipLevel(db: D1Database, id: string) {
  const stmt = db.prepare('SELECT * FROM membership_levels WHERE id = ?').bind(id);
  return await stmt.first() as any;
}

export async function getUserActiveMembership(db: D1Database, userId: string) {
  const stmt = db.prepare(`
    SELECT um.*, ml.name as membership_name, ml.level_value, ml.benefits
    FROM user_memberships um
    JOIN membership_levels ml ON um.membership_id = ml.id
    WHERE um.user_id = ? AND um.is_active = 1 AND um.expires_at > datetime('now')
    ORDER BY ml.level_value DESC
    LIMIT 1
  `).bind(userId);
  
  return await stmt.first() as any;
}

export async function createUserMembership(db: D1Database, data: {
  id: string;
  user_id: string;
  membership_id: string;
  starts_at: string;
  expires_at: string;
}) {
  // First deactivate any existing memberships
  await db.prepare(`
    UPDATE user_memberships SET is_active = 0 WHERE user_id = ? AND membership_id = ?
  `).bind(data.user_id, data.membership_id).run();
  
  const stmt = db.prepare(`
    INSERT INTO user_memberships (id, user_id, membership_id, starts_at, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(data.id, data.user_id, data.membership_id, data.starts_at, data.expires_at);
  
  await stmt.run();
  return stmt;
}

// =====================================================
// Points
// =====================================================

export async function getPointsPackages(db: D1Database) {
  const stmt = db.prepare('SELECT * FROM points_packages WHERE is_active = 1 ORDER BY points_amount ASC');
  const result = await stmt.all();
  return result.results as any[];
}

export async function createPointTransaction(db: D1Database, data: {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  type: string;
  reference_id?: string;
  description?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO point_transactions (id, user_id, amount, balance_after, type, reference_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.id,
    data.user_id,
    data.amount,
    data.balance_after,
    data.type,
    data.reference_id || null,
    data.description || null
  );
  
  await stmt.run();
  return stmt;
}

export async function getPointTransactions(db: D1Database, userId: string, limit = 50, offset = 0) {
  const stmt = db.prepare(`
    SELECT * FROM point_transactions 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `).bind(userId, limit, offset);
  
  const result = await stmt.all();
  return result.results as any[];
}

// =====================================================
// PayPal Orders
// =====================================================

export async function createPayPalOrder(db: D1Database, data: {
  id: string;
  user_id: string;
  paypal_order_id: string;
  type: string;
  reference_id: string;
  amount_usd: number;
  status: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO paypal_orders (id, user_id, paypal_order_id, type, reference_id, amount_usd, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.paypal_order_id, data.type, data.reference_id, data.amount_usd, data.status);
  
  await stmt.run();
  return stmt;
}

export async function getPayPalOrder(db: D1Database, id: string) {
  const stmt = db.prepare('SELECT * FROM paypal_orders WHERE id = ?').bind(id);
  return await stmt.first() as any;
}

export async function getPayPalOrderByExternalId(db: D1Database, paypalOrderId: string) {
  const stmt = db.prepare('SELECT * FROM paypal_orders WHERE paypal_order_id = ?').bind(paypalOrderId);
  return await stmt.first() as any;
}

export async function updatePayPalOrderStatus(db: D1Database, id: string, status: string) {
  const stmt = db.prepare(`
    UPDATE paypal_orders SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(status, id);
  
  await stmt.run();
  return getPayPalOrder(db, id);
}

// =====================================================
// Sessions
// =====================================================

export async function createSession(db: D1Database, data: {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.token, data.expires_at);
  
  await stmt.run();
  return stmt;
}

export async function getSessionByToken(db: D1Database, token: string) {
  const stmt = db.prepare(`
    SELECT s.*, u.email, u.nickname, u.avatar_url, u.points_balance
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token);
  
  return await stmt.first() as any;
}

export async function deleteSession(db: D1Database, token: string) {
  const stmt = db.prepare('DELETE FROM sessions WHERE token = ?').bind(token);
  await stmt.run();
}

export async function cleanExpiredSessions(db: D1Database) {
  const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
  await stmt.run();
}

// =====================================================
// Utility
// =====================================================

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

export function parseJsonField<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
