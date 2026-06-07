"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  Sparkles,
  LogOut,
  Settings,
  User,
  Star,
  Cable,
  MessageSquare,
  ScrollText,
  Zap,
  Settings2,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";
import type { AuthenticatedUser } from "@/lib/automation";
import { ProfileModal, DISPLAY_NAME_KEY, AVATAR_URL_KEY } from "@/components/dashboard/ProfileModal";
import { CreditsDropdown } from "@/components/CreditsDropdown";


type RecentItem = {
  id: string;
  name: string;
};

type ChatIndexEntry = {
  chatId: string;
  title: string;
  updatedAt: string;
  isStarred: boolean;
};

const CHAT_INDEX_KEY = "chat_index_v1";

function readChatIndex(): ChatIndexEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as ChatIndexEntry[]) : [];
  } catch {
    return [];
  }
}

export default function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AuthenticatedUser;
}) {
  /* LOGIC EXPLAINED:
     The active credits trigger in the dashboard was still mounted inside the
     sidebar footer, which forced it into the bottom-left area shown by the
     user. This fix keeps the same CreditsDropdown component and behavior, but
     moves its render point into a fixed top-right overlay so the control is
     consistently visible across dashboard pages. */
  const pathname = usePathname();
  const router = useRouter();
  const isChatWorkspace = pathname.startsWith("/dashboard/chat/");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [recentChats, setRecentChats] = useState<ChatIndexEntry[]>([]);
  const [starredChats, setStarredChats] = useState<ChatIndexEntry[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState(user.name || "User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sync from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const storedName = localStorage.getItem(DISPLAY_NAME_KEY);
    if (storedName) setDisplayName(storedName);
    const storedAvatar = localStorage.getItem(AVATAR_URL_KEY);
    if (storedAvatar) setAvatarUrl(storedAvatar);
  }, []);

  useEffect(() => {
    const fetchRecents = async () => {
      try {
        const res = await fetch("/api/automations?limit=5");
        const data = await res.json();
        if (data.automations) {
          setRecents(
            (data.automations as Array<{ id: string; name: string }>).map((automation) => ({
              id: automation.id,
              name: automation.name,
            })),
          );
        }
      } catch {
        console.error("Failed to fetch recents");
      }
    };
    void fetchRecents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const sync = () => {
      const index = readChatIndex()
        .filter((entry) => entry && entry.chatId && entry.title)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        
      setRecentChats(index.slice(0, 5));
      setStarredChats(index.filter(e => e.isStarred));
    };

    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_INDEX_KEY) sync();
    };
    const onLocal = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener("chat-index-updated", onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("chat-index-updated", onLocal as EventListener);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out.");
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed.", error);
    }
  };

  const navItems = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  ];

  const projectItems = [
    { name: "All Automations", href: "/dashboard/projects", icon: FolderOpen },
  ];

  const workspaceItems = [
    { name: "Connect Apps", href: "/dashboard/apps", icon: Cable },
    { name: "Execution Logs", href: "/dashboard/logs", icon: ScrollText },
    { name: "Usage Intelligence", href: "/dashboard/credits", icon: Zap },
    { name: "Settings", href: "/dashboard/settings", icon: Settings2 },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarWidth = isCollapsed ? "w-[80px]" : "w-[240px]";
  const mainMargin = isChatWorkspace ? "ml-0" : isCollapsed ? "ml-[80px]" : "ml-[240px]";

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">

      {!isChatWorkspace && (
      <aside 
        className={`fixed bottom-0 left-0 top-0 ${sidebarWidth} flex shrink-0 flex-col border-r z-40 transition-all duration-300 ease-in-out border-white/[0.04] bg-gradient-to-b from-[#0c0c0e] to-[#09090b] ${
          isCollapsed ? "cursor-pointer hover:bg-white/[0.015]" : ""
        }`}
        onClick={(e) => {
          if (!isCollapsed) return;
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('a')) return;
          setIsCollapsed(false);
        }}
      >
        {/* Top Header / Logo Toggle */}
        <div className={`flex h-16 items-center border-b ${isCollapsed ? "justify-center" : "px-6"} ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/[0.04]"}`}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="group relative flex items-center rounded-xl transition-transform duration-200 active:scale-[0.99]"
            data-static-hover
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <BrandMark compact href="#" showName={!isCollapsed} />
          </button>
        </div>

        {/* Navigation */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-3"} py-4 space-y-6`}>
          {/* Main Nav */}
          <nav className="space-y-1">
            {navItems.map((item, navIdx) => (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                style={{ animationDelay: `${navIdx * 30}ms` }}
                className={`sidebar-item relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isCollapsed ? "justify-center" : "gap-3"
                } ${
                  isActive(item.href)
                    ? isChatWorkspace
                      ? "bg-black/[0.04] text-foreground"
                      : "bg-accent/[0.08] text-foreground ring-glow-accent"
                    : isChatWorkspace
                      ? "text-foreground/60 hover:bg-black/[0.04] hover:text-foreground"
                      : "text-foreground/45 hover:bg-white/[0.04] hover:text-foreground/80"
                }`}
              >
                {isActive(item.href) && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-accent shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                )}
                <item.icon className={`h-4 w-4 shrink-0 ${isActive(item.href) ? "text-accent" : ""}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}

            {/* Projects Section (Non-expandable) */}
            <div className="mt-4">
              {!isCollapsed ? (
                <div className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground/30 transition-all justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 shrink-0 text-accent/50" />
                    <span className={`uppercase tracking-widest text-[10px] font-bold ${isChatWorkspace ? "text-foreground/30" : "text-white/30"}`}>Projects</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-2 opacity-20">
                  <div className={`h-px w-8 ${isChatWorkspace ? "bg-black/20" : "bg-white/20"}`} />
                </div>
              )}
              
              <div className={`mt-1 space-y-1 ${!isCollapsed ? `ml-4 border-l ${isChatWorkspace ? "border-black/5" : "border-white/5"} pl-2` : "px-2"}`}>
                {projectItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isCollapsed ? "justify-center" : "gap-3"
                    } ${
                      isActive(item.href)
                        ? isChatWorkspace
                          ? "bg-black/[0.04] text-foreground"
                          : "bg-white/5 text-foreground"
                        : isChatWorkspace
                          ? "text-foreground/50 hover:bg-black/[0.04] hover:text-foreground"
                          : "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${isCollapsed ? "h-4 w-4" : ""}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}

                {!isCollapsed && starredChats.length > 0 && (
                  <div className="pt-2 pb-1">
                    <div className={`mb-1 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest ${isChatWorkspace ? "text-foreground/30" : "text-white/30"}`}>
                      <Star className="h-3.5 w-3.5 opacity-60" />
                      Starred Projects
                    </div>
                    <div className="space-y-1">
                      {starredChats.map((chat) => (
                        <Link
                          key={`star-${chat.chatId}`}
                          href={`/dashboard/chat/${chat.chatId}`}
                          title={chat.title}
                          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            pathname === `/dashboard/chat/${chat.chatId}`
                              ? isChatWorkspace
                                ? "bg-black/[0.04] text-foreground"
                                : "bg-white/5 text-foreground"
                              : isChatWorkspace
                                ? "text-foreground/50 hover:bg-black/[0.04] hover:text-foreground"
                                : "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                          }`}
                        >
                          <Star className="h-3.5 w-3.5 shrink-0 text-accent fill-current" />
                          <span className="truncate">{chat.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Workspace Section */}
            <div className="mt-4">
              {!isCollapsed ? (
                <div className="flex w-full items-center px-3 py-2 text-sm font-medium text-foreground/30 transition-all justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-4 w-4 shrink-0 text-accent/50" />
                    <span className={`uppercase tracking-widest text-[10px] font-bold ${isChatWorkspace ? "text-foreground/30" : "text-white/30"}`}>Workspace</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-2 opacity-20">
                  <div className={`h-px w-8 ${isChatWorkspace ? "bg-black/20" : "bg-white/20"}`} />
                </div>
              )}

              <div className={`mt-1 space-y-1 ${!isCollapsed ? `ml-4 border-l ${isChatWorkspace ? "border-black/5" : "border-white/5"} pl-2` : "px-2"}`}>
                {workspaceItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isCollapsed ? "justify-center" : "gap-3"
                    } ${
                      isActive(item.href)
                        ? isChatWorkspace
                          ? "bg-black/[0.04] text-foreground"
                          : "bg-white/5 text-foreground"
                        : isChatWorkspace
                          ? "text-foreground/50 hover:bg-black/[0.04] hover:text-foreground"
                          : "text-foreground/50 hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${isCollapsed ? "h-4 w-4" : ""}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Recents */}
          {recents.length > 0 && !isCollapsed && (
            <div className="space-y-2 px-3 animate-in fade-in duration-500">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Recents</p>
              <div className="space-y-1">
                {recents.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/automations/${item.id}`}
                    className="group block truncate rounded-md py-1 text-[13px] font-medium text-foreground/45 hover:text-foreground"
                  >
                    <span className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/20">•</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* User Footer */}
        <div className={`relative border-t ${isCollapsed ? "p-2" : "p-4"} ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/[0.04]"}`} ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex w-full items-center rounded-xl transition-all duration-200 ${
              isCollapsed ? "justify-center p-1.5" : "gap-3 p-2"
            } ${isChatWorkspace ? "hover:bg-black/[0.04]" : "hover:bg-white/[0.04]"}`}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-500 text-[11px] font-bold text-white uppercase shadow-[0_0_16px_rgba(59,130,246,0.2)] overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                (displayName[0] || user.email[0])
              )}
              <div className="absolute -inset-[1.5px] rounded-full border border-accent/25" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-semibold text-foreground/85 truncate">{displayName}</p>
                <p className="text-[10px] font-medium text-foreground/35 truncate">{user.email}</p>
              </div>
            )}
          </button>

          {/* User Dropdown */}
          {isUserMenuOpen && (
            <div className={`absolute bottom-full mb-2 overflow-hidden rounded-xl border shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isChatWorkspace ? "border-[#E5E7EB] bg-white" : "border-white/[0.06] bg-[#111113]/95 backdrop-blur-xl"
            } ${
              isCollapsed ? "left-2 w-[160px]" : "left-4 right-4"
            }`}>
              <div className="p-1.5">
                <button
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${isChatWorkspace ? "text-foreground/70 hover:bg-black/[0.04] hover:text-foreground" : "text-foreground/60 hover:bg-white/[0.05] hover:text-foreground"}`}
                  onClick={() => { setIsUserMenuOpen(false); setShowProfileModal(true); }}
                >
                  <User className="h-4 w-4" />
                  Edit Profile
                </button>
                <div className={`my-1 border-t ${isChatWorkspace ? "border-[#E5E7EB]" : "border-white/[0.04]"}`} />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200"
                  data-static-hover
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      )}

      <main className={`${mainMargin} relative min-w-0 flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out`}>
        {children}
      </main>
      {!isChatWorkspace && (
        <div className="pointer-events-none fixed right-5 top-5 z-[9999] sm:right-6 sm:top-6">
          <div className="pointer-events-auto">
            <CreditsDropdown />
          </div>
        </div>
      )}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onNameChange={n => setDisplayName(n)}
        onAvatarChange={url => setAvatarUrl(url)}
      />
    </div>
  );
}
