-- =====================================================
-- D1 Database Schema for rmbg-176
-- Image Background Remover + User Membership System
-- =====================================================

-- =====================================================
-- Table: users
-- Core user table with points balance
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,                          -- NULL for OAuth-only users
    nickname TEXT,
    avatar_url TEXT,
    points_balance INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- Table: account_bindings
-- Third-party OAuth bindings (Google, Apple, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS account_bindings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,                       -- 'google', 'apple', 'wechat'
    provider_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_account_bindings_user_id ON account_bindings(user_id);

-- =====================================================
-- Table: membership_levels
-- Available membership tiers with pricing
-- =====================================================
CREATE TABLE IF NOT EXISTS membership_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- 'Bronze', 'Silver', 'Gold', 'VIP'
    level_value INTEGER NOT NULL,                -- 1-10
    price_usd REAL NOT NULL,
    benefits TEXT NOT NULL,                      -- JSON array
    duration_days INTEGER NOT NULL,              -- 30, 90, 365
    bonus_points INTEGER DEFAULT 0,               -- Points granted on purchase
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Table: user_memberships
-- Active memberships for users
-- =====================================================
CREATE TABLE IF NOT EXISTS user_memberships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    membership_id TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (membership_id) REFERENCES membership_levels(id)
);

CREATE INDEX idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX idx_user_memberships_expires_at ON user_memberships(expires_at);

-- =====================================================
-- Table: points_packages
-- Available points packages for purchase
-- =====================================================
CREATE TABLE IF NOT EXISTS points_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                          -- '100 Points', '500 Points'
    points_amount INTEGER NOT NULL,
    price_usd REAL NOT NULL,
    bonus_points INTEGER DEFAULT 0,               -- Bonus for buying
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- Table: point_transactions
-- Points ledger (deposits, deductions, rewards)
-- =====================================================
CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,                     -- Positive = credit, Negative = debit
    balance_after INTEGER NOT NULL,              -- Running balance after transaction
    type TEXT NOT NULL,                           -- 'purchase', 'refund', 'redeem', 'reward', 'manual'
    reference_id TEXT,                            -- PayPal order ID, usage log ID, etc.
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at);

-- =====================================================
-- Table: paypal_orders
-- PayPal order tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS paypal_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    paypal_order_id TEXT NOT NULL,
    type TEXT NOT NULL,                          -- 'membership', 'points'
    reference_id TEXT NOT NULL,                  -- membership_levels.id or points_packages.id
    amount_usd REAL NOT NULL,
    status TEXT NOT NULL,                        -- 'CREATED', 'APPROVED', 'COMPLETED', 'REFUNDED', 'FAILED', 'CANCELLED'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_paypal_orders_paypal_order_id ON paypal_orders(paypal_order_id);
CREATE INDEX idx_paypal_orders_user_id ON paypal_orders(user_id);

-- =====================================================
-- Table: sessions
-- Simple session management for API auth
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- Seed: Default membership levels
-- =====================================================
INSERT OR IGNORE INTO membership_levels (id, name, level_value, price_usd, benefits, duration_days, bonus_points, is_active) VALUES
    ('ml_bronze', 'Bronze', 1, 4.99, '["基础功能", "每月100积分", "标准处理速度"]', 30, 100, 1),
    ('ml_silver', 'Silver', 2, 9.99, '["高级功能", "每月300积分", "优先处理速度", "专属客服"]', 30, 300, 1),
    ('ml_gold', 'Gold', 3, 19.99, '["全部功能", "每月800积分", "极速处理", "专属客服", "优先体验新功能"]', 30, 800, 1),
    ('ml_vip', 'VIP', 5, 49.99, '["永久VIP", "无限积分获取", "极速处理", "专属客服", "全部功能"]', 365, 2000, 1);

-- =====================================================
-- Seed: Default points packages
-- =====================================================
INSERT OR IGNORE INTO points_packages (id, name, points_amount, price_usd, bonus_points, is_active) VALUES
    ('pp_100', '100 Points', 100, 0.99, 0, 1),
    ('pp_500', '500 Points', 500, 4.49, 50, 1),
    ('pp_1000', '1000 Points', 1000, 7.99, 150, 1),
    ('pp_5000', '5000 Points', 5000, 34.99, 1000, 1);
