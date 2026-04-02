// =====================================================
// Database Types for rmbg-176
// =====================================================

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
  created_at: string;
  updated_at: string;
}

export interface AccountBinding {
  id: string;
  user_id: string;
  provider: 'google' | 'apple' | 'wechat';
  provider_user_id: string;
  created_at: string;
}

export interface MembershipLevel {
  id: string;
  name: string;
  level_value: number;
  price_usd: number;
  benefits: string[];  // JSON parsed
  duration_days: number;
  bonus_points: number;
  is_active: boolean;
  created_at: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  membership_id: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  // Joined fields
  membership?: MembershipLevel;
}

export interface PointsPackage {
  id: string;
  name: string;
  points_amount: number;
  price_usd: number;
  bonus_points: number;
  is_active: boolean;
  created_at: string;
}

export type PointTransactionType = 'purchase' | 'refund' | 'redeem' | 'reward' | 'manual';

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  type: PointTransactionType;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export type PayPalOrderType = 'membership' | 'points';
export type PayPalOrderStatus = 'CREATED' | 'APPROVED' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | 'CANCELLED';

export interface PayPalOrder {
  id: string;
  user_id: string;
  paypal_order_id: string;
  type: PayPalOrderType;
  reference_id: string;
  amount_usd: number;
  status: PayPalOrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// =====================================================
// API Response Types
// =====================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  bindings: AccountBinding[];
  currentMembership: UserMembership | null;
}

export interface MembershipWithDetails extends MembershipLevel {
  userHasActive: boolean;
  userMembershipExpiresAt: string | null;
}

export interface PointTransactionWithMeta extends PointTransaction {
  meta?: {
    packageName?: string;
    membershipName?: string;
  };
}
