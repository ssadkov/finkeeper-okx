import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('id');
    const network = searchParams.get('network');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const url = new URL('https://app.finkeeper.pro/ideasapi/datas/tokens');
    url.searchParams.append('id', apiKey);
    if (network) {
      url.searchParams.append('network', network);
    }

    console.log('Fetching tokens from:', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    console.log('API response:', data);

    // Проверяем код ответа API
    if (data.code === 1 || data.code === "1") {
      return NextResponse.json({ error: data.msg || 'API Error' }, { status: 400 });
    }

    // Проверяем наличие данных
    if (!data || !data.tokens) {
      return NextResponse.json({ error: 'Invalid API response format' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Token API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch token data' },
      { status: 500 }
    );
  }
} 