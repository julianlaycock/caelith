'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import type { Investor, FundStructure } from '../lib/types';

interface CommandItem {
  id: string;
  category: 'page' | 'action' | 'investor' | 'fund';
  name: string;
  subtitle?: string;
  onSelect: () => void;
}

const categoryMeta: Record<string, { label: string; order: number }> = {
  page: { label: 'Pages', order: 0 },
  action: { label: 'Quick Actions', order: 1 },
  investor: { label: 'Investors', order: 2 },
  fund: { label: 'Funds', order: 3 },
};

const PAGE_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ACTION_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const INVESTOR_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const FUND_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
);

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  page: PAGE_ICON,
  action: ACTION_ICON,
  investor: INVESTOR_ICON,
  fund: FUND_ICON,
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [investors, setInvestors] = useState<Investor[] | null>(null);
  const [funds, setFunds] = useState<FundStructure[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);

    if (!investors) {
      api.getInvestors().then(setInvestors).catch(() => setInvestors([]));
    }
    if (!funds) {
      api.getFundStructures().then(setFunds).catch(() => setFunds([]));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const navigate = useCallback((href: string) => {
    close();
    router.push(href);
  }, [close, router]);

  const staticItems = useMemo<CommandItem[]>(() => [
    { id: 'p-dashboard', category: 'page', name: 'Dashboard', subtitle: 'Overview & metrics', onSelect: () => navigate('/') },
    { id: 'p-funds', category: 'page', name: 'Funds', subtitle: 'Fund structures', onSelect: () => navigate('/funds') },
    { id: 'p-investors', category: 'page', name: 'Investors', subtitle: 'Investor registry', onSelect: () => navigate('/investors') },
    { id: 'p-transfers', category: 'page', name: 'Transfers', subtitle: 'Transfer management', onSelect: () => navigate('/transfers') },
    { id: 'p-rules', category: 'page', name: 'Rules', subtitle: 'Compliance rules', onSelect: () => navigate('/rules') },
    { id: 'p-activity', category: 'page', name: 'Audit', subtitle: 'Audit log & decisions', onSelect: () => navigate('/audit') },
    { id: 'p-onboarding', category: 'page', name: 'Onboarding', subtitle: 'Investor onboarding', onSelect: () => navigate('/onboarding') },
    { id: 'a-new-fund', category: 'action', name: 'New Fund', subtitle: 'Create a fund structure', onSelect: () => navigate('/funds?new=true') },
    { id: 'a-add-investor', category: 'action', name: 'Add Investor', subtitle: 'Register new investor', onSelect: () => navigate('/investors?new=true') },
    { id: 'a-simulate', category: 'action', name: 'Simulate Transfer', subtitle: 'Test transfer compliance', onSelect: () => navigate('/transfers?simulate=true') },
    {
      id: 'a-copilot',
      category: 'action',
      name: 'Open Copilot',
      subtitle: 'AI compliance assistant',
      onSelect: () => {
        close();
        window.dispatchEvent(new CustomEvent('caelith:open-copilot'));
      },
    },
  ], [navigate, close]);

  const dynamicItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    if (investors) {
      for (const inv of investors) {
        items.push({
          id: `inv-${inv.id}`,
          category: 'investor',
          name: inv.name,
          subtitle: `${inv.investor_type} - ${inv.jurisdiction}`,
          onSelect: () => navigate(`/investors/${inv.id}`),
        });
      }
    }
    if (funds) {
      for (const f of funds) {
        items.push({
          id: `fund-${f.id}`,
          category: 'fund',
          name: f.name,
          subtitle: `${f.legal_form} - ${f.domicile}`,
          onSelect: () => navigate(`/funds/${f.id}`),
        });
      }
    }
    return items;
  }, [investors, funds, navigate]);

  const allItems = useMemo(() => [...staticItems, ...dynamicItems], [staticItems, dynamicItems]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const byCategory: Record<string, CommandItem[]> = {};

    for (const item of allItems) {
      if (q && !item.name.toLowerCase().includes(q) && !(item.subtitle?.toLowerCase().includes(q))) continue;
      if (!byCategory[item.category]) byCategory[item.category] = [];
      if (byCategory[item.category].length < 3) {
        byCategory[item.category].push(item);
      }
    }

    return Object.entries(byCategory).sort(
      ([a], [b]) => (categoryMeta[a]?.order ?? 99) - (categoryMeta[b]?.order ?? 99)
    );
  }, [query, allItems]);

  const flatFiltered = useMemo(() => filtered.flatMap(([, items]) => items), [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flatFiltered[selectedIndex]?.onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }, [flatFiltered, selectedIndex, close]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] animate-fade-in" onKeyDown={handleKeyDown}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 w-full max-w-lg mx-4 md:mx-auto overflow-hidden rounded-xl border border-edge bg-bg-secondary shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3 border-b border-edge-subtle px-4 py-3">
          <svg className="h-5 w-5 flex-shrink-0 text-ink-tertiary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, investors, funds..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
          />
          <kbd className="hidden items-center rounded border border-edge-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:inline-flex">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-tertiary">No results found</div>
          ) : (
            filtered.map(([category, items]) => (
              <div key={category}>
                <div className="px-4 pb-1 pt-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                    {categoryMeta[category]?.label ?? category}
                  </span>
                </div>
                {items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? 'border-l-accent-400 bg-bg-tertiary'
                          : 'border-l-transparent hover:bg-bg-tertiary'
                      }`}
                    >
                      <span className="flex-shrink-0 text-ink-tertiary">{CATEGORY_ICONS[item.category]}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{item.name}</span>
                        {item.subtitle && <span className="block truncate text-xs text-ink-secondary">{item.subtitle}</span>}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-ink-muted">{categoryMeta[item.category]?.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
