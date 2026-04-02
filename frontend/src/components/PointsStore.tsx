'use client';

import { useState, useEffect, useCallback } from 'react';

interface PointsPackage {
  id: string;
  name: string;
  points_amount: number;
  price_usd: number;
  bonus_points: number;
  total_points: number;
}

export default function PointsStore() {
  const [packages, setPackages] = useState<PointsPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/points');
      if (!res.ok) throw new Error('Failed to fetch packages');

      const data = await res.json();
      setPackages(data.data.packages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handlePurchase = async (packageId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Please sign in first');
      return;
    }

    setPurchasing(packageId);
    setError(null);

    try {
      const res = await fetch('/api/points/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ package_id: packageId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }

      const data = await res.json();
      
      // Redirect to PayPal approval URL
      if (data.data.approveUrl) {
        window.location.href = data.data.approveUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Buy Points</h2>
        <p className="text-white/60">Get more points for background removal</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-amber-500/30 transition-all hover:scale-[1.02]"
          >
            {/* Popular badge for middle tier */}
            {pkg.name === '500 Points' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold text-center py-1">
                MOST POPULAR
              </div>
            )}

            <div className="p-6">
              {/* Points display */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 mb-3">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
              </div>

              {/* Points breakdown */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Base points</span>
                  <span className="text-white font-medium">{pkg.points_amount.toLocaleString()}</span>
                </div>
                {pkg.bonus_points > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Bonus</span>
                    <span className="text-green-400 font-medium">+{pkg.bonus_points.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-white/10 mt-3 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-amber-400 font-bold">{pkg.total_points.toLocaleString()}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-4">
                <span className="text-3xl font-bold text-white">${pkg.price_usd}</span>
              </div>

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing === pkg.id}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  purchasing === pkg.id
                    ? 'bg-amber-500/50 text-white/50 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white'
                }`}
              >
                {purchasing === pkg.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-12 text-center">
        <p className="text-white/50 text-sm">
          Points never expire. Use them anytime for background removal.
          <br />
          Secure payment via PayPal.
        </p>
      </div>
    </div>
  );
}
