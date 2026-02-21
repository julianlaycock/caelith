import { classNames } from '../../../lib/utils';

export function DeadlinesSidebar() {
  const deadlines = [
    { name: 'AIFMD II Annex IV', date: 'Mar 15', days: 23, urgent: true },
    { name: 'BaFin Annual Report', date: 'Apr 30', days: 69, urgent: false },
    { name: 'AMLR Implementation', date: 'Jul 2027', days: null, urgent: false },
  ];

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5">
      <div className="text-xs font-bold text-[#f0c9a6] mb-2.5">Upcoming Deadlines</div>
      <div className="space-y-1.5">
        {deadlines.map((d) => (
          <div
            key={d.name}
            className={classNames(
              'flex justify-between items-center text-[11px] px-2.5 py-1.5 rounded-md',
              d.urgent ? 'bg-[rgba(232,168,124,0.06)] border border-[rgba(240,201,166,0.08)]' : ''
            )}
          >
            <span className={d.urgent ? 'text-ink font-medium' : 'text-ink-secondary'}>{d.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={classNames('font-mono font-semibold', d.urgent ? 'text-[#f0c9a6]' : 'text-ink-tertiary')}>
                {d.date}
              </span>
              {d.days !== null && d.urgent && (
                <span className="text-[9px] font-bold text-[#2D3333] bg-gradient-to-br from-[#f0c9a6] to-[#E8A87C] px-1.5 py-[1px] rounded">
                  {d.days}d
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
