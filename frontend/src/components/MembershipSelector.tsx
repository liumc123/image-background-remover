'use client';

import { useState, useEffect, useCallback } from 'react';

interface MembershipLevel {
  id: string;
  name: string;
  level_value: number;
  price_usd: number;
  benefits: string[];
  duration_days: number;
  bonus_points: number;
  userHasActive: boolean;
  userMembershipExpiresAt: string | null;
}

export default function MembershipSelector() {
  const [memberships, setMemberships] = useState<MembershipLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/memberships', { headers });
      if (!res.ok) throw new Error('Failed to fetch memberships');

      const data = await res.json();
      setMemberships(data.data.levels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const handlePurchase = async (membershipId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Please sign in first');
      return;
    }

    setPurchasing(membershipId);
    setError(null);

    try {
      const res = await fetch('/api/memberships/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ membership_id: membershipId })
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

  const getTierColor = (level: number) => {
    switch (level) {
      case 1: return 'from-amber-700 to-amber-600'; // Bronze
      case 2: return 'from-gray-400 to-gray-300';   // Silver
      case 3: return 'from-yellow-500 to-amber-400'; // Gold
      case 5: return 'from-violet-600 to-purple-500'; // VIP
      default: return 'from-gray-600 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
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
        <h2 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-white/60">Unlock premium features and boost your productivity</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {memberships.map((membership) => (
          <div
            key={membership.id}
            className={`relative bg-white/5 backdrop-blur-xl rounded-2xl border ${
              membership.userHasActive 
                ? 'border-green-500/50' 
                : 'border-white/10'
            } overflow-hidden transition-transform hover:scale-[1.02]`}
          >
            {/* Active Badge */}
            {membership.userHasActive && (
              <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center text-xs font-bold py-1">
                CURRENT PLAN
              </div>
            )}

            {/* Header */}
            <div className={`p-6 bg-gradient-to-br ${getTierColor(membership.level_value)}`}>
              <h3 className="text-xl font-bold text-white">{membership.name}</h3>
              <div className="mt-3">
                <span className="text-4xl font-bold text-white">${membership.price_usd}</span>
                <span className="text-white/70 text-sm">/{membership.duration_days} days</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {membership.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/80 text-sm">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {benefit}
                  </li>
                ))}
                {membership.bonus_points > 0 && (
                  <li className="flex items-start gap-2 text-amber-400 text-sm">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    +{membership.bonus_points} welcome points
                  </li>
                )}
              </ul>

              {/* Expiry info */}
              {membership.userHasActive && membership.userMembershipExpiresAt && (
                <p className="text-xs text-green-400 text-center mb-4">
                  Renews {new Date(membership.userMembershipExpiresAt).toLocaleDateString()}
                </p>
              )}

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchase(membership.id)}
                disabled={purchasing === membership.id || membership.userHasActive}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  membership.userHasActive
                    ? 'bg-green-500/20 text-green-400 cursor-default'
                    : purchasing === membership.id
                    ? 'bg-violet-500/50 text-white/50 cursor-wait'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                }`}
              >
                {purchasing === membership.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : membership.userHasActive ? (
                  'Current Plan'
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ or info */}
      <div className="mt-12 text-center">
        <p className="text-white/50 text-sm">
          All plans include full access to background removal features.
          <br />
          Cancel anytime. Secure payment via PayPal.
        </p>
      </div>
    </div>
  );
}
