import { tool } from 'ai';
import { z } from 'zod';

export const viewWalletTool = tool({
  description: 'Get the connected wallet address',
  parameters: z.object({}),
  async execute() {
    console.log('Executing viewWalletTool');
    const result = {
      type: 'ui',
      component: 'WalletView',
      props: {
        message: 'Ваш кошелек подключен'
      }
    };
    console.log('viewWalletTool result:', result);
    return result;
  },
}); 