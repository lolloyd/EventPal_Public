import { getSession } from "@/lib/session";

export const DEFAULT_ADMIN_EMAIL = "lloyd.miguel@gmail.com";

export interface HeyPalUser {
  id: string;
  name: string;
  email?: string;
  picture?: string | null;
  isDemo: boolean;
  roles: string[];
  identifiers: string[];
}

export function isLocalDemoMode(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.HEYPAL_DEMO_MODE !== "false" &&
    !process.env.GOOGLE_CLIENT_ID
  );
}

export function getAdminEmails(): string[] {
  const envAdminEmails =
    process.env.HEYPAL_ADMIN_EMAILS ||
    DEFAULT_ADMIN_EMAIL;
  return envAdminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedEmailDomains(): string[] {
  const envDomains = process.env.HEYPAL_ALLOWED_EMAIL_DOMAINS;
  if (!envDomains || envDomains.trim() === "*") {
    return []; // Empty means any domain is permitted
  }
  return envDomains
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function isHeyPalAdminUser(
  userOrEmail: Pick<HeyPalUser, "roles" | "identifiers"> | string,
): boolean {
  const adminEmails = getAdminEmails();

  if (typeof userOrEmail === "string") {
    return adminEmails.includes(userOrEmail.trim().toLowerCase());
  }

  if (userOrEmail.roles?.includes("admin")) {
    return true;
  }

  return (userOrEmail.identifiers ?? []).some((identifier) =>
    adminEmails.includes(identifier.trim().toLowerCase()),
  );
}

export function isOrganizationUser(identifiers: string[]): boolean {
  const allowedDomains = getAllowedEmailDomains();
  // If no domain restrictions are set, all users are permitted
  if (allowedDomains.length === 0) return true;

  // The default admin and listed admins are always permitted regardless of organization domain
  const adminEmails = getAdminEmails();
  if (identifiers.some((id) => adminEmails.includes(id.trim().toLowerCase()))) {
    return true;
  }

  return identifiers.some((identifier) => {
    const separator = identifier.lastIndexOf("@");
    if (separator < 0) return false;
    const domain = identifier.slice(separator + 1).toLowerCase();
    return allowedDomains.includes(domain);
  });
}

async function getAuthenticatedUser(): Promise<HeyPalUser> {
  if (isLocalDemoMode()) {
    return {
      id: "heypal-demo-attendee",
      name: "demo.attendee@heypal.local",
      email: "demo.attendee@heypal.local",
      isDemo: true,
      roles: ["anonymous", "authenticated"],
      identifiers: ["demo.attendee@heypal.local"],
    };
  }

  const session = await getSession();
  if (!session) {
    throw new Error("Sign in with your Google account to continue.");
  }

  const normalizedEmail = session.email.trim().toLowerCase();
  const isAdmin = session.isAdmin || isHeyPalAdminUser(normalizedEmail);

  const user: HeyPalUser = {
    id: session.id,
    name: session.name || session.email,
    email: normalizedEmail,
    picture: session.picture,
    isDemo: false,
    roles: isAdmin ? ["authenticated", "admin"] : ["authenticated"],
    identifiers: [normalizedEmail],
  };

  if (!isOrganizationUser(user.identifiers)) {
    throw new Error("Sign in with an allowed Google account to continue.");
  }

  return user;
}

export async function requireAuthenticated(): Promise<HeyPalUser> {
  return getAuthenticatedUser();
}

export async function requireAdmin(): Promise<HeyPalUser> {
  if (isLocalDemoMode()) {
    return {
      id: "heypal-demo-admin",
      name: "demo.organizer@heypal.local",
      email: "demo.organizer@heypal.local",
      isDemo: true,
      roles: ["anonymous", "authenticated", "admin"],
      identifiers: ["demo.organizer@heypal.local"],
    };
  }

  const user = await getAuthenticatedUser();
  if (!isHeyPalAdminUser(user)) {
    throw new Error("A heyPal! organizer role is required.");
  }
  return user;
}