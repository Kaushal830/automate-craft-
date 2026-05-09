import Link from "next/link";
import {
  Zap,
  Link2,
  LayoutGrid,
  Activity,
  PenTool,
} from "lucide-react";

const mainLinks = [
  {
    icon: Zap,
    label: "How It Works",
    desc: "See the 3-step flow",
    href: "/why-us",
  },
  {
    icon: Link2,
    label: "Integrations",
    desc: "60+ connected apps",
    href: "/integrations",
  },
  {
    icon: LayoutGrid,
    label: "Templates",
    desc: "Start from a recipe",
    href: "/templates",
  },
  {
    icon: Activity,
    label: "Status",
    desc: "System health",
    href: "/status",
  },
  {
    icon: PenTool,
    label: "Blog",
    desc: "Tips & tutorials",
    href: "/blog",
  },
];

export default function ProductMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex w-[420px] gap-5 p-5">
      {/* Main links */}
      <div className="flex-1">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Product
        </span>
        <div className="space-y-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] group-hover:bg-accent/10 transition-colors">
                  <Icon className="h-3.5 w-3.5 text-white/40 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-white/70 group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                  <span className="block text-[11px] text-white/25 group-hover:text-white/40 transition-colors">
                    {link.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured card */}
      <div className="w-[150px] shrink-0">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Featured
        </span>
        <Link
          href="/templates"
          onClick={onNavigate}
          className="group block rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-all hover:border-white/[0.08] hover:bg-white/[0.04]"
        >
          <span className="block text-[12px] font-semibold text-accent/70 group-hover:text-accent transition-colors">
            12+ templates
          </span>
          <span className="mt-1 block text-[11px] leading-[1.5] text-white/25">
            Pre-built workflows for sales, support & ops.
          </span>
        </Link>
      </div>
    </div>
  );
}
