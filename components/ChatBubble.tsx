'use client';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export default function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
  const isBot = role === 'assistant';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isBot
            ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
            : 'bg-[#1B5E4B] text-white rounded-tr-sm'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    </div>
  );
}
