export function SkeletonBanner() {
  return (
    <div className="rounded-xl border border-edge bg-bg-secondary p-5 animate-pulse mb-5">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-5 w-48 rounded bg-bg-tertiary mb-2" />
          <div className="h-3 w-64 rounded bg-bg-tertiary" />
        </div>
        <div className="flex gap-6">
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
          <div className="h-10 w-12 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonFundBand() {
  return (
    <div className="flex rounded-xl overflow-hidden border border-edge animate-pulse">
      <div className="w-[5px] bg-bg-tertiary flex-shrink-0" />
      <div className="flex-1 p-4">
        <div className="h-4 w-40 rounded bg-bg-tertiary mb-2" />
        <div className="flex gap-2">
          <div className="h-5 w-12 rounded bg-bg-tertiary" />
          <div className="h-5 w-10 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-edge bg-bg-secondary p-4 animate-pulse">
        <div className="h-4 w-24 rounded bg-bg-tertiary mb-3" />
        <div className="space-y-2">
          <div className="h-8 rounded bg-bg-tertiary" />
          <div className="h-8 rounded bg-bg-tertiary" />
          <div className="h-8 rounded bg-bg-tertiary" />
        </div>
      </div>
    </div>
  );
}
