'use client';

import { useState, useEffect } from 'react';
import { auth, user, memberships, points } from '@/lib/api';

interface UserData {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
  currentMembership: {
    name: string;
    expires_at: string;
    benefits: string[];
  } | null;
}

export default function UserProfile({ token }: { token: string }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    loadUser();
  }, [token]);

  async function loadUser() {
    try {
      setLoading(true);
      const res = await user.get(token);
      setUserData(res.data);
      setNickname(res.data.nickname || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    try {
      await user.update(token, { nickname });
      await loadUser();
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="text-white/60">Loading...</div>;
  }

  if (!userData) {
    return <div className="text-red-400">Failed to load user</div>;
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">My Profile</h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        {userData.avatar_url ? (
          <img src={userData.avatar_url} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
            {(userData.nickname || userData.email)[0].toUpperCase()}
          </div>
        )}
        <div>
          {editing ? (
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-white"
              placeholder="Nickname"
            />
          ) : (
            <p className="text-white font-medium">{userData.nickname || 'No nickname'}</p>
          )}
          <p className="text-white/60 text-sm">{userData.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{userData.points_balance.toLocaleString()}</p>
          <p className="text-white/60 text-sm">Points</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">
            {userData.currentMembership?.name || 'Free'}
          </p>
          <p className="text-white/60 text-sm">Membership</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              onClick={handleUpdate}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-sm font-medium"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
}
