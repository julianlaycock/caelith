import Link from 'next/link';
import { Badge } from '../../../components/ui';
import { classNames } from '../../../lib/utils';
import type { FundReportPair } from '../../../lib/dashboard-utils';

export function FundBand({ fund, report }: FundReportPair) {
  const highFlags = report.risk_flags.filter(f => f.severity === 'high').length;
  const medFlags = report.risk_flags.filter(f => f.severity === 'medium').length;
  const totalInvestors = report.fund.total_investors;
  const capacity = report.fund.total_aum_units > 0
    ? Math.round((report.fund.total_allocated_units / report.fund.total_aum_units) * 100)
    : 0;

  let bandColor: { border: string; strip: string; bg: string; status: 'compliant' | 'warning' | 'critical' };
  if (highFlags > 0) {
    bandColor = {
      border: 'border-[rgba(248,113,113,0.12)]',
      strip: 'from-[#fca5a5] to-[#f87171]',
      bg: 'from-[rgba(248,113,113,0.05)] to-transparent',
      status: 'critical',
    };
  } else if (medFlags > 0) {
    bandColor = {
      border: 'border-[rgba(232,168,124,0.1)]',
      strip: 'from-[#f0c9a6] to-[#E8A87C]',
      bg: 'from-[rgba(232,168,124,0.04)] to-transparent',
      status: 'warning',
    };
  } else {
    bandColor = {
      border: 'border-[rgba(110,231,183,0.1)]',
      strip: 'from-[#bbf7d0] to-[#6ee7b7]',
      bg: 'from-[rgba(110,231,183,0.04)] to-transparent',
      status: 'compliant',
    };
  }

  const capacityColor = capacity > 70 ? 'text-[#E8A87C]' : capacity > 40 ? 'text-[#bbf7d0]' : 'text-[#a0cde0]';

  return (
    <Link href={`/funds/${fund.id}`} className="block group">
      <div className={classNames('flex rounded-xl overflow-hidden border transition-all hover:border-edge-strong', bandColor.border)}>
        <div className={classNames('w-[5px] flex-shrink-0 bg-gradient-to-b', bandColor.strip)} />
        <div className={classNames('flex-1 px-4 py-3.5 bg-gradient-to-r', bandColor.bg)}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[13px] font-semibold text-ink group-hover:text-[#C5E0EE] transition-colors">{fund.name}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="gray">{fund.legal_form}</Badge>
                <Badge variant="gray">{fund.domicile}</Badge>
                {bandColor.status === 'critical' && <Badge variant="red">{highFlags} high{medFlags > 0 ? ` · ${medFlags} med` : ''}</Badge>}
                {bandColor.status === 'warning' && <Badge variant="yellow">{medFlags} med</Badge>}
                {bandColor.status === 'compliant' && <Badge variant="green">Compliant</Badge>}
              </div>
            </div>
            <div className="flex gap-5 items-center">
              <div className="text-right">
                <div className={classNames('font-mono text-sm font-bold', capacityColor)}>{capacity}%</div>
                <div className="text-[9px] text-ink-tertiary">capacity</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold text-[#C5E0EE]">{totalInvestors}</div>
                <div className="text-[9px] text-ink-tertiary">investors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
