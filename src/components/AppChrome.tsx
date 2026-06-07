"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";

export default function AppChrome({
  navbar,
  footer,
  children,
}: {
  navbar: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  /* LOGIC EXPLAINED:
  The public header used to appear on multiple marketing pages. The updated
  rule keeps that header exclusive to the public homepage, which matches the
  current UX request and removes ambiguity across pricing and other pages.
  */
  const showNavbar = pathname === "/";

  const hideFooterRoutes = ["/login", "/signup", "/check-email", "/verify-email", "/onboarding", "/setup", "/lets-talk", "/build"];
  const hideFooter = pathname.startsWith("/dashboard") || hideFooterRoutes.includes(pathname);

  return (
    <MotionConfig reducedMotion="never">
      <div className="flex min-h-screen flex-col">
        {showNavbar ? navbar : null}
        <main id="main-content" className="flex-1">{children}</main>
        {hideFooter ? null : footer}
      </div>
    </MotionConfig>
  );
}
