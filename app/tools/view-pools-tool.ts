import { tool } from 'ai';
import { z } from 'zod';

export const viewPoolsTool = tool({
  description: 'Show lending pools',
  parameters: z.object({}),
  async execute() {
    console.log('Executing viewPoolsTool');
    const result = {
      type: 'ui',
      component: 'PoolsView',
      props: {
        message: 'Best pools on Solana'
      }
    };
    console.log('viewPoolsTool result:', result);
    return result;
  },
}); 