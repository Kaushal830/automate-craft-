import HeroSection from "@/components/HeroSection";
import ProductProofSection from "@/components/home/ProductProofSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isGuestUser } from "@/lib/guest-access";
import Navbar from "@/components/Navbar";
import { redirect } from "next/navigation";

/**
 * Homepage
 */
export default async function Home() {
  const user = await getCurrentUser();
  const authenticatedUser = user && !isGuestUser(user) ? user : null;

  const content = (
    <>
      <HeroSection
        user={authenticatedUser}
        socialAuthEnabled={isSupabaseAuthEnabled()}
        ssoEnabled={isSsoEnabled()}
      />
      <ProductProofSection />
    </>
  );

  if (authenticatedUser) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />
      {content}
    </div>
  );
}
