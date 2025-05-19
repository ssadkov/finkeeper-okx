"use client";
import { useChat } from '@ai-sdk/react';
import { WalletView } from './chat/WalletView';
import { PoolsView } from './chat/PoolsView';

interface MessagePart {
  type: string;
  text?: string;
  component?: string;
  props?: Record<string, any>;
  toolInvocation?: {
    toolName: string;
    result?: any;
  };
}

interface Message {
  id?: string;
  role: string;
  parts: MessagePart[];
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  console.log('Chat messages:', JSON.stringify(messages, null, 2));

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] w-full max-w-2xl mx-auto bg-white rounded-lg shadow p-4">
      <div className="flex-grow overflow-y-auto mb-4 space-y-4">
        {messages.map((message: Message, idx) => {
          console.log('Processing message:', JSON.stringify(message, null, 2));
          return (
            <div key={message.id ?? idx} className="whitespace-pre-wrap">
              <span className="font-semibold">{message.role === 'user' ? 'User:' : 'AI:'} </span>
              {message.parts.map((part: MessagePart, i) => {
                console.log('Processing part:', JSON.stringify(part, null, 2));
                if (part.type === 'text') {
                  return <span key={i}>{part.text}</span>;
                }
                if (part.type === 'tool-invocation') {
                  console.log('Tool invocation detected:', part.toolInvocation);
                  if (part.toolInvocation?.toolName === 'viewWalletTool') {
                    console.log('Rendering WalletView from tool invocation');
                    return <WalletView key={i} message={part.toolInvocation.result?.props?.message || 'Wallet information'} />;
                  }
                  if (part.toolInvocation?.toolName === 'viewPoolsTool') {
                    console.log('Rendering PoolsView from tool invocation');
                    return <PoolsView key={i} {...(part.toolInvocation?.result?.props || {})} />;
                  }
                }
                if (part.type === 'ui') {
                  console.log('UI component detected:', part.component);
                  if (part.component === 'WalletView') {
                    console.log('Rendering WalletView with props:', part.props);
                    return <WalletView key={i} message={part.props?.message || 'Wallet information'} />;
                  }
                }
                console.log('No matching renderer for part:', JSON.stringify(part, null, 2));
                return null;
              })}
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          placeholder="Type your message..."
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
} 