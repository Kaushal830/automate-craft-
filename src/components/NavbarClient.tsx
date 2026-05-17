"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import BrandMark from "@/components/BrandMark";

/* LOGIC EXPLAINED:
The navbar already had a polished entrance animation, but it ignored reduced-motion
preferences. This fix keeps the same visual behavior for most users, while making
the animation instant for users who prefer less movement.
*/

const flatLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
  { label: "Docs", href: "/docs" },
];



export default function NavbarClient({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);


  const handleScroll = useEffectEvent(() => {
    setScrolled(window.scrollY > 18);
  });

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* LOGIC EXPLAINED:
  The parent chrome already tries to keep this header homepage-only, but the navbar
  itself was still willing to render on other public routes when it got mounted.
  This guard makes the rule explicit in the component too: if we're not on `/`,
  return nothing. That prevents pricing/why-us pages from showing the public header.
  */
  if (pathname !== "/") {
    return null;
  }



  return (
    <motion.nav
      initial={{ opacity: 0, y: reduceMotion ? 0 : -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.5,
        delay: reduceMotion ? 0 : 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 md:px-6"
    >
      <div
        className={`mx-auto max-w-[1180px] rounded-2xl transition-all duration-300 ${
          scrolled
            ? "glass-nav shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
            : "bg-white/[0.03] shadow-[0_4px_18px_rgba(0,0,0,0.2)] backdrop-blur-sm"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 md:px-5">
          <BrandMark compact showName />

          {/* ─── Desktop Nav ─── */}
          <div className="hidden items-center gap-7 text-[15px] font-medium text-foreground/70 lg:flex">
            {flatLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative rounded-md px-1 py-1 transition-colors duration-200 hover:text-foreground ${
                  pathname === item.href ? "text-foreground" : "text-foreground/70"
                }`}
              >
                {item.label}
                <span className={`absolute -bottom-0.5 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-accent transition-all duration-300 ease-out ${
                  pathname === item.href ? "w-full" : "w-0 group-hover:w-full"
                }`} />
              </Link>
            ))}
          </div>

          {/* ─── Auth buttons (desktop) ─── */}
          <div className="hidden items-center gap-4 lg:flex">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 md:px-6"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-white/60 transition-colors duration-200 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(59,130,246,0.35)] hover:translate-y-[-1px] active:translate-y-0 md:px-6"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* ─── Mobile hamburger ─── */}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-colors lg:hidden"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Scroll glow line */}
        {scrolled && (
          <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        )}

        {/* ─── Mobile Menu with Accordion ─── */}
        {open ? (
          <div className="border-t border-white/8 px-4 pb-4 pt-3 lg:hidden">
            <div className="space-y-1">
              {flatLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 hover:text-foreground ${
                    pathname === item.href ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Auth buttons */}
            <div className="mt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/8 bg-white/5 px-5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-accent to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(59,130,246,0.25)] transition-all"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </motion.nav>
  );
}
