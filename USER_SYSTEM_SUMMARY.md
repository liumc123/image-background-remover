# =====================================================
# RMBG - 用户体系实施总结
# =====================================================

## 已创建文件结构

```
image-background-remover/
├── d1-schema/
│   ├── schema.sql           # D1 数据库完整 Schema
│   └── DEPLOY.md            # 部署指南
├── frontend/
│   ├── wrangler.toml        # Cloudflare Pages 配置 (D1 binding)
│   ├── .env.local.example   # 环境变量示例
│   └── src/
│       ├── types/
│       │   └── database.ts  # TypeScript 类型定义
│       ├── lib/
│       │   ├── db.ts        # D1 数据库操作封装
│       │   ├── auth.ts      # 认证工具 (密码, Token, JWT)
│       │   └── paypal.ts    # PayPal API 集成
│       ├── components/
│       │   ├── UserProfile.tsx        # 用户资料组件
│       │   ├── MembershipSelector.tsx # 会员选择组件
│       │   ├── PointsStore.tsx        # 积分购买组件
│       │   └── TransactionHistory.tsx # 交易历史组件
│       └── app/api/                  # API Routes
│           ├── auth/
│           │   ├── register/route.ts # 注册
│           │   ├── login/route.ts    # 登录
│           │   └── google/route.ts   # Google OAuth
│           ├── users/me/route.ts     # 用户资料
│           ├── memberships/
│           │   ├── route.ts          # 会员列表
│           │   └── orders/route.ts   # 创建订单
│           ├── points/
│           │   ├── route.ts          # 积分套餐
│           │   ├── orders/route.ts   # 创建订单
│           │   └── transactions/route.ts # 交易历史
│           └── webhooks/
│               └── paypal/route.ts   # PayPal 回调
```

---

## 数据库表 (D1 SQLite)

| 表名 | 说明 |
|------|------|
| `users` | 用户 (邮箱, 密码Hash, 昵称, 头像, 积分余额) |
| `account_bindings` | OAuth 绑定 (Google/Apple/WeChat) |
| `membership_levels` | 会员等级 (Bronze/Silver/Gold/VIP) |
| `user_memberships` | 用户会员关系 |
| `points_packages` | 积分套餐 |
| `point_transactions` | 积分流水 |
| `paypal_orders` | PayPal 订单 |
| `sessions` | 会话管理 |

---

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/google` - Google OAuth

### 用户
- `GET /api/users/me` - 获取资料
- `PATCH /api/users/me` - 更新资料

### 会员
- `GET /api/memberships` - 会员列表
- `POST /api/memberships/orders` - 创建购买订单

### 积分
- `GET /api/points` - 套餐列表
- `POST /api/points/orders` - 创建购买订单
- `GET /api/points/transactions` - 交易历史

### 回调
- `POST /api/webhooks/paypal` - PayPal 支付回调

---

## 前端组件使用示例

```tsx
// 用户资料页
import UserProfile from '@/components/UserProfile';
export default function ProfilePage() {
  return <UserProfile />;
}

// 会员购买页
import MembershipSelector from '@/components/MembershipSelector';
export default function MembershipPage() {
  return <MembershipSelector />;
}

// 积分购买页
import PointsStore from '@/components/PointsStore';
export default function PointsPage() {
  return <PointsStore />;
}

// 交易历史
import TransactionHistory from '@/components/TransactionHistory';
export default function TransactionsPage() {
  return <TransactionHistory />;
}
```

---

## 环境变量配置

### 必需 (通过 wrangler secret 或 Dashboard)
```bash
AUTH_SECRET              # JWT 密钥: openssl rand -base64 32
PAYPAL_CLIENT_ID         # PayPal Client ID
PAYPAL_CLIENT_SECRET     # PayPal Secret
PAYPAL_WEBHOOK_ID        # PayPal Webhook ID
```

### wrangler.toml 中的配置
```toml
[[d1_databases]]
binding = "DB"
database_name = "rmbg-users"
database_id = "<创建 D1 数据库后填入>"
```

---

## 部署步骤

### 1. 创建 D1 数据库
```bash
cd ~/project/image-background-remover
wrangler d1 create rmbg-users
# 记下返回的 database_id
```

### 2. 初始化数据库
```bash
# 本地测试
wrangler d1 execute rmbg-users --local --file=./d1-schema/schema.sql

# 线上
wrangler d1 execute rmbg-users --remote --file=./d1-schema/schema.sql
```

### 3. 更新 wrangler.toml
填入 `database_id`

### 4. 设置环境变量
```bash
wrangler secret put AUTH_SECRET
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_CLIENT_SECRET
wrangler secret put PAYPAL_WEBHOOK_ID
```

### 5. PayPal Webhook 配置
在 PayPal Developer 设置 Webhook URL:
```
https://rmbg-176.pages.dev/api/webhooks/paypal
```
监听事件: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.REFUNDED`

### 6. 部署
```bash
cd frontend
npm run build
# 通过 GitHub Actions 或 wrangler pages deploy
```

---

## 技术栈

- **运行时**: Cloudflare Workers / Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **前端**: Next.js 16 + TypeScript
- **认证**: JWT (HS256) + Google OAuth
- **支付**: PayPal Checkout API
- **样式**: Tailwind CSS
