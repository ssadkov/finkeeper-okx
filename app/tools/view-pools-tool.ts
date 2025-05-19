import { tool } from 'ai';
import { z } from 'zod';

interface ProcessedPool {
  name: string;
  protocol: string;
  tvl: number;
  apy: number;
  tokens: Record<string, number>;
}

export const viewPoolsTool = tool({
  description: 'Show lending pools for the specified token and type (stable or all)',
  parameters: z.object({
    token: z.string().describe('Category of tokens for fetching pools: stable or all'),
    type: z.enum(['stable', 'all']).describe('Pool type: stable (usd) or all tokens'),
  }),
  async execute({ token, type }) {
    try {
      const simplifyInvestType = type === 'stable' ? '100' : '101';
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000'}/api/defi/products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            simplifyInvestType,
            network: "SOL",
            offset: "0",
            sort: {
              orders: [{
                direction: "DESC",
                property: "RATE"
              }]
            },
            search: token
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processedPools: ProcessedPool[] = (data.data?.investments || []).map((pool: any) => ({
        name: pool.investmentName,
        protocol: pool.platformName,
        tvl: Number(pool.tvl),
        apy: Number(pool.rate) * 100,
        tokens: (pool.underlyingToken || []).reduce((acc: Record<string, number>, t: any) => {
          acc[t.tokenSymbol] = 1;
          return acc;
        }, {}),
      }));

      console.log('Processed pools for PoolsView:', processedPools);

      return {
        type: 'ui',
        component: 'PoolsView',
        props: {
          message: processedPools.length
            ? `Found pools: ${processedPools.length}`
            : 'No pools found',
          pools: processedPools
        }
      };
    } catch (error) {
      console.error('Error fetching pools:', error);
      return {
        type: 'ui',
        component: 'PoolsView',
        props: {
          message: 'Error fetching pool data',
          pools: []
        }
      };
    }
  }
}); 