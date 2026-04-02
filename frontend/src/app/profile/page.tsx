'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/api';
import UserProfile from '@/components/UserProfile';

export default function ProfilePage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) setToken(stored);
  }, []);

  const handleGoogleCallback = async (response: any) => {
    try {
      const res = await auth.google(response.credential);
      if (res.success && res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  useEffect(() => {
    // @ts-ignore
    if (window.handleCredentialResponse) {
      // @ts-ignore
      window.handleCredentialResponse = handleGoogleCallback;
    } else {
      // @ts-ignore
      window.handleCredentialResponse = handleGoogleCallback;
    }
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center p-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign In</h1>
          <p className="text-white/60 mb-6">Please sign in to view your profile</p>
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

  return (
    <div className="min-h-screen bg-[#0d0d12] py-12 px-8">
      <UserProfile token={token} />
    </div>
  );
}
