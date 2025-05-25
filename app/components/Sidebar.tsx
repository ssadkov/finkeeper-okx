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

interface PositionDetail {
  networkHoldVoList: Array<{
    network: string;
    chainId: number;
    totalAssert: string;
    investTokenBalanceVoList: Array<{
      investmentName: string;
      investmentKey: string;
      investType: number;
      investName: string;
      assetsTokenList: Array<{
        tokenSymbol: string;
        tokenLogo: string;
        coinAmount: string;
        currencyAmount: string;
        tokenPrecision: number;
        tokenAddress: string;
        network: string;
      }>;
      rewardDefiTokenInfo: any[];
      totalValue: string;
    }>;
    availableRewards: any[];
    airDropRewardInfo: any[];
  }>;
  accountId: string;
}

interface PositionDetailsResponse {
  code: number;
  msg: string;
  error_code: string;
  error_message: string;
  detailMsg: string;
  data: {
    walletIdPlatformDetailList: PositionDetail[];
  };
}

export default function Sidebar() {
  const { publicKey, setWalletTokens } = useWalletContext();
  const [totalValue, setTotalValue] = useState<string>('0');
  const [balances, setBalances] = useState<TokenAsset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionDetails, setPositionDetails] = useState<Record<string, PositionDetail[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideSmallAssets, setHideSmallAssets] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPositionsExpanded, setIsPositionsExpanded] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState<Record<string, boolean>>({});

  // Инициализация состояний из localStorage после монтирования
  useEffect(() => {
    const savedWalletExpanded = localStorage.getItem('walletExpanded');
    const savedPositionsExpanded = localStorage.getItem('positionsExpanded');
    
    if (savedWalletExpanded) {
      setIsExpanded(JSON.parse(savedWalletExpanded));
    }
    if (savedPositionsExpanded) {
      setIsPositionsExpanded(JSON.parse(savedPositionsExpanded));
    }
  }, []);

  const handleWalletToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('walletExpanded', JSON.stringify(newState));
  };

  const handlePositionsToggle = () => {
    const newState = !isPositionsExpanded;
    setIsPositionsExpanded(newState);
    localStorage.setItem('positionsExpanded', JSON.stringify(newState));
  };

  const handleProtocolClick = async (platformId: string) => {
    if (!publicKey) return;

    setLoadingPositions(prev => ({ ...prev, [platformId]: true }));
    try {
      const response = await fetch(`/api/defi/positions?platformId=${platformId}&chainId=501&walletAddress=${publicKey.toString()}`);
      const data: PositionDetailsResponse = await response.json();

      if (data.code === 0 && data.data?.walletIdPlatformDetailList) {
        setPositionDetails(prev => ({ ...prev, [platformId]: data.data.walletIdPlatformDetailList }));
      } else {
        console.error('Failed to fetch position details:', data);
      }
    } catch (err) {
      console.error('Error fetching position details:', err);
    } finally {
      setLoadingPositions(prev => ({ ...prev, [platformId]: false }));
    }
  };

  useEffect(() => {
    console.log('Wallet expanded state changed:', isExpanded);
  }, [isExpanded]);

  useEffect(() => {
    console.log('Positions expanded state changed:', isPositionsExpanded);
  }, [isPositionsExpanded]);

  useEffect(() => {
    if (publicKey) {
      fetchWalletData();
    }
  }, [publicKey]);

  const fetchWalletData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!publicKey) return;

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

      // Получаем балансы токенов
      const balanceTimestamp = new Date().toISOString();
      const balanceMethod = 'GET';
      const balanceRequestPath = `/api/v5/wallet/asset/all-token-balances-by-address?address=${publicKey.toString()}&chains=501&filter=1`;

      const balanceSignature = createSignature(balanceTimestamp, balanceMethod, balanceRequestPath);

      console.log('Balance request:', {
        path: balanceRequestPath,
        timestamp: balanceTimestamp
      });

      const balanceResponse = await fetch(
        `https://web3.okx.com${balanceRequestPath}`,
        {
          method: balanceMethod,
          headers: {
            'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID || '',
            'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY || '',
            'OK-ACCESS-SIGN': balanceSignature,
            'OK-ACCESS-PASSPHRASE': process.env.NEXT_PUBLIC_OKX_PASSPHRASE || '',
            'OK-ACCESS-TIMESTAMP': balanceTimestamp,
          },
        }
      );

      const balanceData: BalanceResponse = await balanceResponse.json();
      console.log('Balance Response:', balanceData);

      if (balanceData.code === '0' && balanceData.data.length > 0) {
        const newBalances = balanceData.data[0].tokenAssets;
        setBalances(newBalances);
        
        // Обновляем токены в контексте
        const tokenInfo = newBalances.map(token => ({
          symbol: token.symbol,
          balance: token.balance,
          address: token.tokenAddress
        }));
        console.log('Updating wallet tokens:', tokenInfo);
        setWalletTokens(tokenInfo);
      } else {
        console.error('Balance API Error:', balanceData.msg);
      }

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="w-80 bg-white shadow-lg p-4 flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2">
        <h2 className="text-lg font-semibold mb-2">Wallet Overview</h2>
        <div className="space-y-2">
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="text-sm text-gray-600 mb-1">Total Value</h3>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <p className="text-xl font-bold">${Number(totalValue).toFixed(2)}</p>
            )}
          </div>

          <div className="flex items-center justify-between mb-1">
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

          <div className="space-y-2">
            <button
              onClick={handleWalletToggle}
              className="w-full p-2 flex items-center justify-between hover:bg-gray-100 transition-colors rounded"
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

            <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
              <div className="p-2 pt-0">
                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : sortedAndFilteredBalances.length === 0 ? (
                  <p className="text-gray-500">No tokens found</p>
                ) : (
                  <div className="space-y-1">
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
                  <p className="text-xs text-gray-500 mt-1">
                    Hidden: ${(totalTokensValue - filteredTokensValue).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handlePositionsToggle}
              className="w-full p-2 flex items-center justify-between hover:bg-gray-100 transition-colors rounded"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">User Positions</span>
              </div>
              <svg
                className={`w-4 h-4 transform transition-transform ${isPositionsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className={`overflow-hidden transition-all duration-200 ${isPositionsExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
              <div className="p-2 pt-0">
                {filteredPositions.length === 0 ? (
                  <p className="text-sm text-gray-500">No open positions</p>
                ) : (
                  filteredPositions.map((wallet) => (
                    wallet.platformList?.map((platform) => (
                      <div key={platform.analysisPlatformId} className="bg-gray-50 p-2 rounded-lg mb-2">
                        <div 
                          className="flex justify-between items-start cursor-pointer hover:bg-gray-100 rounded p-1"
                          onClick={() => handleProtocolClick(platform.analysisPlatformId)}
                        >
                          <div className="flex items-center space-x-2">
                            {platform.platformLogo && (
                              <img 
                                src={platform.platformLogo} 
                                alt={platform.platformName}
                                className="w-4 h-4"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-blue-600">
                                {platform.platformName}
                              </div>
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

                        {/* Детали позиции */}
                        {loadingPositions[platform.analysisPlatformId] ? (
                          <div className="mt-2 text-sm text-gray-500">Loading details...</div>
                        ) : positionDetails[platform.analysisPlatformId]?.map((detail) => (
                          detail.networkHoldVoList.map((network) => (
                            network.investTokenBalanceVoList.map((investment) => (
                              <div key={investment.investmentKey} className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-sm font-medium">{investment.investmentName}</div>
                                    <div className="text-xs text-gray-500">{investment.investName}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">
                                      ${parseFloat(investment.totalValue).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1 space-y-1">
                                  {investment.assetsTokenList.map((token) => (
                                    <div key={token.tokenAddress} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center space-x-1">
                                        {token.tokenLogo && (
                                          <img 
                                            src={token.tokenLogo} 
                                            alt={token.tokenSymbol}
                                            className="w-4 h-4"
                                          />
                                        )}
                                        <span>{token.tokenSymbol}</span>
                                      </div>
                                      <div className="text-right">
                                        <div>{parseFloat(token.coinAmount).toFixed(6)}</div>
                                        <div className="text-gray-500">
                                          ${parseFloat(token.currencyAmount).toFixed(2)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ))
                        ))}
                      </div>
                    ))
                  ))
                )}
                {hideSmallAssets && positions.length > filteredPositions.length && (
                  <p className="text-xs text-gray-500 mt-1">
                    Hidden positions: {positions.length - filteredPositions.length}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-1">Tools</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <a 
              href="/products" 
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>DeFi Protocols</span>
            </a>
            <a 
              href="/positions" 
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50"
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