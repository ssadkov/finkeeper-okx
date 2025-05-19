'use client';

import { useEffect, useState, useCallback } from 'react';

interface UnderlyingToken {
  tokenSymbol: string;
  tokenAddress: string;
  isBaseToken: boolean;
}

interface Pool {
  investmentId: string;
  investmentName: string;
  platformName: string;
  rate: string;
  tvl: string;
  underlyingToken: UnderlyingToken[];
}

interface PoolsResponse {
  code: number;
  msg: string;
  data: {
    investments: Pool[];
    total: string;
  };
}

// Кэш для хранения данных
let poolsCache: {
  data: Pool[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Время жизни кэша (5 минут)
const CACHE_LIFETIME = 5 * 60 * 1000;

export function PoolsView() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPools = useCallback(async (force = false) => {
    // Проверяем кэш, если не принудительное обновление
    if (!force && poolsCache.data && (Date.now() - poolsCache.timestamp) < CACHE_LIFETIME) {
      setPools(poolsCache.data);
      setLoading(false);
      setError(null);
      setLastUpdated(new Date(poolsCache.timestamp));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/defi/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simplifyInvestType: "100",
          network: "SOL",
          offset: "0",
          sort: {
            orders: [{
              direction: "DESC",
              property: "RATE"
            }]
          }
        })
      });

      const data: PoolsResponse = await response.json();
      
      if (data.code === 0) {
        // Обновляем кэш
        poolsCache = {
          data: data.data.investments,
          timestamp: Date.now()
        };
        setPools(data.data.investments);
        setLastUpdated(new Date());
      } else {
        setError(data.msg || 'Failed to fetch pools');
      }
    } catch (err) {
      setError('Error fetching pools data');
      console.error('Error fetching pools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  const handleRefresh = () => {
    fetchPools(true);
  };

  if (loading && !pools.length) {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <div className="text-center text-gray-500">Loading pools...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Lending Pools</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APR</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pools.map((pool) => (
              <tr key={pool.investmentId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{pool.investmentName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {pool.platformName}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{(Number(pool.rate) * 100).toFixed(2)}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${Number(pool.tvl).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-1">
                    {pool.underlyingToken.map((token) => (
                      <span 
                        key={token.tokenAddress}
                        className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800"
                      >
                        {token.tokenSymbol}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 