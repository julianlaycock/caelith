export function ComplianceScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? '#6ee7b7' : score >= 60 ? '#E8A87C' : '#f87171';
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-11 h-11">
        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(197,224,238,0.1)" strokeWidth="2.5" />
          <circle
            cx="22" cy="22" r="18" fill="none"
            stroke={color} strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-extrabold" style={{ color }}>
          {score}
        </span>
      </div>
      <div>
        <div className="text-[10px] font-semibold" style={{ color }}>Score</div>
        <div className="text-[9px] text-ink-tertiary">{label}</div>
      </div>
    </div>
  );
}
