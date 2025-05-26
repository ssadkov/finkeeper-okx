import { Connection, PublicKey } from '@solana/web3.js';
import { Market } from '@solendprotocol/solend-sdk/state';

export async function getSolendMarketData() {
  try {
    // Initialize connection to Solana network
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

    // Initialize market with parameters and metadata
    const market = await Market.initialize(
      connection,
      'production',
      new PublicKey('7RCz8wb6WXxUhAigok9ttgrVgDFFFbibcirECzWSBauM') // TURBO SOL market
    );

    // Load reserve data
    await market.loadReserves();

    // Get USDC reserve data
    const usdcReserve = market.reserves.find((res: any) => 
      res.config.mintAddress.toString() === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    );
    
    // Load rewards data
    await market.loadRewards();

    // Return market data
    return {
      reserves: market.reserves.map((reserve: any) => ({
        mintAddress: reserve.config.mintAddress.toString(),
        loanToValueRatio: reserve.config.loanToValueRatio,
        totalDeposits: reserve.stats.totalDepositsWads.toString(),
        totalSupplyAPY: reserve.stats.totalSupplyAPY()
      })),
      usdcReserve: usdcReserve ? {
        totalDeposits: usdcReserve.stats.totalDepositsWads.toString(),
        totalSupplyAPY: usdcReserve.stats.totalSupplyAPY()
      } : null
    };
  } catch (error) {
    console.error('Error fetching Solend market data:', error);
    throw error;
  }
} 