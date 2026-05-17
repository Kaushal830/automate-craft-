import Link from "next/link";
import BrandMark from "@/components/BrandMark";

/* LOGIC EXPLAINED:
The footer copy is rewritten from generic AI marketing to operational product
language, per audit recommendation. The tagline, status indicator, and
bottom-bar text now reflect system-level identity.
*/

const footerLinks = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Integrations", href: "/integrations" },
    { label: "Templates", href: "/templates" },
    { label: "How Credits Work", href: "/how-credits-work" },
    { label: "Status", href: "/status" },
    { label: "Blueprints", href: "/why-us" },
  ],
  solutions: [
    { label: "For Startups", href: "/solutions/startups" },
    { label: "For Operations", href: "/solutions/operations" },
    { label: "For Agencies", href: "/solutions/agencies" },
    { label: "For Support", href: "/solutions/support" },
  ],
  resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "Changelog", href: "/changelog" },
    { label: "Let's Talk", href: "/lets-talk" },
    { label: "Security", href: "/security" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  social: [
    { label: "X (Twitter)", href: "https://x.com/automatecraft", external: true },
    { label: "LinkedIn", href: "https://linkedin.com/company/automatecraft", external: true },
    { label: "hello@automatecraft.ai", href: "mailto:hello@automatecraft.ai" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-[#09090b]" role="contentinfo">
      {/* Gradient separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-32 w-96 rounded-full bg-accent/[0.03] blur-[60px]" />

      <div className="site-container py-20">
        <div className="grid gap-14 md:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.5fr]">
          {/* Brand */}
          <div className="max-w-xs">
            <BrandMark compact={false} showName />
            <p className="mt-4 text-sm leading-7 text-white/35">
              Automation infrastructure for modern teams. Describe workflows in plain English, review every step, and deploy with confidence.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/20">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
              All systems operational
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Solutions
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.solutions.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Resources
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Social */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Legal
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="footer-link transition-colors duration-200 hover:text-white/80">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Reach
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              {footerLinks.social.map((link) => (
                <li key={link.href}>
                  {"external" in link ? (
                    <a href={link.href} target="_blank" rel="noreferrer" className="footer-link transition-colors duration-200 hover:text-white/80">
                      {link.label}
                    </a>
                  ) : (
                    <a href={link.href} className="footer-link transition-colors duration-200 hover:text-white/80">
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Infrastructure badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/[0.04] pt-7 text-[11px] text-white/15">
          <a href="https://github.com/n8n-io/n8n" target="_blank" rel="noreferrer" className="hover:text-white/30 transition-colors">Powered by n8n</a>
          <span className="text-white/8">·</span>
          <a href="https://github.com/supabase/supabase" target="_blank" rel="noreferrer" className="hover:text-white/30 transition-colors">Secured by Supabase</a>
          <span className="text-white/8">·</span>
          <a href="https://vercel.com" target="_blank" rel="noreferrer" className="hover:text-white/30 transition-colors">Deployed on Vercel</a>
        </div>

        {/* Bottom bar */}
        <div className="mt-5 flex flex-col gap-3 text-sm text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} AutomateCraft. All rights reserved.</p>
          <p className="text-white/20">Automation infrastructure for modern teams.</p>
        </div>
      </div>


    </footer>
  );
}
