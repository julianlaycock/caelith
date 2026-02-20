'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../lib/api';
import type { CopilotResponse, CopilotCitation, CopilotSuggestedAction, ApiError } from '../lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  citations?: CopilotCitation[];
  suggestedActions?: CopilotSuggestedAction[];
}

const PAGE_PROMPTS: Record<string, { title: string; prompts: string[] }> = {
  '/': {
    title: 'Dashboard',
    prompts: [
      'Summarize my portfolio compliance status',
      'What risk flags need immediate attention?',
      'What are the SIF investor requirements?',
      'What if minimum investment changed to EUR 200K?',
    ],
  },
  '/funds': {
    title: 'Funds',
    prompts: [
      'What if minimum investment changed to €200K?',
      'Explain the difference between SIF and RAIF',
      'What CSSF requirements apply to my fund?',
      'Which investors would be affected by new criteria?',
    ],
  },
  '/investors': {
    title: 'Investors',
    prompts: [
      'What are the well-informed investor requirements?',
      'Explain KYC/AML requirements for fund investors',
      'What is the EUR 125,000 minimum investment rule?',
      'Which investor types qualify for SIF funds?',
    ],
  },
  '/transfers': {
    title: 'Transfers',
    prompts: [
      'Why was the last transfer rejected?',
      'What checks are applied to transfer validation?',
      'What if minimum investment changed to EUR 200K?',
      'Explain transfer restriction rules',
    ],
  },
  '/rules': {
    title: 'Rules',
    prompts: [
      'Create a rule to block retail investors',
      'What eligibility rules should a SIF fund have?',
      'Draft a rule for EUR 125K minimum investment',
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
  '/decisions': {
    title: 'Decisions',
    prompts: [
      'Explain the last eligibility decision',
      'Why was the most recent transfer rejected?',
      'Show me decisions with violations',
      'What regulatory basis applies to investor type checks?',
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
  'What if minimum investment changed to EUR 200K?',
];

function getPromptsForPath(pathname: string): string[] {
  if (PAGE_PROMPTS[pathname]) return PAGE_PROMPTS[pathname].prompts;
  const prefix = '/' + pathname.split('/').filter(Boolean)[0];
  if (PAGE_PROMPTS[prefix]) return PAGE_PROMPTS[prefix].prompts;
  return DEFAULT_PROMPTS;
}

const COPILOT_ACK_KEY = 'caelith_copilot_acknowledged';

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
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COPILOT_ACK_KEY) === 'true';
  });
  const [ackChecked, setAckChecked] = useState(false);
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
          suggestedActions: response.suggestedActions,
        },
      ]);
    } catch (err) {
      const message = (err as ApiError)?.message || 'Compliance Copilot could not process this request. Please check your connection and try again. Your compliance data is unaffected.';
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
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />}

      <div
        className={`fixed right-0 top-0 z-50 flex h-full flex-col bg-[#2D3333] shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } w-full md:w-[480px] border-l border-edge`}
      >
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#24364A]/15">
              <svg className="h-4 w-4 text-[#24364A]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-ink">Compliance Copilot</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-tertiary hover:bg-bg-tertiary hover:text-ink"
            aria-label="Close copilot"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {open && !acknowledged && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#2D3333] px-6">
            <div className="w-full max-w-sm rounded-xl border border-edge bg-[#2D3333] p-6 shadow-lg">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 mx-auto">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="mb-2 text-center text-sm font-semibold text-ink">Before you proceed</h3>
              <p className="mb-4 text-xs leading-relaxed text-ink-secondary">
                The Compliance Copilot provides AI-generated informational assistance only. It does not constitute legal, regulatory, or compliance advice. All outputs require independent verification by a qualified professional before any reliance. Caelith shall not be liable for any loss, regulatory penalty, or adverse outcome arising from use of AI-generated content.
              </p>
              <label className="mb-4 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-edge accent-[#24364A]"
                />
                <span className="text-xs leading-relaxed text-ink-secondary">
                  I understand that Compliance Copilot outputs are informational only, do not constitute professional advice, and must be independently verified before reliance.
                </span>
              </label>
              <button
                disabled={!ackChecked}
                onClick={() => {
                  localStorage.setItem(COPILOT_ACK_KEY, 'true');
                  setAcknowledged(true);
                }}
                className="w-full rounded-lg bg-[#24364A] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1F2F40] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                I Understand — Continue
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#24364A]/10">
                <svg className="h-6 w-6 text-[#24364A]" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <p className="mb-1 text-sm font-medium text-ink">Compliance Copilot</p>
              <p className="mb-3 text-xs text-ink-tertiary">
                Ask questions about regulations, decisions, or draft rules using natural language.
              </p>
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                <p className="text-xs leading-relaxed text-amber-700 font-medium">
                  Compliance Copilot provides AI-generated informational assistance only. Responses do not constitute legal, regulatory, or compliance advice. All outputs require independent verification by a qualified professional before any reliance. Caelith does not provide legal advice and shall not be liable for decisions made using this tool.
                </p>
              </div>
              <div className="w-full space-y-2">
                {getPromptsForPath(pathname).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="w-full rounded-lg border border-edge px-3 py-2 text-left text-xs text-ink-secondary transition-colors hover:border-[#24364A]/30 hover:bg-[#24364A]/10"
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
                  msg.role === 'user' ? 'bg-[#24364A] text-white' : 'bg-bg-tertiary text-ink'
                }`}
              >
                {msg.role === 'assistant' && msg.intent && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="inline-block rounded bg-[#24364A]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#24364A]">
                      {msg.intent.replace('_', ' ')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500" title="AI-assisted regulatory interpretation — requires human review">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      Caelith AI
                    </span>
                  </div>
                )}
                <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-ink-tertiary mb-1">Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.citations.map((c, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/5 px-2 py-0.5 text-[10px] text-accent-300"
                          title={c.excerpt}
                        >
                          <svg className="h-2.5 w-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {c.documentTitle}
                          {c.articleRef ? `, ${c.articleRef}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.suggestedActions.map((sa, j) => (
                      <button
                        key={j}
                        onClick={(e) => {
                          e.stopPropagation();
                          sendMessage(sa.label);
                        }}
                        className="inline-flex items-center rounded-full border border-[#24364A]/20 bg-[#24364A]/5 px-2.5 py-1 text-[10px] font-medium text-[#24364A] transition-colors hover:bg-[#24364A]/10 hover:border-[#24364A]/30"
                      >
                        {sa.label}
                      </button>
                    ))}
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="mt-2 border-t border-edge-subtle pt-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium leading-tight text-amber-600">
                        AI-generated — not legal, regulatory, or compliance advice. Verify all content independently before reliance.
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const val = feedback[msg.id] === 'up' ? undefined : 'up';
                            setFeedback((prev) => {
                              const next = { ...prev };
                              if (val) next[msg.id] = val; else delete next[msg.id];
                              return next;
                            });
                            if (val) api.copilotFeedback(msg.id, 'up').catch(() => {});
                          }}
                          className={`rounded p-1 transition-colors ${
                            feedback[msg.id] === 'up'
                              ? 'text-emerald-500 bg-emerald-500/10'
                              : 'text-ink-muted hover:text-ink-secondary hover:bg-bg-tertiary'
                          }`}
                          title="Helpful"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48a4.53 4.53 0 01-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const val = feedback[msg.id] === 'down' ? undefined : 'down';
                            setFeedback((prev) => {
                              const next = { ...prev };
                              if (val) next[msg.id] = val; else delete next[msg.id];
                              return next;
                            });
                            if (val) api.copilotFeedback(msg.id, 'down').catch(() => {});
                          }}
                          className={`rounded p-1 transition-colors ${
                            feedback[msg.id] === 'down'
                              ? 'text-red-400 bg-red-500/10'
                              : 'text-ink-muted hover:text-ink-secondary hover:bg-bg-tertiary'
                          }`}
                          title="Not helpful"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 001.302-4.665c0-1.194-.232-2.333-.654-3.375z" />
                          </svg>
                        </button>
                      </div>
                    </div>
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
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600">
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

        <form onSubmit={handleSubmit} className="border-t border-edge p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about AIFMD eligibility, SIF requirements, or your fund's compliance..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-edge bg-bg-primary px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-[#24364A] focus:outline-none focus:ring-1 focus:ring-[#24364A]/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#24364A] text-white transition-colors hover:bg-[#1F2F40] disabled:opacity-40"
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
      className="fixed bottom-6 right-6 z-30 flex h-12 items-center gap-2.5 rounded-full bg-[#24364A] px-5 text-white shadow-lg transition-all hover:scale-105 hover:bg-[#1F2F40] hover:shadow-xl"
      title="Open Compliance Copilot"
    >
      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
      <span className="text-sm font-medium">Compliance Copilot</span>
    </button>
  );
}
