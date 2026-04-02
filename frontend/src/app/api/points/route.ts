// =====================================================
// GET /api/points
// List available points packages
// =====================================================

import { jsonResponse, errorResponse } from '@/lib/auth';
import { getPointsPackages } from '@/lib/db';

export async function onRequestGet(context: { request: Request; env: CloudflareEnv }) {
  try {
    const { env } = context;
    const db = env.DB;
    
    const packages = await getPointsPackages(db);
    
    const formattedPackages = packages.map((pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      points_amount: pkg.points_amount,
      price_usd: pkg.price_usd,
      bonus_points: pkg.bonus_points,
      total_points: pkg.points_amount + pkg.bonus_points,
      isActive: pkg.is_active === 1
    }));
    
    return jsonResponse({ packages: formattedPackages });
    
  } catch (error) {
    console.error('Get points packages error:', error);
    return errorResponse('Internal server error', 500);
  }
}
