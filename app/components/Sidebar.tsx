'use client';

import { useEffect, useState } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { createSignature } from '../utils/okxApi';
import { useOkx } from '../context/OkxContext';
import OkxConnectModal from './OkxConnectModal';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

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

interface OkxBalance {
    availBal: string;
    bal: string;
    ccy: string;
    frozenBal: string;
}

export default function Sidebar() {
  const { publicKey, setWalletTokens } = useWalletContext();
  const { isConnected, balances: okxBalances, totalBalance: okxTotalBalance, connect } = useOkx();
  const [totalValue, setTotalValue] = useState<string>('0');
  const [balances, setBalances] = useState<TokenAsset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionDetails, setPositionDetails] = useState<Record<string, PositionDetail[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideSmallAssets, setHideSmallAssets] = useState(true);
  const [isWalletExpanded, setIsWalletExpanded] = useState(true);
  const [isPositionsExpanded, setIsPositionsExpanded] = useState(false);
  const [isOkxExpanded, setIsOkxExpanded] = useState(true);
  const [isOkxModalOpen, setIsOkxModalOpen] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState<Record<string, boolean>>({});
  const [loadingOkx, setLoadingOkx] = useState(false);
  const [okxTokenPrices, setOkxTokenPrices] = useState<Record<string, number>>({});
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const PRICE_UPDATE_INTERVAL = 10 * 1000; // 10 секунд вместо 5 минут
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 100; // 100мс между запросами вместо 1 секунды

  // Инициализация состояний из localStorage после монтирования
  useEffect(() => {
    const savedWalletExpanded = localStorage.getItem('walletExpanded');
    const savedPositionsExpanded = localStorage.getItem('positionsExpanded');
    const savedOkxExpanded = localStorage.getItem('okxExpanded');
    
    if (savedWalletExpanded) {
      setIsWalletExpanded(JSON.parse(savedWalletExpanded));
    }
    if (savedPositionsExpanded) {
      setIsPositionsExpanded(JSON.parse(savedPositionsExpanded));
    }
    if (savedOkxExpanded) {
      setIsOkxExpanded(JSON.parse(savedOkxExpanded));
    }
  }, []);

  // Обновляем данные OKX при изменении состояния подключения
  useEffect(() => {
    if (isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  const handleWalletToggle = () => {
    const newState = !isWalletExpanded;
    setIsWalletExpanded(newState);
    localStorage.setItem('walletExpanded', JSON.stringify(newState));
  };

  const handlePositionsToggle = () => {
    const newState = !isPositionsExpanded;
    setIsPositionsExpanded(newState);
    localStorage.setItem('positionsExpanded', JSON.stringify(newState));
  };

  const handleOkxToggle = () => {
    const newState = !isOkxExpanded;
    setIsOkxExpanded(newState);
    localStorage.setItem('okxExpanded', String(newState));
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
    if (publicKey) {
      console.log('Wallet connected, fetching data for:', publicKey.toString());
      fetchWalletData();
    } else {
      // Сбрасываем данные при отключении кошелька
      setTotalValue('0');
      setBalances([]);
      setPositions([]);
      setPositionDetails({});
      setWalletTokens([]);
    }
  }, [publicKey]);

  // Функция для получения цены токена с повторными попытками
  const fetchTokenPrice = async (symbol: string, retryCount = 0): Promise<number> => {
    try {
      const response = await fetch(`/api/price?symbol=${symbol}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const priceText = await response.text();
      const price = parseFloat(priceText);
      
      if (isNaN(price)) {
        console.warn(`Invalid price received for ${symbol}: ${priceText}`);
        return 0;
      }
      
      return price;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`Retrying fetch price for ${symbol}, attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchTokenPrice(symbol, retryCount + 1);
      }
      console.warn(`Failed to fetch price for ${symbol} after ${MAX_RETRIES} attempts:`, error);
      return 0;
    }
  };

  // Обновляем цены токенов только если прошло достаточно времени с последнего обновления
  const updateTokenPrices = async () => {
    if (isUpdatingPrices) return;
    
    const now = Date.now();
    if (now - lastPriceUpdate < PRICE_UPDATE_INTERVAL) {
      return;
    }

    if (!okxBalances || !okxBalances.length) return;
    
    try {
      setIsUpdatingPrices(true);
      const prices: Record<string, number> = {};
      
      // Обрабатываем токены последовательно, но с меньшей задержкой
      for (const balance of okxBalances) {
        if (balance && balance.ccy && parseFloat(balance.bal) > 0) {
          const price = await fetchTokenPrice(balance.ccy);
          if (price > 0) {
            prices[balance.ccy] = price;
          }
          // Уменьшаем задержку между запросами до 100мс
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (Object.keys(prices).length > 0) {
        setOkxTokenPrices(prices);
        setLastPriceUpdate(now);
      }
    } catch (error) {
      console.error('Error updating token prices:', error);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Обновляем цены только при подключении OKX
  useEffect(() => {
    if (isConnected && okxBalances && okxBalances.length > 0 && !isUpdatingPrices) {
      console.log('OKX connected, updating prices...');
      updateTokenPrices();
    }
  }, [isConnected]);

  const fetchWalletData = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching wallet data for address:', publicKey.toString());
      
      // Обновляем данные кошелька
      const response = await fetch('/api/wallet/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch wallet data');
      }

      setTotalValue(data.totalValue);
      setBalances(data.balances);
      
      // Обновляем токены в контексте
      const tokenInfo = data.balances.map((token: TokenAsset) => ({
        symbol: token.symbol,
        balance: token.balance,
        address: token.tokenAddress
      }));
      console.log('Updating wallet tokens:', tokenInfo);
      setWalletTokens(tokenInfo);

      // Обновляем позиции
      const positionsResponse = await fetch('/api/defi/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddressList: [{
            chainId: 501, // Solana
            walletAddress: publicKey.toString()
          }]
        })
      });

      const positionsData = await positionsResponse.json();

      if (positionsData.code === 0 && positionsData.data?.walletIdPlatformList) {
        const validPositions = positionsData.data.walletIdPlatformList.filter(
          (wallet: Position) => Array.isArray(wallet.platformList) && wallet.platformList.length > 0
        );
        setPositions(validPositions);
      } else {
        console.error('Positions API Error:', positionsData);
      }

      // Обновляем данные OKX если подключены
      if (isConnected && !isUpdatingPrices) {
        console.log('Updating OKX data...');
        await connect();
        // Даем время на обновление балансов
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (okxBalances && okxBalances.length > 0) {
          console.log('OKX balances updated:', okxBalances);
          await updateTokenPrices();
        } else {
          console.warn('No OKX balances available after update');
        }
      }

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

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

  // Подсчет общей стоимости всех позиций
  const totalPositionsValue = positions.reduce((sum, wallet) => {
    return sum + wallet.platformList.reduce((platformSum, platform) => {
      return platformSum + Number(platform.currencyAmount);
    }, 0);
  }, 0);

  // Подсчет общей стоимости OKX токенов
  const okxTotalValue = okxBalances.reduce((sum, balance) => {
    if (!balance || !balance.ccy || !balance.bal) return sum;
    const price = okxTokenPrices[balance.ccy] || 0;
    return sum + (parseFloat(balance.bal) * price);
  }, 0);

  // Подсчет суммы скрытых активов OKX
  const okxHiddenValue = hideSmallAssets ? okxBalances.reduce((sum, balance) => {
    if (!balance || !balance.ccy || !balance.bal) return sum;
    const price = okxTokenPrices[balance.ccy] || 0;
    const value = parseFloat(balance.bal) * price;
    return sum + (value < 1 ? value : 0);
  }, 0) : 0;

  return (
    <div className="bg-white border-r border-gray-200 flex flex-col w-80">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Wallet Overview</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchWalletData}
                disabled={loading}
                className={`p-1.5 rounded transition-colors ${
                  loading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Refresh wallet data"
              >
                <svg 
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-sm text-gray-600 mb-1">Total Value</h3>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div>
                  <p className="text-xl font-bold">${(totalTokensValue + okxTotalValue + totalPositionsValue).toFixed(2)}</p>
                  {hideSmallAssets && (okxHiddenValue > 0 || totalTokensValue > filteredTokensValue) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Hidden: ${(okxHiddenValue + (totalTokensValue - filteredTokensValue)).toFixed(2)}
                    </p>
                  )}
                </div>
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
                  className={`w-4 h-4 transform transition-transform ${isWalletExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${isWalletExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
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
                  <span className="text-sm font-medium">Positions</span>
                  {!loading && !error && (
                    <span className="text-sm text-gray-500">
                      ${totalPositionsValue.toFixed(2)}
                    </span>
                  )}
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
                  {loading ? (
                    <p className="text-sm text-gray-500">Loading positions...</p>
                  ) : filteredPositions.length === 0 ? (
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

            {/* OKX Exchange Section */}
            <div className="space-y-2">
              <button
                onClick={handleOkxToggle}
                className="w-full p-2 flex items-center justify-between hover:bg-gray-100 transition-colors rounded"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">OKX Exchange</span>
                  {isConnected && (
                    <span className="text-sm text-gray-500">
                      ${okxTotalValue.toFixed(2)}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 transform transition-transform ${isOkxExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className={`overflow-hidden transition-all duration-200 ${isOkxExpanded ? 'max-h-[1000px]' : 'max-h-0'}`}>
                <div className="p-2 pt-0">
                  {!isConnected ? (
                    <div className="text-center p-4">
                      <p className="text-gray-500 mb-2">Connect to OKX Exchange</p>
                      <button
                        onClick={() => setIsOkxModalOpen(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Connect OKX
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {okxBalances
                        .filter(balance => {
                          if (!hideSmallAssets) return parseFloat(balance.bal) > 0;
                          const price = okxTokenPrices[balance.ccy] || 0;
                          const value = parseFloat(balance.bal) * price;
                          return value >= 1;
                        })
                        .sort((a, b) => {
                          const priceA = okxTokenPrices[a.ccy] || 0;
                          const priceB = okxTokenPrices[b.ccy] || 0;
                          const valueA = parseFloat(a.bal) * priceA;
                          const valueB = parseFloat(b.bal) * priceB;
                          return valueB - valueA;
                        })
                        .map((balance) => {
                          const price = okxTokenPrices[balance.ccy] || 0;
                          const value = parseFloat(balance.bal) * price;
                          return (
                            <div key={balance.ccy} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{balance.ccy}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{parseFloat(balance.bal).toFixed(8)}</p>
                                {price > 0 && (
                                  <p className="text-xs text-gray-500">${value.toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {hideSmallAssets && okxBalances.some(balance => {
                        const price = okxTokenPrices[balance.ccy] || 0;
                        const value = parseFloat(balance.bal) * price;
                        return value < 1;
                      }) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Hidden: ${okxBalances.reduce((sum, balance) => {
                            const price = okxTokenPrices[balance.ccy] || 0;
                            const value = parseFloat(balance.bal) * price;
                            return sum + (value < 1 ? value : 0);
                          }, 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Tools</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="/ideas" 
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Investment Ideas</span>
            </a>
            <Link href="/products" className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>DeFi Products</span>
            </Link>
            <Link href="/tokens" className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tokens</span>
            </Link>
            <Link href="/positions" className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded hover:bg-gray-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>User Positions</span>
            </Link>
          </div>
        </div>
      </div>

      <OkxConnectModal
        isOpen={isOkxModalOpen}
        onClose={() => setIsOkxModalOpen(false)}
      />
    </div>
  );
} 