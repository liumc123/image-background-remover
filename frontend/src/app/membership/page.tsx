'use client';

import { useState, useEffect } from 'react';
import MembershipSelector from '@/components/MembershipSelector';

export default function MembershipPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) setToken(stored);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d12] py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <MembershipSelector token={token || undefined} />
      </div>
    </div>
  );
}
