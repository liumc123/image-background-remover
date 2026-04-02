'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string | null;
  created_at: string;
  isPositive: boolean;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (offset = 0) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/points/transactions?limit=20&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch transactions');

      const data = await res.json();
      
      if (offset === 0) {
        setTransactions(data.data.transactions);
      } else {
        setTransactions(prev => [...prev, ...data.data.transactions]);
      }
      
      setHasMore(data.data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const loadMore = () => {
    setLoadingMore(true);
    setOffset(prev => prev + 20);
    fetchTransactions(offset + 20);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return { label: 'Purchase', color: 'text-blue-400' };
      case 'refund': return { label: 'Refund', color: 'text-orange-400' };
      case 'redeem': return { label: 'Used', color: 'text-red-400' };
      case 'reward': return { label: 'Reward', color: 'text-green-400' };
      case 'manual': return { label: 'Manual', color: 'text-purple-400' };
      default: return { label: type, color: 'text-white/60' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
          <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-white/60">No transactions yet</p>
        <p className="text-white/40 text-sm mt-1">Your point history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>

      <div className="space-y-2">
        {transactions.map((txn) => {
          const typeInfo = getTypeLabel(txn.type);
          
          return (
            <div
              key={txn.id}
              className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    txn.isPositive 
                      ? 'bg-green-500/20' 
                      : 'bg-red-500/20'
                  }`}>
                    {txn.isPositive ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-white/60 text-sm">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {txn.description && (
                      <p className="text-white/50 text-sm mt-0.5">{txn.description}</p>
                    )}
                  </div>
                </div>

                {/* Amount & Balance */}
                <div className="text-right">
                  <p className={`font-bold ${
                    txn.isPositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {txn.isPositive ? '+' : ''}{txn.amount.toLocaleString()}
                  </p>
                  <p className="text-white/40 text-sm">
                    Balance: {txn.balance_after.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
