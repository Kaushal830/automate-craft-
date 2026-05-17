import Link from "next/link";
import {
  Rocket,
  Settings,
  Building2,
  Headphones,
} from "lucide-react";

const personas = [
  {
    icon: Rocket,
    label: "Startups",
    desc: "Ship faster",
    href: "/solutions/startups",
  },
  {
    icon: Settings,
    label: "Operations Teams",
    desc: "Replace manual work",
    href: "/solutions/operations",
  },
  {
    icon: Building2,
    label: "Agencies",
    desc: "Build for clients",
    href: "/solutions/agencies",
  },
  {
    icon: Headphones,
    label: "Support Teams",
    desc: "Escalate & resolve",
    href: "/solutions/support",
  },
];

const useCases = [
  { label: "Lead routing", href: "/templates" },
  { label: "Invoice sync", href: "/templates" },
  { label: "Support escalation", href: "/templates" },
  { label: "Report generation", href: "/templates" },
];

export default function SolutionsMenu({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex w-[440px] gap-5 p-5">
      {/* Personas */}
      <div className="flex-1">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Who is it for?
        </span>
        <div className="space-y-1">
          {personas.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.href}
                href={p.href}
                onClick={onNavigate}
                className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] group-hover:bg-accent/10 transition-colors">
                  <Icon className="h-3.5 w-3.5 text-white/40 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <span className="block text-[13px] font-semibold text-white/70 group-hover:text-white transition-colors">
                    {p.label}
                  </span>
                  <span className="block text-[11px] text-white/25 group-hover:text-white/40 transition-colors">
                    {p.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Use cases */}
      <div className="w-[150px] shrink-0">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Use cases
        </span>
        <div className="space-y-1">
          {useCases.map((uc) => (
            <Link
              key={uc.label}
              href={uc.href}
              onClick={onNavigate}
              className="block rounded-lg px-2 py-1.5 text-[12px] text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/70"
            >
              {uc.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
