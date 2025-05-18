'use client';

import { useEffect, useState } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { createSignature } from '../utils/okxApi';

interface TotalValueResponse {
  code: string;
  msg: string;
  data: {
    totalValue: string;
  }[];
}

export default function Sidebar() {
  const { publicKey } = useWalletContext();
  const [totalValue, setTotalValue] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTotalValue = async () => {
      if (!publicKey) {
        console.log('No public key available');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching total value for address:', publicKey.toString());
        
        const timestamp = new Date().toISOString();
        const method = 'GET';
        const requestPath = `/api/v5/wallet/asset/total-value-by-address?address=${publicKey.toString()}&chains=501&assetType=0`;
        
        const signature = createSignature(timestamp, method, requestPath);

        const response = await fetch(
          `https://web3.okx.com${requestPath}`,
          {
            headers: {
              'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
              'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY || '',
              'OK-ACCESS-SIGN': signature,
              'OK-ACCESS-PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
              'OK-ACCESS-TIMESTAMP': timestamp,
            },
          }
        );

        const data: TotalValueResponse = await response.json();
        console.log('API Response:', data);
        
        if (data.code === '0' && data.data.length > 0) {
          setTotalValue(data.data[0].totalValue);
        } else {
          console.error('API Error:', data.msg);
          setError('Failed to fetch total value: ' + data.msg);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
        setError('Error fetching total value');
      } finally {
        setLoading(false);
      }
    };

    fetchTotalValue();
  }, [publicKey]);

  return (
    <div className="w-64 bg-white h-screen shadow-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Wallet Overview</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm text-gray-600 mb-1">Total Value</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <p className="text-xl font-bold">${Number(totalValue).toFixed(2)}</p>
          )}
        </div>
      </div>
    </div>
  );
} 