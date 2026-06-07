import type { AuthenticatedUser } from "@/lib/automation";

/* LOGIC EXPLAINED:
This file defines one stable guest user for the temporary open-access mode.
Using a single shared guest identity keeps dashboard pages, credits, and saved
automation data consistent without forcing login or email verification.
*/

export const GUEST_USER_ID = "guest-user";
export const GUEST_USER_EMAIL = "guest@automatecraft.local";
export const GUEST_USER_NAME = "Guest Workspace";

export function getGuestUser(): AuthenticatedUser {
  return {
    id: GUEST_USER_ID,
    email: GUEST_USER_EMAIL,
    name: GUEST_USER_NAME,
    mode: "local",
    onboarded: true,
    emailVerified: true,
  };
}

/* LOGIC EXPLAINED:
Open-access mode returns a guest workspace user so dashboard routes can still
load without login. For UI decisions like "Public Home" vs "Authenticated Home",
we must not treat that guest identity as a real signed-in account. This helper
keeps that rule simple and reusable anywhere the app needs to distinguish them.
*/
export function isGuestUser(user: AuthenticatedUser | null | undefined) {
  return Boolean(user && user.id === GUEST_USER_ID);
}
