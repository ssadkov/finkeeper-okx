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

interface TokenAsset {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  tokenType: string;
  isRiskToken: boolean;
  transferAmount: string;
  availableAmount: string;
  rawBalance: string;
  address: string;
}

interface BalanceResponse {
  code: string;
  msg: string;
  data: {
    tokenAssets: TokenAsset[];
  }[];
}

interface Platform {
  analysisPlatformId: string;
  platformName: string;
  platformLogo: string;
  platformUrl: string;
  currencyAmount: string;
  investmentCount: number;
  networkBalanceVoList: Array<{
    network: string;
    networkLogo: string;
    chainId: string;
  }>;
}

interface Position {
  platformList: Platform[];
  totalAssets: string;
}

interface PositionsResponse {
  code: number;
  msg: string;
  error_code: string;
  error_message: string;
  detailMsg: string;
  data: {
    walletIdPlatformList?: Position[];
  };
}

export default function Sidebar() {
  const { publicKey } = useWalletContext();
  const [totalValue, setTotalValue] = useState<string>('0');
  const [balances, setBalances] = useState<TokenAsset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideSmallAssets, setHideSmallAssets] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Эффект для получения общей стоимости
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

  // Эффект для получения балансов токенов
  useEffect(() => {
    const fetchBalances = async () => {
      if (!publicKey) return;

      try {
        const timestamp = new Date().toISOString();
        const method = 'GET';
        const requestPath = `/api/v5/wallet/asset/all-token-balances-by-address?address=${publicKey.toString()}&chains=501&filter=1`;

        const signature = createSignature(timestamp, method, requestPath);

        console.log('Balance request:', {
          path: requestPath,
          timestamp
        });

        const response = await fetch(
          `https://web3.okx.com${requestPath}`,
          {
            method,
            headers: {
              'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
              'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY || '',
              'OK-ACCESS-SIGN': signature,
              'OK-ACCESS-PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
              'OK-ACCESS-TIMESTAMP': timestamp,
            },
          }
        );

        const data: BalanceResponse = await response.json();
        console.log('Balance Response:', data);

        if (data.code === '0' && data.data.length > 0) {
          setBalances(data.data[0].tokenAssets);
        } else {
          console.error('Balance API Error:', data.msg);
        }
      } catch (err) {
        console.error('Balance Fetch Error:', err);
      }
    };

    fetchBalances();
  }, [publicKey]);

  // Эффект для получения позиций
  useEffect(() => {
    const fetchPositions = async () => {
      if (!publicKey) {
        console.log('No public key available for positions');
        return;
      }

      try {
        console.log('Fetching positions for address:', publicKey.toString());
        
        const requestBody = {
          walletAddressList: [{
            chainId: 501, // Solana
            walletAddress: publicKey.toString()
          }]
        };
        console.log('Positions request body:', requestBody);

        const response = await fetch('/api/defi/positions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Positions response status:', response.status);
        const data: PositionsResponse = await response.json();
        console.log('Positions Response:', data);

        if (data.code === 0 && data.data?.walletIdPlatformList) {
          console.log('Raw positions data:', data.data.walletIdPlatformList);
          // Фильтруем только те записи, у которых есть platformList
          const validPositions = data.data.walletIdPlatformList.filter(
            (wallet) => Array.isArray(wallet.platformList) && wallet.platformList.length > 0
          );
          console.log('Filtered positions:', validPositions);
          setPositions(validPositions);
        } else {
          console.error('Positions API Error:', {
            code: data.code,
            msg: data.msg,
            error_code: data.error_code,
            error_message: data.error_message,
            detailMsg: data.detailMsg,
            data: data.data
          });
        }
      } catch (err) {
        console.error('Positions Fetch Error:', err);
        if (err instanceof Error) {
          console.error('Error details:', err.message);
        }
      }
    };

    fetchPositions();
  }, [publicKey]);

  // Сортировка и фильтрация токенов
  const sortedAndFilteredBalances = balances
    .filter(token => {
      if (!hideSmallAssets) return true;
      const value = Number(token.balance) * Number(token.tokenPrice);
      return value >= 1;
    })
    .sort((a, b) => {
      const valueA = Number(a.balance) * Number(a.tokenPrice);
      const valueB = Number(b.balance) * Number(b.tokenPrice);
      return valueB - valueA;
    });

  // Подсчет общей стоимости всех токенов (без фильтра)
  const totalTokensValue = balances.reduce((sum, token) => {
    return sum + (Number(token.balance) * Number(token.tokenPrice));
  }, 0);

  // Подсчет стоимости отфильтрованных токенов
  const filteredTokensValue = sortedAndFilteredBalances.reduce((sum, token) => {
    return sum + (Number(token.balance) * Number(token.tokenPrice));
  }, 0);

  // Фильтрация позиций
  const filteredPositions = positions.map(wallet => ({
    ...wallet,
    platformList: wallet.platformList?.filter(platform => {
      if (!hideSmallAssets) return true;
      return Number(platform.currencyAmount) >= 1;
    })
  })).filter(wallet => wallet.platformList && wallet.platformList.length > 0);

  return (
    <div className="w-80 bg-white h-screen shadow-lg p-4 flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
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

          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={hideSmallAssets}
                onChange={(e) => setHideSmallAssets(e.target.checked)}
                className="form-checkbox h-4 w-4 text-blue-600 rounded"
              />
              <span>Hide &lt;$1</span>
            </label>
          </div>

          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Wallet</span>
                {!loading && !error && (
                  <span className="text-sm text-gray-500">
                    ${totalTokensValue.toFixed(2)}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="p-4 pt-0">
                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : sortedAndFilteredBalances.length === 0 ? (
                  <p className="text-gray-500">No tokens found</p>
                ) : (
                  <div className="space-y-2">
                    {sortedAndFilteredBalances.map((token) => {
                      const value = Number(token.balance) * Number(token.tokenPrice);
                      return (
                        <div key={token.tokenAddress} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{token.symbol}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{Number(token.balance).toFixed(4)}</p>
                            <p className="text-xs text-gray-500">${value.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {hideSmallAssets && totalTokensValue > filteredTokensValue && (
                  <p className="text-xs text-gray-500 mt-2">
                    Hidden: ${(totalTokensValue - filteredTokensValue).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">User Positions</h3>
            {filteredPositions.length === 0 ? (
              <p className="text-sm text-gray-500">No open positions</p>
            ) : (
              filteredPositions.map((wallet) => (
                wallet.platformList?.map((platform) => (
                  <div key={platform.analysisPlatformId} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        {platform.platformLogo && (
                          <img 
                            src={platform.platformLogo} 
                            alt={platform.platformName}
                            className="w-4 h-4"
                          />
                        )}
                        <div>
                          <a 
                            href={platform.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {platform.platformName}
                          </a>
                          <p className="text-xs text-gray-500">
                            {platform.investmentCount} position{platform.investmentCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${Number(platform.currencyAmount).toFixed(2)}</p>
                        <div className="flex items-center space-x-1">
                          {platform.networkBalanceVoList.map((network) => (
                            <div key={network.chainId} className="flex items-center">
                              {network.networkLogo && (
                                <img 
                                  src={network.networkLogo} 
                                  alt={network.network}
                                  className="w-3 h-3"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ))
            )}
            {hideSmallAssets && positions.length > filteredPositions.length && (
              <p className="text-xs text-gray-500 mt-2">
                Hidden positions: {positions.length - filteredPositions.length}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200 mt-4">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Tools</h3>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="/defi" 
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 hover:underline p-2 rounded hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>DeFi Protocols</span>
            </a>
            <a 
              href="/positions" 
              className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 hover:underline p-2 rounded hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>User Positions</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 