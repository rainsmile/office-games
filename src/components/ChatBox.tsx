'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  playerId: string;
  nickname: string;
  text: string;
  isCorrect?: boolean;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatBox({ messages, onSend, placeholder = '输入答案...', disabled }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="glass rounded-xl flex flex-col h-64">
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
        {messages.map((msg, i) => (
          <div key={i} className={msg.isCorrect ? 'text-green-400 font-semibold' : ''}>
            <span className="text-white/60">{msg.nickname}:</span> {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-black/25 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/50 disabled:opacity-50"
        />
      </form>
    </div>
  );
}
