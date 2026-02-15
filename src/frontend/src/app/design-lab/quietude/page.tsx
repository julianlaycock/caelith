import Link from 'next/link';
import { QuietudeRender } from './quietude-render';
import { QUIETUDE_VARIANT_LIST } from './variants';

export default function QuietudeGalleryPage() {
  return (
    <div className="min-h-screen bg-[#ECE8DF] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1320px]">
        <header className="mb-6 rounded-2xl border border-[#C6BEB1] bg-[#F5F1E8] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5A524B]">
            Caelith Design Lab
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#2E2823] md:text-3xl">
            Quietude Palette Exploration
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5A524B]">
            Four premium, tech-forward UI renders mapped to the same product architecture. Each variant preserves
            Caelith workflows while tuning tone, hierarchy, and contrast for different executive narratives.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUIETUDE_VARIANT_LIST.map((variant) => (
              <Link
                key={variant.id}
                href={`/design-lab/quietude/${variant.id}`}
                className="rounded-lg border border-[#BDB4A6] bg-[#E8E3D7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#433D37] transition hover:bg-[#DED7CA]"
              >
                Open {variant.id.toUpperCase()} · {variant.name}
              </Link>
            ))}
          </div>
        </header>

        <div className="space-y-10">
          {QUIETUDE_VARIANT_LIST.map((variant) => (
            <section key={variant.id} className="overflow-hidden rounded-2xl border border-[#C6BEB1] bg-[#F8F4EB]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1C9BB] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6A6259]">
                    Variant {variant.id.toUpperCase()}
                  </p>
                  <h2 className="text-lg font-semibold text-[#2D2722]">
                    {variant.name}
                  </h2>
                  <p className="text-sm text-[#5A524B]">{variant.tagline}</p>
                </div>
                <Link
                  href={`/design-lab/quietude/${variant.id}`}
                  className="rounded-lg border border-[#BDB4A6] bg-[#E8E3D7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#433D37] transition hover:bg-[#DED7CA]"
                >
                  Direct URL
                </Link>
              </div>
              <QuietudeRender variant={variant} showTopNav={false} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
