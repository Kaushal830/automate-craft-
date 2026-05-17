import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/[0.06] blur-[160px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-accent-2/[0.04] blur-[120px]" />

      <div className="relative z-10 max-w-lg">
        {/* Glitch-style 404 */}
        <div className="mb-8 flex items-center justify-center">
          <span className="text-[8rem] font-light leading-none tracking-[-0.06em] text-white/[0.06] sm:text-[10rem]">
            4
          </span>
          <div className="mx-2 flex h-24 w-24 items-center justify-center rounded-3xl border border-accent/15 bg-accent/[0.06] sm:h-28 sm:w-28">
            <BrandMark compact showName={false} />
          </div>
          <span className="text-[8rem] font-light leading-none tracking-[-0.06em] text-white/[0.06] sm:text-[10rem]">
            4
          </span>
        </div>

        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-white/[0.35]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] hover:-translate-y-0.5"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-7 text-[15px] font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/20">
          <Link href="/pricing" className="transition-colors hover:text-white/50">Pricing</Link>
          <span className="text-white/8">·</span>
          <Link href="/docs" className="transition-colors hover:text-white/50">Documentation</Link>
          <span className="text-white/8">·</span>
          <Link href="/templates" className="transition-colors hover:text-white/50">Templates</Link>
          <span className="text-white/8">·</span>
          <Link href="/lets-talk" className="transition-colors hover:text-white/50">Contact</Link>
        </div>
      </div>
    </main>
  );
}
