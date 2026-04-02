'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
  bindings: Array<{ id: string; provider: string; created_at: string }>;
  currentMembership: {
    id: string;
    name: string;
    level_value: number;
    benefits: string[];
    expires_at: string;
  } | null;
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
        }
        throw new Error('Failed to fetch user');
      }

      const data = await res.json();
      setUser(data.data);
      setNickname(data.data.nickname || '');
      setAvatarUrl(data.data.avatar_url || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname, avatar_url: avatarUrl })
      });

      if (!res.ok) throw new Error('Failed to update');

      await fetchUser();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-white/60">Please sign in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nickname || 'User'}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
                {(user.nickname || user.email)[0].toUpperCase()}
              </div>
            )}
            {user.currentMembership && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {user.currentMembership.name}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Nickname"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40"
                  maxLength={50}
                />
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Avatar URL"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white">
                  {user.nickname || 'No nickname'}
                </h2>
                <p className="text-white/60 text-sm mt-1">{user.email}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Edit profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Points */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" />
              </svg>
            </div>
            <div>
              <p className="text-white/60 text-sm">Points Balance</p>
              <p className="text-2xl font-bold text-white">{user.points_balance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Membership */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              user.currentMembership 
                ? 'bg-gradient-to-br from-yellow-500 to-amber-600' 
                : 'bg-white/10'
            }`}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="text-white/60 text-sm">Membership</p>
              <p className="text-lg font-bold text-white">
                {user.currentMembership?.name || 'None'}
              </p>
              {user.currentMembership && (
                <p className="text-xs text-white/40">
                  Expires {new Date(user.currentMembership.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Membership Benefits */}
      {user.currentMembership && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {user.currentMembership.name} Benefits
          </h3>
          <ul className="space-y-2">
            {user.currentMembership.benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3 text-white/80">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-3">
          {user.bindings.length === 0 ? (
            <p className="text-white/60 text-sm">No connected accounts</p>
          ) : (
            user.bindings.map((binding) => (
              <div key={binding.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  binding.provider === 'google' ? 'bg-white' : 'bg-blue-500'
                }`}>
                  <span className="text-sm font-bold text-gray-900">
                    {binding.provider[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-white/80 capitalize">{binding.provider}</span>
                <span className="text-green-400 text-sm ml-auto">Connected</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
