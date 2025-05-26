import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://finkeeper.pro/getprice?symbol=${symbol}`, {
      headers: {
        'Accept': 'text/plain',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const price = await response.text();
    return new NextResponse(price, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
} 