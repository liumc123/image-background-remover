'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth, user, memberships, points } from '@/lib/api';

interface UserData {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
  free_uses_remaining: number;
  total_uses: number;
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
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [membershipsList, setMembershipsList] = useState<MembershipLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Check for payment status in URL
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment) {
      setPaymentStatus(payment);
      // Clean URL after reading
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

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
    // Listen for Google credential event from layout head
    const handleGoogleCredential = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleGoogleCallback(customEvent.detail);
    };
    window.addEventListener('google-credential', handleGoogleCredential);
    return () => window.removeEventListener('google-credential', handleGoogleCredential);
  }, [loadData]);

  const handleSignOut = () => {
    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUserData(null);
    window.location.href = '/';
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

  const getTierStyle = (level: number | undefined) => {
    if (!level) return { bg: 'from-slate-600 to-slate-700', glow: 'shadow-slate-500/20', badge: 'bg-slate-500/20 text-slate-300' };
    switch (level) {
      case 1: return { bg: 'from-amber-700 to-amber-600', glow: 'shadow-amber-500/30', badge: 'bg-amber-500/20 text-amber-300' };
      case 2: return { bg: 'from-gray-400 to-gray-300', glow: 'shadow-gray-400/30', badge: 'bg-gray-400/20 text-gray-200' };
      case 3: return { bg: 'from-yellow-500 to-amber-400', glow: 'shadow-yellow-400/30', badge: 'bg-yellow-500/20 text-yellow-200' };
      case 5: return { bg: 'from-violet-600 to-purple-500', glow: 'shadow-violet-500/40', badge: 'bg-violet-500/20 text-violet-200' };
      default: return { bg: 'from-slate-600 to-slate-700', glow: 'shadow-slate-500/20', badge: 'bg-slate-500/20 text-slate-300' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const now = new Date();
    const exp = new Date(dateStr);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!token || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to RMBG</h1>
          <p className="text-white/50 mb-6">Sign in to access your personal dashboard</p>
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

  const tier = getTierStyle(userData.currentMembership?.level_value);
  const hasMembership = userData.currentMembership !== null;
  const daysLeft = hasMembership ? getDaysRemaining(userData.currentMembership!.expires_at) : 0;

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap");
        * { font-family: "DM Sans", system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .text-shimmer {
          background: linear-gradient(90deg, #a78bfa 0%, #f0abfc 35%, #a78bfa 65%, #c4b5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(167,139,250,0.3); } 50% { box-shadow: 0 0 40px rgba(167,139,250,0.5); } }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
        .glass-hover:hover { background: rgba(255,255,255,0.08); }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#0d0d12] via-purple-950/20 to-[#0d0d12]">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 via-purple-600/5 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-violet-600/20 to-transparent pointer-events-none" />
          
          <div className="relative max-w-2xl mx-auto px-4 pt-12 pb-8">
            {/* Nav */}
            <div className="flex items-center justify-between mb-8">
              <a href="/" className="text-white/60 hover:text-white text-sm font-medium transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Home
              </a>
              <button onClick={handleSignOut} className="text-white/40 hover:text-white/70 text-sm transition-colors">
                Sign Out
              </button>
            </div>

            {/* Payment Status Banner */}
            {paymentStatus && (
              <div className={`mb-6 p-4 rounded-2xl text-center text-sm font-medium fade-up ${
                paymentStatus === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' :
                paymentStatus === 'failed' || paymentStatus === 'error' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
                'bg-white/10 border border-white/20 text-white/80'
              }`}>
                {paymentStatus === 'success' && '🎉 Payment successful! Your membership/points have been activated.'}
                {paymentStatus === 'cancelled' && 'Payment was cancelled. No charges were made.'}
                {paymentStatus === 'failed' && 'Payment failed. Please try again or contact support.'}
                {paymentStatus === 'error' && 'An error occurred during payment. Please try again.'}
                {paymentStatus === 'already' && 'This order has already been processed.'}
              </div>
            )}

            {/* Profile Card */}
            <div className="flex items-center gap-5 mb-8 fade-up">
              <div className="relative">
                {userData.avatar_url ? (
                  <img src={userData.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/20" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-violet-500/30">
                    {(userData.nickname || userData.email)[0].toUpperCase()}
                  </div>
                )}
                {hasMembership && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs shadow-lg">
                    ✨
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{userData.nickname || 'RMBG User'}</h1>
                <p className="text-white/50 text-sm">{userData.email}</p>
              </div>
            </div>

            {/* Unified Status Card */}
            <div className={`rounded-3xl bg-gradient-to-br ${tier.bg} p-6 mb-6 relative overflow-hidden shadow-2xl ${tier.glow} fade-up`} style={{ animationDelay: '0.1s' }}>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                {/* Plan Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl backdrop-blur-sm">
                      {hasMembership ? '👑' : '🌱'}
                    </div>
                    <div>
                      <p className="text-white/70 text-sm">Current Plan</p>
                      <h2 className="text-xl font-bold text-white">{hasMembership ? userData.currentMembership!.name : 'Free Tier'}</h2>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tier.badge}`}>
                    {hasMembership ? `${daysLeft} days left` : 'No card required'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Points */}
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <div className="text-2xl mb-1">🪙</div>
                    <p className="text-2xl font-bold text-white">{userData.points_balance.toLocaleString()}</p>
                    <p className="text-white/60 text-xs mt-1">Points</p>
                  </div>
                  
                  {/* Uses Remaining */}
                  {hasMembership ? (
                    <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl mb-1">♾️</div>
                      <p className="text-2xl font-bold text-white">∞</p>
                      <p className="text-white/60 text-xs mt-1">Unlimited</p>
                    </div>
                  ) : (
                    <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl mb-1">✨</div>
                      <p className="text-2xl font-bold text-white">{userData.free_uses_remaining}</p>
                      <p className="text-white/60 text-xs mt-1">Free Uses</p>
                    </div>
                  )}
                  
                  {/* Total Uses */}
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <div className="text-2xl mb-1">📊</div>
                    <p className="text-2xl font-bold text-white">{userData.total_uses || 0}</p>
                    <p className="text-white/60 text-xs mt-1">Total Uses</p>
                  </div>
                </div>

                {/* Progress bar for free users */}
                {!hasMembership && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-white/60 mb-2">
                      <span>Free uses remaining</span>
                      <span>{userData.free_uses_remaining}/3</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${(userData.free_uses_remaining / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {!hasMembership && (
              <div className={`glass rounded-2xl p-5 mb-6 fade-up`} style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Unlock Unlimited Access</h3>
                    <p className="text-white/50 text-sm">Get unlimited background removals + bonus points</p>
                  </div>
                  <button
                    onClick={() => setShowUpgrade(!showUpgrade)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 transition-all"
                  >
                    {showUpgrade ? 'Hide Plans' : 'View Plans'}
                  </button>
                </div>
              </div>
            )}

            {/* Membership Plans */}
            {showUpgrade && !hasMembership && (
              <div className="space-y-3 mb-6 fade-up">
                {membershipsList.map((membership) => (
                  <div key={membership.id} className="glass glass-hover rounded-2xl p-5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                          membership.name.includes('Pro') ? 'from-violet-600 to-purple-600' :
                          membership.name.includes('Basic') ? 'from-emerald-600 to-teal-600' :
                          'from-amber-600 to-orange-600'
                        } flex items-center justify-center text-xl shadow-lg`}>
                          {membership.name.includes('Pro') ? '👑' : membership.name.includes('Basic') ? '⭐' : '🌟'}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{membership.name}</h4>
                          <p className="text-white/50 text-sm">${membership.price_usd} · {membership.duration_days} days</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePurchase(membership.id)}
                        disabled={purchasing === membership.id || membership.userHasActive}
                        className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                          membership.userHasActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : purchasing === membership.id
                            ? 'bg-violet-500/50 text-white/50'
                            : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30'
                        }`}
                      >
                        {membership.userHasActive ? 'Active' : purchasing === membership.id ? 'Processing...' : 'Subscribe'}
                      </button>
                    </div>
                    {membership.benefits.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {membership.benefits.slice(0, 4).map((benefit, i) => (
                          <span key={i} className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-lg">
                            ✓ {benefit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Benefits for members */}
            {hasMembership && (
              <div className={`glass rounded-2xl p-5 mb-6 fade-up`} style={{ animationDelay: '0.2s' }}>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-lg">✨</span> Your Benefits
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {userData.currentMembership!.benefits.slice(0, 6).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-white/80 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {benefit}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/40 text-xs">
                    Membership renews on {formatDate(userData.currentMembership!.expires_at)}
                  </p>
                </div>
              </div>
            )}

            {/* Points Purchase */}
            <div className={`glass rounded-2xl p-5 fade-up`} style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg">
                    🪙
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Buy Points</h3>
                    <p className="text-white/50 text-xs">Get more processing power</p>
                  </div>
                </div>
                <a 
                  href="/points"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
                >
                  View Packages
                </a>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <span>Current balance:</span>
                  <span className="text-amber-400 font-semibold">{userData.points_balance.toLocaleString()} pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
