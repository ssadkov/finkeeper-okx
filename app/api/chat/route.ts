import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { viewWalletTool } from '@/app/tools/view-wallet-tool';
import { viewPoolsTool } from '@/app/tools/view-pools-tool';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const result = await streamText({
      model: openai('gpt-4o'),
      messages,
      toolCallStreaming: true,
      maxSteps: 5,
      system: `You are a crypto finance assistant. You help users with their crypto portfolio and investments.
You can use the following tool:
- viewWalletTool: to view connected wallet address
- viewPoolsTool: to view lending pools on Solana 
Important:
1. Always respond in the same language as the user's message. If the user writes in Russian, respond in Russian. If the user writes in English, respond in English.`,
      tools: {
        viewWalletTool: viewWalletTool,
        viewPoolsTool: viewPoolsTool,
      },
    });
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        if (error instanceof Error) return error.message;
        return 'An error occurred';
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 