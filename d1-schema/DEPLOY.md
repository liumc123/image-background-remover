# =====================================================
# D1 Database Deployment Guide
# =====================================================

## Prerequisites
- Wrangler CLI installed: `npm install -g wrangler`
- Cloudflare account with D1 enabled

## Step 1: Create D1 Database

```bash
cd ~/project/image-background-remover

# Create a new D1 database
wrangler d1 create rmbg-users

# You'll get a database_id, save it
```

## Step 2: Configure wrangler.toml

Add D1 binding to your frontend's configuration:

```toml
# wrangler.toml (in frontend directory)
name = "rmbg-frontend"
compatibility_date = "2024-01-01"

[env.production]
vars = { NEXTAUTH_URL = "https://rmbg-176.pages.dev" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "rmbg-users"
database_id = "<your-database-id>"
```

## Step 3: Initialize Database Schema

```bash
# Apply schema to local D1 (for development)
wrangler d1 execute rmbg-users --local --file=./d1-schema/schema.sql

# Apply schema to production D1
wrangler d1 execute rmbg-users --remote --file=./d1-schema/schema.sql
```

## Step 4: Configure Environment Variables

In Cloudflare Dashboard → Pages → rmbg-176 → Settings → Environment Variables:

```
AUTH_SECRET = <generate-a-random-string>
PAYPAL_CLIENT_ID = <your-paypal-client-id>
PAYPAL_CLIENT_SECRET = <your-paypal-client-secret>
PAYPAL_WEBHOOK_ID = <your-paypal-webhook-id>
NEXTAUTH_URL = https://rmbg-176.pages.dev
```

## Step 5: Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

## Step 6: PayPal Developer Setup

1. Go to https://developer.paypal.com
2. Create a new app (or use Sandbox app)
3. Get Client ID and Secret
4. Set up Webhook pointing to: `https://rmbg-176.pages.dev/api/webhooks/paypal`

## Step 7: Deploy

```bash
cd frontend
npm run build
# Deploy via GitHub Actions or wrangler pages deploy
```

## Verify Installation

```bash
# Check database tables
wrangler d1 execute rmbg-users --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check seed data
wrangler d1 execute rmbg-users --remote --command="SELECT * FROM membership_levels;"
wrangler d1 execute rmbg-users --remote --command="SELECT * FROM points_packages;"
```

## =====================================================
# Database Schema Reference
# =====================================================

### Tables Created:
- `users` - Core user accounts
- `account_bindings` - OAuth bindings (Google, Apple, etc.)
- `membership_levels` - Available membership tiers
- `user_memberships` - Active user memberships
- `points_packages` - Points purchase options
- `point_transactions` - Points ledger
- `paypal_orders` - PayPal order tracking
- `sessions` - API session tokens

### Seeded Data:
- 4 membership levels: Bronze, Silver, Gold, VIP
- 4 points packages: 100, 500, 1000, 5000 points

## =====================================================
# API Endpoints
# =====================================================

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth

### User Profile
- `GET /api/users/me` - Get profile (auth required)
- `PATCH /api/users/me` - Update profile (auth required)

### Memberships
- `GET /api/memberships` - List membership levels
- `POST /api/memberships/orders` - Create purchase order (auth required)

### Points
- `GET /api/points` - List points packages
- `POST /api/points/orders` - Create purchase order (auth required)
- `GET /api/points/transactions` - Transaction history (auth required)

### Webhooks
- `POST /api/webhooks/paypal` - PayPal payment notifications
