'use client';

import { useState, useEffect } from 'react';
import { memberships } from '@/lib/api';

interface Membership {
  id: string;
  name: string;
  price_usd: number;
  duration_days: number;
  benefits: string[];
  bonus_points: number;
  userHasActive: boolean;
}

export default function MembershipSelector({ token }: { token?: string }) {
  const [membershipsList, setMembershipsList] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMemberships();
  }, []);

  async function loadMemberships() {
    try {
      const res = await memberships.list(token);
      setMembershipsList(res.data.levels);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(membership: Membership) {
    if (!token) {
      alert('Please sign in first');
      return;
    }

    setPurchasing(membership.id);
    setError(null);

    try {
      const res = await memberships.createOrder(token, membership.id);
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

  const getTierColor = (level: number) => {
    switch (level) {
      case 1: return 'from-amber-700 to-amber-600';
      case 2: return 'from-gray-400 to-gray-300';
      case 3: return 'from-yellow-500 to-amber-400';
      case 5: return 'from-violet-600 to-purple-500';
      default: return 'from-gray-600 to-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Membership Plans</h2>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {membershipsList.map((membership, i) => (
          <div
            key={membership.id}
            className={`relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden ${
              membership.userHasActive ? 'border-green-500/50' : ''
            }`}
          >
            {membership.userHasActive && (
              <div className="bg-green-500 text-white text-center text-xs font-bold py-1">
                CURRENT PLAN
              </div>
            )}

            <div className={`p-6 bg-gradient-to-br ${getTierColor(i + 1)}`}>
              <h3 className="text-xl font-bold text-white">{membership.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-white">${membership.price_usd}</span>
                <span className="text-white/70 text-sm">/{membership.duration_days} days</span>
              </div>
            </div>

            <div className="p-6">
              <ul className="space-y-2 mb-4">
                {membership.benefits.map((benefit, j) => (
                  <li key={j} className="flex items-start gap-2 text-white/80 text-sm">
                    <span className="text-green-400">✓</span> {benefit}
                  </li>
                ))}
                {membership.bonus_points > 0 && (
                  <li className="text-amber-400 text-sm">
                    <span className="text-amber-400">★</span> +{membership.bonus_points} points
                  </li>
                )}
              </ul>

              <button
                onClick={() => handlePurchase(membership)}
                disabled={purchasing === membership.id || membership.userHasActive}
                className={`w-full py-2 rounded-xl font-semibold transition-all text-sm ${
                  membership.userHasActive
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : purchasing === membership.id
                    ? 'bg-violet-500/50 text-white/50'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                }`}
              >
                {purchasing === membership.id ? 'Processing...' : 
                 membership.userHasActive ? 'Current Plan' : 'Subscribe'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
