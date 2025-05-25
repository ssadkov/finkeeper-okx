import { NextResponse } from 'next/server';
import { getMarginfiClient } from "@/app/utils/marginfi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const client = await getMarginfiClient();
    const accounts = await client.getMarginfiAccountsForAuthority(walletAddress);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching MarginFi accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MarginFi accounts' },
      { status: 500 }
    );
  }
} 