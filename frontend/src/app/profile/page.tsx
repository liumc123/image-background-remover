'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, user, memberships, points } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
  free_uses_remaining: number;
  currentMembership: {
    id: string;
    name: string;
    level_value: number;
    expires_at: string;
    benefits: string[];
  } | null;
}

interface MembershipLevel {
  id: string;
  name: string;
  price_usd: number;
  benefits: string[];
  duration_days: number;
  bonus_points: number;
  userHasActive: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [membershipsList, setMembershipsList] = useState<MembershipLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const loadData = useCallback(async () => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    
    try {
      const [userRes, memRes] = await Promise.all([
        user.get(stored),
        memberships.list(stored)
      ]);
      setUserData(userRes.data);
      setMembershipsList(memRes.data.levels || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGoogleCallback = async (response: any) => {
    try {
      const res = await auth.google(response.credential);
      if (res.success && res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        loadData();
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  useEffect(() => {
    // @ts-ignore
    window.handleCredentialResponse = handleGoogleCallback;
  }, [loadData]);

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUserData(null);
  };

  const handlePurchase = async (membershipId: string) => {
    if (!token) return;
    setPurchasing(membershipId);
    try {
      const res = await memberships.createOrder(token, membershipId);
      if (res.data.approveUrl) {
        window.location.href = res.data.approveUrl;
      }
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setPurchasing(null);
    }
  };

  const getTierColor = (level: number) => {
    switch (level) {
      case 1: return 'from-amber-700 to-amber-500';
      case 2: return 'from-gray-400 to-gray-300';
      case 3: return 'from-yellow-500 to-amber-400';
      case 5: return 'from-violet-600 to-purple-500';
      default: return 'from-gray-600 to-gray-500';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!token || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12] flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome</h1>
          <p className="text-white/60 mb-6">Sign in to manage your account and subscriptions</p>
          <div id="g_id_onload"
            data-client_id="810081244227-kqvuga30g7g9d34tpqj42klm7m367knk.apps.googleusercontent.com"
            data-context="signin"
            data-ux_mode="popup"
            data-callback="handleCredentialResponse"
            data-auto_prompt="false">
          </div>
          <div className="g_id_signin"
            data-type="standard"
            data-theme="outline"
            data-text="signin_with"
            data-size="large"
            data-logo_alignment="left">
          </div>
        </div>
      </div>
    );
  }

  const hasMembership = userData.currentMembership !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-white">My Account</h1>
          <button
            onClick={handleSignOut}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {userData.avatar_url ? (
              <img src={userData.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-violet-500/30" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white ring-2 ring-violet-500/30">
                {(userData.nickname || userData.email)[0].toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">{userData.nickname || 'New User'}</h2>
              <p className="text-white/50 text-sm">{userData.email}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex gap-2 flex-wrap">
            {hasMembership ? (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-medium">
                {userData.currentMembership?.name} Member
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium">
                Free Plan
              </span>
            )}
            {userData.free_uses_remaining > 0 && !hasMembership && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                {userData.free_uses_remaining} Free Uses Left
              </span>
            )}
          </div>
        </div>

        {/* Membership Card */}
        {hasMembership ? (
          <div className={`bg-gradient-to-br ${getTierColor(userData.currentMembership!.level_value)} rounded-3xl p-6 mb-6 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm">Membership</p>
                  <h3 className="text-2xl font-bold text-white">{userData.currentMembership?.name}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">👑</span>
                </div>
              </div>
              
              <p className="text-white/70 text-sm mb-4">
                Expires: {formatDate(userData.currentMembership!.expires_at)}
              </p>
              
              <div className="space-y-2">
                {userData.currentMembership?.benefits.slice(0, 3).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/90 text-sm">
                    <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⭐</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upgrade Your Experience</h3>
              <p className="text-white/50 text-sm">Get unlimited access and exclusive benefits</p>
            </div>
            
            {!showUpgrade ? (
              <button
                onClick={() => setShowUpgrade(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold transition-all"
              >
                View Plans
              </button>
            ) : (
              <div className="space-y-3">
                {membershipsList.map((membership) => (
                  <div
                    key={membership.id}
                    className={`bg-white/5 rounded-xl p-4 border ${membership.userHasActive ? 'border-green-500/30' : 'border-white/10'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{membership.name}</span>
                      <span className="text-white/70">${membership.price_usd}/{membership.duration_days}d</span>
                    </div>
                    <button
                      onClick={() => handlePurchase(membership.id)}
                      disabled={purchasing === membership.id || membership.userHasActive}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                        membership.userHasActive
                          ? 'bg-green-500/20 text-green-400'
                          : purchasing === membership.id
                          ? 'bg-violet-500/50 text-white/50'
                          : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white'
                      }`}
                    >
                      {membership.userHasActive ? 'Current Plan' : purchasing === membership.id ? 'Processing...' : 'Subscribe'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Points Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-lg">🪙</span>
              </div>
              <div>
                <p className="text-white/50 text-sm">Points Balance</p>
                <p className="text-2xl font-bold text-white">{userData.points_balance.toLocaleString()}</p>
              </div>
            </div>
            <a
              href="/points"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            >
              Buy More
            </a>
          </div>
          <p className="text-white/40 text-xs">
            Use points for additional image processing beyond your membership quota
          </p>
        </div>

        {/* Benefits */}
        {hasMembership && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
            <h3 className="text-white font-semibold mb-4">Your Benefits</h3>
            <div className="space-y-3">
              {userData.currentMembership?.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-white/70 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
