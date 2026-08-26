import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkIsAdmin } from "@/lib/admin.functions";
import { NotificationCenter } from "@/features/notifications/notification-center";
import { getCareerBrainSnapshot } from "@/lib/career-brain.service";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessagesSquare,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  Search,
  Command as CommandIcon,
  LogOut,
  ChevronLeft,
  Brain,
  Sparkles,
  Radar,
  Wand2,
  Mail,
  Mic,
  Building2,
  User,
  Zap,
  Bot,
  Shield,
  Menu,
  Home,
  Bookmark,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/landing/logo";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ProgressRing } from "@/components/product/progress-ring";
import { AIStatusBar } from "@/components/ai/ai-status-bar";
import { globalSearch, type SearchHit } from "@/lib/search.functions";

function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const HIT_ICONS: Record<SearchHit["kind"], typeof Briefcase> = {
  job: Briefcase,
  application: FileText,
  company: Building2,
  skill: GraduationCap,
  question: MessagesSquare,
  resume: Users,
};

type NavEntry = { label: string; to: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavEntry[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
      { label: "Career Brain", to: "/profile", icon: Brain },
      { label: "Analytics", to: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Jobs",
    items: [
      { label: "Discover", to: "/jobs", icon: Briefcase },
      { label: "Saved jobs", to: "/jobs/saved", icon: Bookmark },
      { label: "Applications", to: "/applications", icon: CommandIcon },
      { label: "Tracker", to: "/tracker", icon: Radar },
      { label: "Outreach", to: "/outreach", icon: Mail },
    ],
  },
  {
    label: "AI tools",
    items: [
      { label: "Resume Studio", to: "/resumes", icon: Wand2 },
      { label: "Assistant", to: "/chat", icon: Sparkles },
      { label: "AI Agent", to: "/agent", icon: Bot },
      { label: "Interview", to: "/interview", icon: Mic },
      { label: "Coach", to: "/coach", icon: Users },
      { label: "Learning", to: "/learning", icon: GraduationCap },
    ],
  },
];

const NAV_ACCOUNT: NavEntry[] = [
  { label: "Billing", to: "/billing", icon: CreditCard },
  { label: "Settings", to: "/settings", icon: Settings },
];

const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_ACCOUNT];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const brainQuery = useQuery({
    queryKey: ["career-brain"],
    queryFn: () => getCareerBrainSnapshot(),
    staleTime: 60_000,
  });
  const brainReady = !!brainQuery.data?.ready;
  const healthScore = (brainQuery.data?.health as { score?: number | null } | null)?.score ?? null;
  const adminQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!adminQuery.data?.isAdmin;

  const searchDebounced = useDebounced(searchQuery, 200);
  const searchHits = useQuery({
    queryKey: ["global-search", searchDebounced],
    queryFn: () => globalSearch({ data: { q: searchDebounced } }),
    enabled: commandOpen && searchDebounced.trim().length > 1,
    staleTime: 30_000,
  });

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isRouteActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const go = (to: string) => {
    setCommandOpen(false);
    navigate({ to });
  };

  const activeLabel =
    ALL_NAV.find((i) => isRouteActive(i.to))?.label ??
    (pathname.startsWith("/me") ? "Profile" : "Workspace");

  const navGroups = isAdmin
    ? [...NAV_GROUPS, { label: "Admin", items: [{ label: "Admin", to: "/admin", icon: Shield }] }]
    : NAV_GROUPS;

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
          collapsed ? "w-[72px]" : "w-[256px]",
        )}
      >
        <div className={cn("flex h-16 items-center gap-2.5 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
          <Logo size={26} />
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              CareerOS
            </span>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2.5" : "px-3")}>
          {navGroups.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && "mt-5")}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && <div className="mx-2 mb-2 h-px bg-sidebar-border" />}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.label}
                    {...item}
                    collapsed={collapsed}
                    active={isRouteActive(item.to)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className={cn("mt-5", collapsed && "border-t border-sidebar-border pt-3")}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
                Account
              </p>
            )}
            <div className="space-y-0.5">
              {NAV_ACCOUNT.map((item) => (
                <NavItem key={item.label} {...item} collapsed={collapsed} active={isRouteActive(item.to)} />
              ))}
            </div>
          </div>
        </nav>

        {/* Career Health footer */}
        <div className={cn("border-t border-sidebar-border", collapsed ? "p-2.5" : "p-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/profile" className="grid place-items-center rounded-lg py-1 transition-colors hover:bg-sidebar-accent">
                  <ProgressRing
                    value={healthScore ?? (brainReady ? 20 : 5)}
                    size={36}
                    stroke={3.5}
                    tone="primary"
                    className="[&_svg_circle:first-child]:stroke-sidebar-border"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Career Health · {healthScore ?? "—"}/100</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3 transition-colors hover:bg-sidebar-accent"
            >
              <ProgressRing
                value={healthScore ?? (brainReady ? 20 : 5)}
                size={44}
                stroke={4}
                tone="primary"
                className="[&_svg_circle:first-child]:stroke-sidebar-border"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground">Career Health</p>
                <p className="mt-0.5 truncate text-[11px] text-sidebar-muted">
                  {healthScore != null
                    ? `${healthScore}/100 · ${brainReady ? "Active" : "Setup"}`
                    : brainReady
                      ? "Calibrating…"
                      : "Upload your resume"}
                </p>
              </div>
            </Link>
          )}
          <div className={cn("mt-2.5 flex gap-1.5", collapsed && "flex-col")}>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex h-8 flex-1 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
            </button>
            <ThemeQuickSwitch collapsed={collapsed} />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[288px] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <VisuallyHidden asChild>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
            <Logo size={26} />
            <span className="font-display text-[15px] font-semibold tracking-tight">CareerOS</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navGroups.map((group, gi) => (
              <div key={group.label} className={cn(gi > 0 && "mt-5")}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavItem key={item.label} {...item} collapsed={false} active={isRouteActive(item.to)} />
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">Account</p>
              <div className="space-y-0.5">
                {NAV_ACCOUNT.map((item) => (
                  <NavItem key={item.label} {...item} collapsed={false} active={isRouteActive(item.to)} />
                ))}
              </div>
            </div>
          </nav>
          <div className="space-y-2 border-t border-sidebar-border p-3">
            <Link
              to="/"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Home className="h-4 w-4" />
              Back to homepage
            </Link>
            <button
              onClick={handleSignOut}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sidebar-border text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl transition-all duration-300 md:gap-4 md:px-8",
            scrolled
              ? "border-border bg-background/85 shadow-soft"
              : "border-border/60 bg-background/60",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb context */}
          <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <span className="text-muted-foreground">CareerOS</span>
            <span className="text-border">/</span>
            <span className="truncate font-semibold text-foreground">{activeLabel}</span>
          </div>

          <button
            onClick={() => setCommandOpen(true)}
            className="group ml-auto flex h-10 min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-border bg-muted/60 px-3 text-left text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:ml-6"
          >
            <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
            <span className="flex-1 truncate">Search or ask CareerOS…</span>
            <kbd className="hidden items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:flex">
              <CommandIcon className="h-3 w-3" />K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link
              to="/me"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              aria-label="Open profile"
            >
              <User className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 flex-1"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      <AIStatusBar />

      {/* Command palette */}
      <CommandDialog
        open={commandOpen}
        onOpenChange={(o) => {
          setCommandOpen(o);
          if (!o) setSearchQuery("");
        }}
        shouldFilter={searchDebounced.trim().length <= 1}
      >
        <CommandInput
          placeholder="Search jobs, applications, companies, skills…"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searchHits.isFetching ? "Searching…" : "No matches. Try a job title, company, or skill."}
          </CommandEmpty>

          {searchDebounced.trim().length > 1 && (searchHits.data?.hits.length ?? 0) > 0 && (
            <>
              <CommandGroup heading="Results">
                {searchHits.data!.hits.map((hit) => {
                  const Icon = HIT_ICONS[hit.kind];
                  return (
                    <CommandItem
                      key={`${hit.kind}:${hit.id}`}
                      value={`${hit.kind} ${hit.title} ${hit.subtitle ?? ""}`}
                      onSelect={() => go(hit.href)}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="truncate text-[11px] text-muted-foreground">{hit.subtitle}</span>
                        )}
                      </div>
                      {typeof hit.score === "number" && hit.score > 0 && (
                        <span className="ml-auto rounded-full border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {Math.round(hit.score)}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="AI actions">
            <CommandItem onSelect={() => go("/profile")}>
              <Sparkles className="h-4 w-4 text-primary" />
              Open Career Brain
            </CommandItem>
            <CommandItem onSelect={() => go("/jobs")}>
              <Radar className="h-4 w-4 text-primary" />
              Find matching jobs
            </CommandItem>
            <CommandItem onSelect={() => go("/applications")}>
              <Wand2 className="h-4 w-4 text-primary" />
              Prepare an application
            </CommandItem>
            <CommandItem onSelect={() => go("/chat")}>
              <MessagesSquare className="h-4 w-4 text-primary" />
              Ask Career Assistant
            </CommandItem>
            <CommandItem onSelect={() => go("/interview")}>
              <Mic className="h-4 w-4 text-primary" />
              Practice interview
            </CommandItem>
            <CommandItem onSelect={() => go("/coach")}>
              <Zap className="h-4 w-4 text-primary" />
              Ask career coach
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Navigate">
            {ALL_NAV.map((item) => (
              <CommandItem key={item.label} onSelect={() => go(item.to)}>
                <item.icon className="h-4 w-4" />
                Open {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem onSelect={() => go("/me")}>
              <User className="h-4 w-4" />
              Public profile
            </CommandItem>
            <CommandItem onSelect={() => go("/billing")}>
              <CreditCard className="h-4 w-4" />
              Billing
            </CommandItem>
            <CommandItem onSelect={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function NavItem({
  label,
  to,
  icon: Icon,
  collapsed,
  active,
}: {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  collapsed: boolean;
  active?: boolean;
}) {
  const link = (
    <Link
      to={to}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg text-[13px] font-medium transition-colors duration-150",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon className={cn("h-[17px] w-[17px] shrink-0", active && "text-primary-foreground")} strokeWidth={active ? 2.1 : 1.8} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
