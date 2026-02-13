'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../lib/api';
import type { CopilotResponse, CopilotCitation, ApiError } from '../lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  citations?: CopilotCitation[];
}

const PAGE_PROMPTS: Record<string, { title: string; prompts: string[] }> = {
  '/': {
    title: 'Dashboard',
    prompts: [
      'Summarize my portfolio compliance status',
      'What risk flags need immediate attention?',
      'What are the SIF investor requirements?',
      'What if minimum investment changed to €200K?',
    ],
  },
  '/funds': {
    title: 'Funds',
    prompts: [
      'What legal forms are available for Luxembourg funds?',
      'Explain the difference between SIF and RAIF',
      'What CSSF requirements apply to my fund?',
      'What are the regulatory reporting deadlines?',
    ],
  },
  '/investors': {
    title: 'Investors',
    prompts: [
      'What are the well-informed investor requirements?',
      'Explain KYC/AML requirements for fund investors',
      'What is the €125,000 minimum investment rule?',
      'Which investor types qualify for SIF funds?',
    ],
  },
  '/transfers': {
    title: 'Transfers',
    prompts: [
      'Why was the last transfer rejected?',
      'What checks are applied to transfer validation?',
      'What if minimum investment changed to €200K?',
      'Explain transfer restriction rules',
    ],
  },
  '/rules': {
    title: 'Rules',
    prompts: [
      'Create a rule to block retail investors',
      'What eligibility rules should a SIF fund have?',
      'Draft a rule for €125K minimum investment',
      'Explain how composite rules work',
    ],
  },
  '/onboarding': {
    title: 'Onboarding',
    prompts: [
      'What documents are needed for investor onboarding?',
      'Explain the AML due diligence process',
      'What are the KYC requirements for professional investors?',
      'How long does CSSF approval typically take?',
    ],
  },
  '/audit': {
    title: 'Activity',
    prompts: [
      'What compliance events happened recently?',
      'Explain AIFMD audit trail requirements',
      'What records must be kept for CSSF inspections?',
      'How long must compliance records be retained?',
    ],
  },
};

const DEFAULT_PROMPTS = [
  'What are the SIF investor requirements?',
  'Why was the last transfer rejected?',
  'Create a rule to block retail investors',
  'What if minimum investment changed to €200K?',
];

function getPromptsForPath(pathname: string): string[] {
  // Exact match first
  if (PAGE_PROMPTS[pathname]) return PAGE_PROMPTS[pathname].prompts;
  // Prefix match (e.g., /funds/[id] → /funds)
  const prefix = '/' + pathname.split('/').filter(Boolean)[0];
  if (PAGE_PROMPTS[prefix]) return PAGE_PROMPTS[prefix].prompts;
  return DEFAULT_PROMPTS;
}

export function CopilotPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: trimmed }]);
    setLoading(true);

    try {
      const response: CopilotResponse = await api.copilotChat(trimmed, {
        currentPage: pathname,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.message,
          intent: response.intent,
          citations: response.citations,
        },
      ]);
    } catch (err) {
      const message = (err as ApiError)?.message || 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full flex-col bg-bg-secondary shadow-xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } w-full md:w-[400px]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15">
              <svg className="h-4 w-4 text-accent-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-ink">Compliance Copilot</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/10">
                <svg className="h-6 w-6 text-accent-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <p className="mb-1 text-sm font-medium text-ink">Compliance Copilot</p>
              <p className="mb-6 text-xs text-ink-tertiary">
                Ask questions about regulations, decisions, or draft rules using natural language.
              </p>
              <div className="w-full space-y-2">
                {getPromptsForPath(pathname).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-lg border border-edge px-3 py-2 text-left text-xs text-ink-secondary transition-colors hover:border-accent-500/30 hover:bg-accent-500/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent-500 text-white'
                    : 'bg-bg-tertiary text-ink'
                }`}
              >
                {msg.role === 'assistant' && msg.intent && (
                  <span className="mb-1 inline-block rounded bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-300">
                    {msg.intent.replace('_', ' ')}
                  </span>
                )}
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.citations.map((c, j) => (
                      <span
                        key={j}
                        className="inline-block rounded-full bg-bg-secondary/90 border border-edge px-2 py-0.5 text-[10px] text-ink-secondary"
                        title={c.excerpt}
                      >
                        {c.documentTitle}
                        {c.articleRef ? `, ${c.articleRef}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-bg-tertiary px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tertiary [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tertiary [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tertiary [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
              <button
                onClick={() => {
                  setError(null);
                  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                  if (lastUser) sendMessage(lastUser.content);
                }}
                className="ml-2 font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-edge p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a compliance question..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-edge bg-bg-primary text-ink px-3 py-2 text-sm placeholder:text-ink-muted focus:border-accent-400 focus:outline-none focus:ring-1 focus:ring-accent-400/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white transition-colors hover:bg-accent-600 disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export function CopilotToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg transition-all hover:bg-accent-600 hover:shadow-xl hover:scale-105"
      title="Open Compliance Copilot"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    </button>
  );
}
