'use client';

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import ContactForm from './ContactForm';
import RatingWidget from './RatingWidget';
import type { TranscriptBlob } from '@/types/chat';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; ts: string }
type Overlay = 'none' | 'approval' | 'rating' | 'try-again' | 'contact' | 'done';

const GREETING = "Hi! I'm the TPT Bot. Ask me anything about Teachers Pay Teachers and I'll find the right help article for you.";

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center h-10">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg, streaming }: { msg: Msg; streaming?: boolean }) {
  const isBot = msg.role === 'assistant';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words
        ${isBot ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'bg-[#1B5E4B] text-white rounded-tr-sm'}`}
        /* render markdown links from bot */
        dangerouslySetInnerHTML={isBot ? { __html: renderMarkdown(msg.content) } : undefined}
      >
        {!isBot && msg.content}
        {isBot && streaming && !msg.content && null /* show TypingDots instead */}
      </div>
    </div>
  );
}

/** Minimal markdown: bold, inline links — safe, no user-controlled HTML */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="underline text-[#1B5E4B]">$1</a>')
    .replace(/\n/g, '<br/>');
}

function extractUrls(text: string) {
  return [...new Set((text.match(/https?:\/\/[^\s)<>"]+/g) ?? []))];
}

function useIsMobile() {
  const [v, set] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    set(mq.matches);
    const h = (e: MediaQueryListEvent) => set(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return v;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 'g', role: 'assistant', content: GREETING, ts: '' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);    // show dots
  const [streaming, setStreaming] = useState(false); // response in-progress
  const [overlay, setOverlay] = useState<Overlay>('none');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcript = useRef<TranscriptBlob>({
    sessionId: crypto.randomUUID(),
    timestamp: '',
    ipAddress: 'collected-server-side',
    messages: [],
    urlsMentioned: [],
  });
  const isMobile = useIsMobile();

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text.trim(), ts: new Date().toISOString() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setTyping(true);

    // history for API (skip static greeting)
    const history = [...msgs, userMsg]
      .filter(m => m.id !== 'g')
      .map(({ role, content }) => ({ role, content }));

    const botId = crypto.randomUUID();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.body) throw new Error('No body');

      setTyping(false);
      setStreaming(true);
      // Add empty bot bubble — will fill via stream
      setMsgs(p => [...p, { id: botId, role: 'assistant', content: '', ts: new Date().toISOString() }]);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            full += JSON.parse(payload).text ?? '';
            setMsgs(p => p.map(m => m.id === botId ? { ...m, content: full } : m));
          } catch {}
        }
      }

      // Update transcript
      transcript.current.messages.push(
        { id: userMsg.id, role: 'user', content: userMsg.content, timestamp: userMsg.ts },
        { id: botId, role: 'bot', content: full, timestamp: new Date().toISOString() },
      );
      transcript.current.urlsMentioned = [
        ...new Set([...transcript.current.urlsMentioned, ...extractUrls(full)]),
      ];
    } catch {
      setTyping(false);
      setMsgs(p => p.map(m => m.id === botId
        ? { ...m, content: 'Sorry, something went wrong. Please try again.' } : m));
    } finally {
      setStreaming(false);
    }
  }, [msgs, streaming]);

  function handleSubmit(e: FormEvent) { e.preventDefault(); send(input); }

  function handleClose() {
    const hadConvo = msgs.some(m => m.role === 'user');
    if (overlay !== 'none') { setOverlay('none'); return; }
    if (hadConvo) { setOverlay('approval'); } else { setIsOpen(false); }
  }

  function handleThumbsUp() { setOverlay('rating'); }
  function handleThumbsDown() { setOverlay('try-again'); }

  function handleRate(stars: number) {
    transcript.current.rating = stars;
    transcript.current.timestamp = new Date().toISOString();
    logAndDone();
  }

  function handleContactSubmit(email: string) {
    transcript.current.contactInfo = { name: '', email };
    transcript.current.timestamp = new Date().toISOString();
    logAndDone();
  }

  function logAndDone() {
    console.log('TPT Bot Transcript:', JSON.stringify(transcript.current, null, 2));
    setOverlay('done');
    setTimeout(() => { setIsOpen(false); setOverlay('none'); }, 1200);
  }

  const panelClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-white'
    : 'fixed bottom-24 right-6 z-50 w-96 h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden';

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {showTooltip && !isOpen && (
          <div className="relative bg-white text-gray-800 text-sm rounded-xl shadow-lg px-4 py-2 max-w-[220px] text-center">
            I&apos;m the TPT Bot! Ask me a question for instant support.
            <span className="absolute -bottom-2 right-6 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
          </div>
        )}
        <button
          onClick={() => setIsOpen(o => !o)}
          onMouseEnter={() => { if (!isOpen) setShowTooltip(true); }}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
          className="w-14 h-14 rounded-full bg-[#1B5E4B] text-white text-2xl font-bold shadow-lg hover:bg-[#2a7a62] transition-colors flex items-center justify-center"
        >
          {isOpen ? '✕' : '?'}
        </button>
      </div>

      {/* Panel */}
      {isOpen && (
        <div className={panelClass}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1B5E4B] text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">T</div>
              <span className="font-semibold">TPT Bot</span>
            </div>
            <button onClick={handleClose} aria-label="Close" className="text-white/80 hover:text-white text-xl p-1">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
            {msgs.map(m => <Bubble key={m.id} msg={m} />)}
            {typing && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question…"
              disabled={streaming}
              className="flex-1 px-4 py-2 text-sm rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B5E4B] focus:border-transparent disabled:opacity-50"
            />
            <button type="submit" disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-full bg-[#1B5E4B] text-white flex items-center justify-center hover:bg-[#2a7a62] disabled:opacity-40 transition-colors shrink-0"
              aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>

          {/* Overlay */}
          {overlay !== 'none' && (
            <div className="absolute inset-0 bg-black/40 flex items-end z-10">
              <div className="w-full bg-white rounded-t-2xl p-5 shadow-xl">

                {overlay === 'approval' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold text-gray-800 text-center">Did that answer your question?</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={handleThumbsUp}
                        className="flex-1 py-3 rounded-full text-2xl bg-[#1B5E4B]/10 hover:bg-[#1B5E4B]/20 transition-colors"
                        aria-label="Yes">👍</button>
                      <button onClick={handleThumbsDown}
                        className="flex-1 py-3 rounded-full text-2xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        aria-label="No">👎</button>
                    </div>
                    <button onClick={() => { setIsOpen(false); setOverlay('none'); }}
                      className="text-xs text-gray-400 hover:text-gray-600 text-center">Just close</button>
                  </div>
                )}

                {overlay === 'rating' && <RatingWidget onRate={handleRate} />}

                {overlay === 'try-again' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-gray-700 text-center">
                      Sorry about that! Try rephrasing your question, or leave your email and a support agent will follow up.
                    </p>
                    <button onClick={() => setOverlay('contact')}
                      className="w-full py-2.5 rounded-full text-sm font-semibold border-2 border-[#1B5E4B] text-[#1B5E4B] hover:bg-[#1B5E4B] hover:text-white transition-colors">
                      Leave my email
                    </button>
                    <button onClick={() => setOverlay('none')}
                      className="text-xs text-gray-400 hover:text-gray-600 text-center">I&apos;ll try again</button>
                  </div>
                )}

                {overlay === 'contact' && (
                  <ContactForm onSubmit={handleContactSubmit} onBack={() => setOverlay('try-again')} />
                )}

                {overlay === 'done' && (
                  <p className="text-sm text-gray-700 text-center py-2">Thanks for your feedback! 👋</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
