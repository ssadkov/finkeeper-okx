'use client';

import { useEffect, useState } from 'react';
import { KaminoMarket, KaminoReserve } from '@kamino-finance/klend-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

interface ReserveData {
  symbol: string;
  loanToValueRatio: number;
  totalDeposits: string;
  totalBorrows: string;
}

export default function KaminoPage() {
  const [marketData, setMarketData] = useState<ReserveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Initialize connection to Solana network
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        
        // Load Kamino market
        const market = await KaminoMarket.load(
          connection,
          new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'), // Main market address
          1000 // recent slot duration
        );

        if (!market) {
          throw new Error('Failed to load market');
        }

        // Load reserves data
        await market.loadReserves();

        // Get market data
        const reserves: ReserveData[] = [];
        market.reserves.forEach((reserve: KaminoReserve) => {
          reserves.push({
            symbol: reserve.config.symbol,
            loanToValueRatio: reserve.config.loanToValueRatio,
            totalDeposits: reserve.stats.totalDepositsWads.toString(),
            totalBorrows: reserve.stats.totalBorrowsWads.toString(),
          });
        });

        setMarketData(reserves);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load market data');
        setLoading(false);
      }
    };

    fetchMarketData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Kamino Market Data</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {marketData.map((reserve, index) => (
          <div key={index} className="border p-6 rounded-lg shadow-lg bg-white">
            <h2 className="text-2xl font-semibold mb-4">{reserve.symbol}</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Loan to Value Ratio:</span>
                <span>{reserve.loanToValueRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Deposits:</span>
                <span>{reserve.totalDeposits}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Borrows:</span>
                <span>{reserve.totalBorrows}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 