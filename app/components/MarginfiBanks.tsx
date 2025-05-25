"use client";

import { useState } from 'react';

interface BankInfo {
  tokenSymbol: string;
  bankAddress: string;
  tvl: number;
  riskTier: string;
  status: string;
  depositCap: number;
  borrowCap: number;
  assetWeightInitial: number;
  assetWeightMaintenance: number;
  liabilityWeightInitial: number;
  liabilityWeightMaintenance: number;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatPercent(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export default function MarginfiBanks() {
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/marginfi');
      if (!response.ok) {
        throw new Error('Failed to fetch banks');
      }
      const data = await response.json();
      setBanks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch banks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={fetchBanks}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Fetch Banks'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {banks.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-4">MarginFi Banks</h2>
          <div className="grid grid-cols-1 gap-4">
            {banks.map((bank) => (
              <div key={bank.bankAddress} className="border p-4 rounded-lg shadow">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-semibold">Token: {bank.tokenSymbol}</p>
                    <p className="text-sm text-gray-600">Address: {bank.bankAddress}</p>
                    <p>TVL: {formatNumber(bank.tvl)}</p>
                    <p>Risk Tier: {bank.riskTier}</p>
                    <p>Status: {bank.status}</p>
                  </div>
                  <div>
                    <p>Deposit Cap: {formatNumber(bank.depositCap)}</p>
                    <p>Borrow Cap: {formatNumber(bank.borrowCap)}</p>
                    <p>Asset Weight Initial: {formatPercent(bank.assetWeightInitial)}</p>
                    <p>Asset Weight Maintenance: {formatPercent(bank.assetWeightMaintenance)}</p>
                    <p>Liability Weight Initial: {formatPercent(bank.liabilityWeightInitial)}</p>
                    <p>Liability Weight Maintenance: {formatPercent(bank.liabilityWeightMaintenance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 