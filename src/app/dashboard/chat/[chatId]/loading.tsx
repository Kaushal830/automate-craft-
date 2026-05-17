export default function ChatLoading() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#0a0a0a] items-center justify-center">
      <div className="flex flex-col items-center max-w-sm w-full gap-0 px-8 relative">
        
        {/* Node 1 Skeleton */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.04] bg-[#0c0c0e] px-5 py-4 w-full relative z-10 shadow-lg">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.05] animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <div className="h-2 w-1/3 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-2.5 w-2/3 rounded bg-white/[0.1] animate-pulse" />
          </div>
        </div>
        
        {/* Connector Skeleton */}
        <div className="h-10 w-px bg-gradient-to-b from-white/[0.08] to-white/[0.02] animate-pulse" />
        
        {/* Node 2 Skeleton */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.04] bg-[#0c0c0e] px-5 py-4 w-full relative z-10 shadow-lg">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.05] animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <div className="h-2 w-1/4 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-2.5 w-3/4 rounded bg-white/[0.1] animate-pulse" />
          </div>
        </div>

        {/* Ambient Loading Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/5 rounded-full blur-[80px] animate-pulse z-0 pointer-events-none" />
        
        <div className="text-[12px] text-white/30 font-mono animate-pulse mt-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent/60" />
          Allocating workflow engine...
        </div>
      </div>
    </div>
  );
}
