'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
}

let toastId = 0;
const listeners: Array<(msg: ToastMessage) => void> = [];

export function showToast(text: string) {
  const msg = { id: ++toastId, text };
  listeners.forEach((fn) => fn(msg));
}

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, 3000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="glass rounded-xl px-4 py-2 text-sm animate-[slideIn_0.3s_ease-out]"
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}
