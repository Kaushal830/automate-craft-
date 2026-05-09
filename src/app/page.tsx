import HeroSection from "@/components/HeroSection";
import { getCurrentUser } from "@/lib/auth";
import { isSsoEnabled, isSupabaseAuthEnabled } from "@/lib/env";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { isGuestUser } from "@/lib/guest-access";
import Navbar from "@/components/Navbar";

/**
 * Homepage
 */
export default async function Home() {
  const user = await getCurrentUser();
  const authenticatedUser = user && !isGuestUser(user) ? user : null;

  const content = (
    <HeroSection
      user={authenticatedUser}
      socialAuthEnabled={isSupabaseAuthEnabled()}
      ssoEnabled={isSsoEnabled()}
    />
  );

  if (authenticatedUser) {
    return (
      <DashboardShell user={authenticatedUser}>
        {content}
      </DashboardShell>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />
      {content}
    </div>
  );
}
