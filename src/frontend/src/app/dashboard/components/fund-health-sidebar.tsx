import { classNames } from '../../../lib/utils';
import type { FundReportPair } from '../../../lib/dashboard-utils';

export function FundHealthSidebar({ fundReports }: { fundReports: FundReportPair[] }) {
  if (fundReports.length === 0) return null;

  return (
    <div className="rounded-xl border border-edge bg-surface p-3.5">
      <div className="text-xs font-bold text-[#C5E0EE] mb-2.5">Fund Health</div>
      <div className="space-y-1.5">
        {fundReports.map(({ fund, report }) => {
          const high = report.risk_flags.filter(f => f.severity === 'high').length;
          const med = report.risk_flags.filter(f => f.severity === 'medium').length;
          const isGood = high === 0 && med === 0;

          const bgClass = high > 0
            ? 'bg-[rgba(248,113,113,0.06)] border-[rgba(252,165,165,0.08)]'
            : med > 0
            ? 'bg-[rgba(232,168,124,0.06)] border-[rgba(240,201,166,0.08)]'
            : 'bg-[rgba(110,231,183,0.06)] border-[rgba(187,247,208,0.08)]';

          const dotColor = high > 0 ? 'bg-[#fca5a5]' : med > 0 ? 'bg-[#f0c9a6]' : 'bg-[#bbf7d0]';
          const textColor = high > 0 ? 'text-[#fca5a5]' : med > 0 ? 'text-[#f0c9a6]' : 'text-[#bbf7d0]';
          const label = isGood ? 'All clear' : `${high > 0 ? `${high} high` : ''}${high > 0 && med > 0 ? ' · ' : ''}${med > 0 ? `${med} med` : ''}`;

          return (
            <div key={fund.id} className={classNames('flex items-center gap-2 px-2.5 py-[7px] rounded-lg border', bgClass)}>
              <div className={classNames('w-2 h-2 rounded-full flex-shrink-0', dotColor)} />
              <span className="text-[11px] text-ink flex-1 truncate">{fund.name.split(' ')[0]}</span>
              <span className={classNames('text-[10px] font-semibold', textColor)}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
