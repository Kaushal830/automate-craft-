import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import AppChrome from "@/components/AppChrome";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";
import { CreditsProvider } from "@/components/providers/CreditsProvider";
import { RuntimeDebugProbe } from "@/components/RuntimeDebugProbe";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AutomateCraft — Workflow Intelligence Platform",
    template: "%s | AutomateCraft",
  },
  description:
    "Describe workflows in plain English. Review automation blueprints. Deploy to n8n with confidence. No code required.",
  metadataBase: new URL("https://automatecraft.ai"),
  openGraph: {
    type: "website",
    siteName: "AutomateCraft",
    title: "AutomateCraft — Automation Infrastructure for Modern Teams",
    description:
      "Tell us what to automate. We'll build it, test it, and deploy it. Powered by n8n.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutomateCraft — Automation Infrastructure for Modern Teams",
    description:
      "Describe workflows in plain English. Review every step. Deploy to n8n with confidence.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showRuntimeDebugProbe =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG === "true";

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg">
          Skip to content
        </a>
        <SupabaseProvider>
          <CreditsProvider>
            {showRuntimeDebugProbe ? <RuntimeDebugProbe /> : null}
            <AppChrome navbar={null} footer={<Footer />}>
              {children}
            </AppChrome>
          </CreditsProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
