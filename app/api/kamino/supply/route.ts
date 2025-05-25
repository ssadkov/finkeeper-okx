import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket, KaminoAction, VanillaObligation } from '@kamino-finance/klend-sdk';
import { BN } from 'bn.js';

// Kamino Lending Program ID
const PROGRAM_ID = new PublicKey('KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD');
// Main Market ID
const MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

// GetBlock RPC endpoint
const RPC_ENDPOINT = 'https://go.getblock.io/fdb42ef4c1254d90adfc4c40b8a9969e';

export async function POST(request: Request) {
    try {
        const { amount, symbol, walletAddress } = await request.json();
        console.log('Received request:', { amount, symbol, walletAddress });

        if (!amount || !symbol || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        console.log('Connecting to Solana network...');
        const connection = new Connection(RPC_ENDPOINT, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000
        });

        console.log('Loading Kamino market...');
        const kaminoMarket = await KaminoMarket.load(
            connection,
            MAIN_MARKET,
            0,
            PROGRAM_ID
        );

        if (!kaminoMarket) {
            throw new Error('Failed to load Kamino market');
        }

        console.log('Market loaded successfully');
        
        // Load reserves data
        console.log('Loading reserves...');
        await kaminoMarket.loadReserves();
        console.log('Reserves loaded successfully');

        // Log all reserves from the market
        console.log('\n=== ALL MARKET RESERVES ===');
        Array.from(kaminoMarket.reserves.entries()).forEach(([key, reserve]) => {
            console.log(`\nReserve ${key.toString()}:`);
            console.log('- Address:', reserve.address.toString());
            console.log('- Stats:', JSON.stringify(reserve.stats, null, 2));
            console.log('- State:', JSON.stringify(reserve.state, null, 2));
        });
        console.log('=========================\n');

        // Find reserve by symbol
        const reserve = Array.from(kaminoMarket.reserves.values()).find(
            (r: any) => r.stats?.symbol === symbol
        );
        
        if (!reserve) {
            console.error('Reserve not found for symbol:', symbol);
            console.log('Available symbols:', Array.from(kaminoMarket.reserves.values()).map((r: any) => r.stats?.symbol));
            throw new Error(`Reserve not found for symbol: ${symbol}`);
        }

        if (!reserve.stats) {
            throw new Error(`Invalid reserve data for symbol: ${symbol}`);
        }

        // Log reserve details with clear prefixes
        console.log('\n=== KAMINO RESERVE DETAILS ===');
        console.log('Reserve Address:', reserve.address.toString());
        console.log('\nReserve Stats:');
        console.log('- Symbol:', reserve.stats.symbol);
        console.log('- Decimals:', reserve.stats.decimals);
        console.log('- Loan to Value %:', reserve.stats.loanToValuePct);
        console.log('- Borrow Factor:', reserve.stats.borrowFactor);
        
        console.log('\nReserve State:');
        console.log('- Borrowed Amount:', reserve.state?.borrowedAmountOutsideElevationGroup?.toString());
        console.log('- Total Supply:', reserve.state?.mintTotalSupply?.toString());
        console.log('=============================\n');

        console.log('Found reserve:', {
            symbol: reserve.stats.symbol,
            decimals: reserve.stats.decimals,
            address: reserve.address.toString()
        });

        // Convert amount to proper format (considering decimals)
        const decimals = reserve.stats.decimals;
        const amountBase = new BN(Math.floor(amount * Math.pow(10, decimals)));
        console.log('Converted amount:', {
            original: amount,
            decimals,
            base: amountBase.toString()
        });

        console.log('Building deposit transaction...');
        console.log('Parameters:', {
            market: kaminoMarket.address.toString(),
            amountBase: amountBase.toString(),
            symbol,
            walletAddress,
            reserveAddress: reserve.address.toString()
        });

        // Build the deposit transaction using the static method
        const txns = await KaminoAction.buildDepositTxns(
            kaminoMarket,
            amountBase,
            reserve.address, // Use reserve address directly
            new PublicKey(walletAddress),
            new VanillaObligation(PROGRAM_ID),
            undefined, // useElevationGroup
            undefined, // useReferral
            undefined, // referralCode
            undefined, // elevationGroup
            undefined, // elevationGroupId
            undefined, // elevationGroupConfig
            undefined // elevationGroupConfigId
        );

        console.log('Transaction built successfully');

        // Return the transaction data to be signed by the client
        return NextResponse.json({
            success: true,
            transaction: txns
        });

    } catch (error) {
        console.error('Error in supply transaction:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process supply transaction' },
            { status: 500 }
        );
    }
} 