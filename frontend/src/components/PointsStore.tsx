'use client';

import { useState, useEffect } from 'react';
import { points } from '@/lib/api';

interface PointsPackage {
  id: string;
  name: string;
  points_amount: number;
  price_usd: number;
  bonus_points: number;
  total_points: number;
}

export default function PointsStore({ token }: { token?: string }) {
  const [packages, setPackages] = useState<PointsPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    try {
      const res = await points.list();
      setPackages(res.data.packages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(pkg: PointsPackage) {
    if (!token) {
      alert('Please sign in first');
      return;
    }

    setPurchasing(pkg.id);
    setError(null);

    try {
      const res = await points.createOrder(token, pkg.id);
      if (res.data.approveUrl) {
        window.location.href = res.data.approveUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasing(null);
    }
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Buy Points</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-amber-500/30 transition-all"
          >
            {pkg.name === '500 Points' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold text-center py-1">
                MOST POPULAR
              </div>
            )}

            <div className="p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mb-3">
                  <span className="text-2xl">🪙</span>
                </div>
                <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
              </div>

              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Base</span>
                  <span className="text-white">{pkg.points_amount.toLocaleString()}</span>
                </div>
                {pkg.bonus_points > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Bonus</span>
                    <span>+{pkg.bonus_points.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-white/10 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-amber-400">{pkg.total_points.toLocaleString()}</span>
                </div>
              </div>

              <div className="text-center mb-4">
                <span className="text-2xl font-bold text-white">${pkg.price_usd}</span>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={purchasing === pkg.id}
                className={`w-full py-2 rounded-xl font-semibold transition-all text-sm ${
                  purchasing === pkg.id
                    ? 'bg-amber-500/50 text-white/50'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                }`}
              >
                {purchasing === pkg.id ? 'Processing...' : 'Buy Now'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
