/**
 * RMBG User API - Cloudflare Worker
 * Handles authentication, user profiles, memberships, points, and PayPal integration
 */

// =====================================================
// Constants & Config
// =====================================================

// DB will be set by env in fetch handler
let DB = null;

// =====================================================
// Utility Functions
// =====================================================

function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

function createHash(password, salt) {
  // Simple hash for demo - use PBKDF2 in production
  let hash = salt + password;
  for (let i = 0; i < 1000; i++) {
    hash = btoa(hash);
  }
  return hash;
}

async function hashPassword(password) {
  const salt = Math.random().toString(36).substring(2);
  const hash = createHash(password, salt);
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  return createHash(password, salt) === hash;
}

function createAuthToken(payload, secret, expiresInDays = 7) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInDays * 24 * 60 * 60);
  const payloadWithTime = { ...payload, iat: now, exp };
  const payloadEncoded = btoa(JSON.stringify(payloadWithTime));
  const signature = btoa(`${header}.${payloadEncoded}.${secret}`);
  return `${header}.${payloadEncoded}.${signature}`;
}

function verifyAuthToken(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSig = btoa(`${header}.${payload}.${secret}`);
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function getGoogleUserInfo(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// =====================================================
// PayPal Integration
// =====================================================

const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(clientId, clientSecret) {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

async function createPayPalOrder(amount, description, referenceId, clientId, clientSecret) {
  const accessToken = await getPayPalAccessToken(clientId, clientSecret);
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: referenceId,
        description,
        amount: { currency_code: 'USD', value: amount.toFixed(2) }
      }],
      application_context: {
        brand_name: 'RMBG Studio',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: 'https://rmbg-176.pages.dev/api/paypal/success',
        cancel_url: 'https://rmbg-176.pages.dev/api/paypal/cancel'
      }
    })
  });
  const order = await res.json();
  const approveLink = order.links?.find(l => l.rel === 'approve')?.href;
  return { orderId: order.id, status: order.status, approveUrl: approveLink };
}

async function capturePayPalOrder(orderId, clientId, clientSecret) {
  const accessToken = await getPayPalAccessToken(clientId, clientSecret);
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  });
  const order = await res.json();
  if (order.status === 'COMPLETED') {
    const amount = order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    return { status: 'COMPLETED', amount: amount ? parseFloat(amount) : undefined };
  }
  return { status: 'FAILED' };
}

// =====================================================
// Database Helpers (D1)
// =====================================================

async function dbGet(stmt) {
  const result = await stmt.first();
  return result;
}

async function dbRun(stmt) {
  return await stmt.run();
}

async function getUserById(id) {
  return await dbGet(DB.prepare('SELECT * FROM users WHERE id = ?').bind(id));
}

async function getUserByEmail(email) {
  return await dbGet(DB.prepare('SELECT * FROM users WHERE email = ?').bind(email));
}

async function createUser(data) {
  await DB.prepare(`
    INSERT INTO users (id, email, password_hash, nickname, avatar_url, free_uses_remaining) VALUES (?, ?, ?, ?, ?, 3)
  `).bind(data.id, data.email, data.password_hash || null, data.nickname || null, data.avatar_url || null).run();
  return getUserById(data.id);
}

async function getBindingsByUserId(userId) {
  const result = await DB.prepare('SELECT * FROM account_bindings WHERE user_id = ?').bind(userId).all();
  return result.results;
}

async function createBinding(data) {
  await DB.prepare(`
    INSERT INTO account_bindings (id, user_id, provider, provider_user_id) VALUES (?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.provider, data.provider_user_id).run();
}

async function getBindingByProvider(provider, providerUserId) {
  return await dbGet(DB.prepare(
    'SELECT * FROM account_bindings WHERE provider = ? AND provider_user_id = ?'
  ).bind(provider, providerUserId));
}

async function getMembershipLevels() {
  const result = await DB.prepare('SELECT * FROM membership_levels WHERE is_active = 1 ORDER BY level_value ASC').all();
  return result.results;
}

async function getMembershipLevel(id) {
  return await dbGet(DB.prepare('SELECT * FROM membership_levels WHERE id = ?').bind(id));
}

async function getUserActiveMembership(userId) {
  return await dbGet(DB.prepare(`
    SELECT um.*, ml.name as membership_name, ml.level_value, ml.benefits
    FROM user_memberships um
    JOIN membership_levels ml ON um.membership_id = ml.id
    WHERE um.user_id = ? AND um.is_active = 1 AND um.expires_at > datetime('now')
    ORDER BY ml.level_value DESC LIMIT 1
  `).bind(userId));
}

async function createUserMembership(data) {
  // Deactivate existing
  await DB.prepare(`
    UPDATE user_memberships SET is_active = 0 WHERE user_id = ? AND membership_id = ?
  `).bind(data.user_id, data.membership_id).run();
  
  await DB.prepare(`
    INSERT INTO user_memberships (id, user_id, membership_id, starts_at, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).bind(data.id, data.user_id, data.membership_id, data.starts_at, data.expires_at).run();
}

async function getPointsPackages() {
  const result = await DB.prepare('SELECT * FROM points_packages WHERE is_active = 1 ORDER BY points_amount ASC').all();
  return result.results;
}

async function updateUserPoints(userId, amount) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  const newBalance = user.points_balance + amount;
  if (newBalance < 0) throw new Error('Insufficient points');
  await DB.prepare(`
    UPDATE users SET points_balance = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(newBalance, userId).run();
  return newBalance;
}

async function createPointTransaction(data) {
  await DB.prepare(`
    INSERT INTO point_transactions (id, user_id, amount, balance_after, type, reference_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.amount, data.balance_after, data.type, data.reference_id || null, data.description || null).run();
}

async function getPointTransactions(userId, limit = 50, offset = 0) {
  const result = await DB.prepare(`
    SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).bind(userId, limit, offset).all();
  return result.results;
}

async function createPayPalOrderDb(data) {
  await DB.prepare(`
    INSERT INTO paypal_orders (id, user_id, paypal_order_id, type, reference_id, amount_usd, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.paypal_order_id, data.type, data.reference_id, data.amount_usd, data.status).run();
}

async function getPayPalOrderByExternalId(paypalOrderId) {
  return await dbGet(DB.prepare('SELECT * FROM paypal_orders WHERE paypal_order_id = ?').bind(paypalOrderId));
}

async function updatePayPalOrderStatus(id, status) {
  await DB.prepare(`
    UPDATE paypal_orders SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).bind(status, id).run();
}

async function createSession(data) {
  await DB.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)
  `).bind(data.id, data.user_id, data.token, data.expires_at).run();
}

function parseJsonField(json, fallback) {
  if (!json) return fallback;
  try { return JSON.parse(json); } catch { return fallback; }
}

// =====================================================
// Auth Middleware
// =====================================================

async function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const secret = (request.env?.AUTH_SECRET || 'default-secret');
  return verifyAuthToken(token, secret);
}

// =====================================================
// Request Handlers
// =====================================================

// POST /api/auth/register
async function handleRegister(request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }
    if (body.password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }
    
    const existing = await getUserByEmail(body.email);
    if (existing) {
      return errorResponse('Email already registered', 409);
    }
    
    const passwordHash = await hashPassword(body.password);
    const user = await createUser({
      id: generateId('usr'),
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

// POST /api/auth/login
async function handleLogin(request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) {
      return errorResponse('Email and password are required', 400);
    }
    
    const user = await getUserByEmail(body.email);
    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }
    
    if (!user.password_hash) {
      return errorResponse('This account uses OAuth. Please sign in with Google.', 401);
    }
    
    const isValid = await verifyPassword(body.password, user.password_hash);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }
    
    const token = createAuthToken(
      { userId: user.id, email: user.email },
      request.env?.AUTH_SECRET || 'default-secret'
    );
    
    await createSession({
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
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// POST /api/auth/google
async function handleGoogleAuth(request) {
  try {
    const body = await request.json();
    if (!body.id_token && !body.access_token) {
      return errorResponse('ID token or access token required', 400);
    }
    
    let googleUser;
    if (body.access_token) {
      googleUser = await getGoogleUserInfo(body.access_token);
    } else if (body.id_token) {
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
    
    let binding = await getBindingByProvider('google', googleUser.sub);
    let user;
    let isNewUser = false;
    
    if (binding) {
      user = await getUserById(binding.user_id);
    } else {
      user = await getUserByEmail(googleUser.email);
      if (user) {
        await createBinding({
          id: generateId('bind'),
          user_id: user.id,
          provider: 'google',
          provider_user_id: googleUser.sub
        });
      } else {
        user = await createUser({
          id: generateId('usr'),
          email: googleUser.email,
          nickname: googleUser.name,
          avatar_url: googleUser.picture
        });
        await createBinding({
          id: generateId('bind'),
          user_id: user.id,
          provider: 'google',
          provider_user_id: googleUser.sub
        });
        isNewUser = true;
      }
    }
    
    const token = createAuthToken(
      { userId: user.id, email: user.email },
      request.env?.AUTH_SECRET || 'default-secret'
    );
    
    await createSession({
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

// GET /api/users/me
async function handleGetUser(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const user = await getUserById(auth.userId);
    if (!user) return errorResponse('User not found', 404);
    
    const bindings = await getBindingsByUserId(user.id);
    const membership = await getUserActiveMembership(user.id);
    
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
      free_uses_remaining: user.free_uses_remaining ?? 3,
      bindings: bindings.map(b => ({ id: b.id, provider: b.provider, created_at: b.created_at })),
      currentMembership
    });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// PATCH /api/users/me
async function handleUpdateUser(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const body = await request.json();
    if (body.nickname && (body.nickname.length < 1 || body.nickname.length > 50)) {
      return errorResponse('Nickname must be 1-50 characters', 400);
    }
    
    const updates = [];
    const values = [];
    if (body.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(body.nickname);
    }
    if (body.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(body.avatar_url);
    }
    
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(auth.userId);
      await DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    }
    
    const user = await getUserById(auth.userId);
    return jsonResponse({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      points_balance: user.points_balance
    });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// POST /api/users/me/use-free
async function handleUseFreeUse(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const user = await getUserById(auth.userId);
    if (!user) return errorResponse('User not found', 404);
    
    // Check if user has membership (members don't need free uses)
    const membership = await getUserActiveMembership(user.id);
    if (membership) {
      return jsonResponse({
        success: true,
        data: { allowed: true, reason: 'member', remaining: null }
      });
    }
    
    // Check free uses
    const freeUses = user.free_uses_remaining ?? 3;
    if (freeUses <= 0) {
      return jsonResponse({
        success: true,
        data: { allowed: false, reason: 'no_free_uses', remaining: 0 }
      });
    }
    
    // Decrement free uses
    await DB.prepare(`
      UPDATE users SET free_uses_remaining = free_uses_remaining - 1 WHERE id = ?
    `).bind(auth.userId).run();
    
    return jsonResponse({
      success: true,
      data: { allowed: true, reason: 'free_use', remaining: freeUses - 1 }
    });
  } catch (error) {
    console.error('Use free use error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// GET /api/memberships
async function handleGetMemberships(request) {
  try {
    const levels = await getMembershipLevels();
    let userMembership = null;
    
    const auth = await getAuthUser(request);
    if (auth) {
      userMembership = await getUserActiveMembership(auth.userId);
    }
    
    const formatted = levels.map(level => ({
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
    
    return jsonResponse({ levels: formatted });
  } catch (error) {
    console.error('Get memberships error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// POST /api/memberships/orders
async function handleCreateMembershipOrder(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const body = await request.json();
    if (!body.membership_id) return errorResponse('Membership ID required', 400);
    
    const membership = await getMembershipLevel(body.membership_id);
    if (!membership) return errorResponse('Membership not found', 404);
    if (!membership.is_active) return errorResponse('Membership not available', 400);
    
    const user = await getUserById(auth.userId);
    if (!user) return errorResponse('User not found', 404);
    
    const clientId = request.env?.PAYPAL_CLIENT_ID;
    const clientSecret = request.env?.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return errorResponse('PayPal not configured', 500);
    }
    
    const paypalOrder = await createPayPalOrder(
      membership.price_usd,
      `${membership.name} Membership - ${membership.duration_days} days`,
      `membership_${user.id}_${membership.id}`,
      clientId,
      clientSecret
    );
    
    await createPayPalOrderDb({
      id: generateId('ord'),
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

// GET /api/points
async function handleGetPoints(request) {
  try {
    const packages = await getPointsPackages();
    const formatted = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      points_amount: pkg.points_amount,
      price_usd: pkg.price_usd,
      bonus_points: pkg.bonus_points,
      total_points: pkg.points_amount + pkg.bonus_points,
      isActive: pkg.is_active === 1
    }));
    return jsonResponse({ packages: formatted });
  } catch (error) {
    console.error('Get points error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// POST /api/points/orders
async function handleCreatePointsOrder(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const body = await request.json();
    if (!body.package_id) return errorResponse('Package ID required', 400);
    
    const pkg = await dbGet(DB.prepare('SELECT * FROM points_packages WHERE id = ?').bind(body.package_id));
    if (!pkg) return errorResponse('Package not found', 404);
    if (!pkg.is_active) return errorResponse('Package not available', 400);
    
    const user = await getUserById(auth.userId);
    if (!user) return errorResponse('User not found', 404);
    
    const clientId = request.env?.PAYPAL_CLIENT_ID;
    const clientSecret = request.env?.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return errorResponse('PayPal not configured', 500);
    }
    
    const paypalOrder = await createPayPalOrder(
      pkg.price_usd,
      `${pkg.name} - ${pkg.points_amount} points${pkg.bonus_points > 0 ? ` + ${pkg.bonus_points} bonus` : ''}`,
      `points_${user.id}_${pkg.id}`,
      clientId,
      clientSecret
    );
    
    await createPayPalOrderDb({
      id: generateId('ord'),
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

// GET /api/points/transactions
async function handleGetTransactions(request) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return errorResponse('Unauthorized', 401);
    
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const transactions = await getPointTransactions(auth.userId, limit, offset);
    
    const formatted = transactions.map(txn => ({
      id: txn.id,
      amount: txn.amount,
      balance_after: txn.balance_after,
      type: txn.type,
      description: txn.description,
      created_at: txn.created_at,
      isPositive: txn.amount > 0
    }));
    
    return jsonResponse({
      transactions: formatted,
      pagination: { limit, offset, hasMore: transactions.length === limit }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// POST /api/webhooks/paypal
async function handlePayPalWebhook(request) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);
    console.log('PayPal webhook:', event.event_type);
    
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event.resource.id;
      const storedOrder = await getPayPalOrderByExternalId(orderId);
      
      if (!storedOrder || storedOrder.status !== 'CREATED') {
        return jsonResponse({ received: true });
      }
      
      const clientId = request.env?.PAYPAL_CLIENT_ID;
      const clientSecret = request.env?.PAYPAL_CLIENT_SECRET;
      const captureResult = await capturePayPalOrder(orderId, clientId, clientSecret);
      
      if (captureResult.status === 'COMPLETED') {
        await updatePayPalOrderStatus(storedOrder.id, 'COMPLETED');
        
        if (storedOrder.type === 'membership') {
          const membership = await getMembershipLevel(storedOrder.reference_id);
          if (membership) {
            const startsAt = new Date().toISOString();
            const expiresAt = new Date(Date.now() + membership.duration_days * 24 * 60 * 60 * 1000).toISOString();
            await createUserMembership({
              id: generateId('mem'),
              user_id: storedOrder.user_id,
              membership_id: storedOrder.reference_id,
              starts_at: startsAt,
              expires_at: expiresAt
            });
            if (membership.bonus_points > 0) {
              const newBalance = await updateUserPoints(storedOrder.user_id, membership.bonus_points);
              await createPointTransaction({
                id: generateId('txn'),
                user_id: storedOrder.user_id,
                amount: membership.bonus_points,
                balance_after: newBalance,
                type: 'reward',
                reference_id: storedOrder.reference_id,
                description: `Welcome bonus for ${membership.name}`
              });
            }
          }
        } else if (storedOrder.type === 'points') {
          const pkg = await dbGet(DB.prepare('SELECT * FROM points_packages WHERE id = ?').bind(storedOrder.reference_id));
          if (pkg) {
            const totalPoints = pkg.points_amount + pkg.bonus_points;
            const newBalance = await updateUserPoints(storedOrder.user_id, totalPoints);
            await createPointTransaction({
              id: generateId('txn'),
              user_id: storedOrder.user_id,
              amount: totalPoints,
              balance_after: newBalance,
              type: 'purchase',
              reference_id: storedOrder.reference_id,
              description: `Purchased ${pkg.name}`
            });
          }
        }
      } else {
        await updatePayPalOrderStatus(storedOrder.id, 'FAILED');
      }
    }
    
    return jsonResponse({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// =====================================================
// Router
// =====================================================

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Route matching
  try {
    if (path === '/api/auth/register' && method === 'POST') {
      return handleRegister(request);
    }
    if (path === '/api/auth/login' && method === 'POST') {
      return handleLogin(request);
    }
    if (path === '/api/auth/google' && method === 'POST') {
      return handleGoogleAuth(request);
    }
    if (path === '/api/users/me' && method === 'GET') {
      return handleGetUser(request);
    }
    if (path === '/api/users/me' && method === 'PATCH') {
      return handleUpdateUser(request);
    }
    if (path === '/api/users/me/use-free' && method === 'POST') {
      return handleUseFreeUse(request);
    }
    if (path === '/api/memberships' && method === 'GET') {
      return handleGetMemberships(request);
    }
    if (path === '/api/memberships/orders' && method === 'POST') {
      return handleCreateMembershipOrder(request);
    }
    if (path === '/api/points' && method === 'GET') {
      return handleGetPoints(request);
    }
    if (path === '/api/points/orders' && method === 'POST') {
      return handleCreatePointsOrder(request);
    }
    if (path === '/api/points/transactions' && method === 'GET') {
      return handleGetTransactions(request);
    }
    if (path === '/api/webhooks/paypal' && method === 'POST') {
      return handlePayPalWebhook(request);
    }
    
    return errorResponse('Not found', 404);
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// =====================================================
// Fetch Handler (Cloudflare Worker)
// =====================================================

export default {
  async fetch(request, env, ctx) {
    // Set DB from env
    DB = env.DB;
    
    // Route the request
    const response = await handleRequest(request);
    
    return response;
  }
};
