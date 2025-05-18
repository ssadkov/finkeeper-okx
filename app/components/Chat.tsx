"use client";
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col h-[500px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow p-4">
      <div className="flex-grow overflow-y-auto mb-4 space-y-4">
        {messages.map((message, idx) => (
          <div key={message.id ?? idx} className="whitespace-pre-wrap">
            <span className="font-semibold">{message.role === 'user' ? 'User:' : 'AI:'} </span>
            {message.parts.map((part, i) => {
              if (part.type === 'text') {
                return <span key={i}>{part.text}</span>;
              }
              return null;
            })}
          </div>
        ))}
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