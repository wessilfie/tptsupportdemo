'use client';

import { useState } from 'react';

interface ContactFormProps {
  onSubmit: (email: string) => void;
  onBack: () => void;
}

export default function ContactForm({ onSubmit, onBack }: ContactFormProps) {
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) onSubmit(email.trim());
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-700">
        Enter your email and we&apos;ll send your conversation to our support team.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5E4B] focus:border-transparent"
        />
        <button
          type="submit"
          className="w-full py-2 rounded-full text-sm font-semibold bg-[#1B5E4B] text-white hover:bg-[#2a7a62] transition-colors"
        >
          Send to support
        </button>
      </form>
      <button
        onClick={onBack}
        className="text-xs text-gray-400 hover:text-gray-600 text-center"
      >
        ← Back
      </button>
    </div>
  );
}
