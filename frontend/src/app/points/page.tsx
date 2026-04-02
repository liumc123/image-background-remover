'use client';

import { useState, useEffect } from 'react';
import PointsStore from '@/components/PointsStore';

export default function PointsPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) setToken(stored);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d12] py-12 px-8">
      <div className="max-w-6xl mx-auto">
        <PointsStore token={token || undefined} />
      </div>
    </div>
  );
}
