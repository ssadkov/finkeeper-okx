import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket } from '@kamino-finance/klend-sdk';

// Kamino Lending Program ID
const KAMINO_PROGRAM_ID = new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD');
// Main Market ID
const MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

// GetBlock RPC endpoint
const RPC_ENDPOINT = 'https://go.getblock.io/fdb42ef4c1254d90adfc4c40b8a9969e';

export async function GET() {
  try {
    console.log('Connecting to Solana network...');
    
    // Connect to Solana mainnet using GetBlock RPC
    const connection = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });
    
    // Load Kamino market
    console.log('Loading Kamino market...');
    console.log('Program ID:', KAMINO_PROGRAM_ID.toString());
    console.log('Market ID:', MAIN_MARKET.toString());
    
    const market = await KaminoMarket.load(
      connection,
      MAIN_MARKET,
      0, // Default slot duration
      KAMINO_PROGRAM_ID
    );

    if (!market) {
      throw new Error('Failed to load Kamino market');
    }

    console.log('Market loaded successfully');
    console.log('Number of reserves:', market.reserves.size);

    console.log('Loading reserves...');
    // Load reserves data
    await market.loadReserves();
    console.log('Reserves loaded successfully');

    // Transform market data
    const marketData = Array.from(market.reserves.entries()).map(([key, reserve]) => {
      console.log('Processing reserve:', key.toString());
      
      // Get reserve data
      const reserveData = reserve as any; // Temporary type assertion until we have proper types

      // Get the token symbol from the stats
      const symbol = reserveData?.stats?.symbol || 'Unknown';
      
      // Get loan to value ratio from stats
      const loanToValueRatio = reserveData?.stats?.loanToValuePct 
        ? reserveData.stats.loanToValuePct * 100 
        : 0;

      // Get total deposits from stats
      const totalDeposits = reserveData?.stats?.mintTotalSupply || 0;

      // Get total borrows from state
      const totalBorrows = reserveData?.state?.borrowedAmountOutsideElevationGroup 
        ? Number(reserveData.state.borrowedAmountOutsideElevationGroup) / Math.pow(10, reserveData.stats.decimals)
        : 0;

      // Calculate utilization rate
      const utilizationRate = totalDeposits > 0 
        ? (totalBorrows / totalDeposits) * 100 
        : 0;

      // Get APY values from stats
      const supplyApy = reserveData?.stats?.borrowFactor 
        ? reserveData.stats.borrowFactor / 100 
        : 0;

      const borrowApy = reserveData?.stats?.borrowFactor 
        ? (reserveData.stats.borrowFactor * 1.2) / 100 // Assuming borrow APY is 20% higher than supply APY
        : 0;

      // Log processed data
      console.log('Processed data for', symbol, {
        loanToValueRatio,
        totalDeposits,
        totalBorrows,
        utilizationRate,
        supplyApy,
        borrowApy
      });

      return {
        symbol,
        loanToValueRatio,
        totalDeposits,
        totalBorrows,
        utilizationRate,
        supplyApy,
        borrowApy
      };
    });

    console.log('Successfully fetched market data');
    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch market data' },
      { status: 500 }
    );
  }
} 