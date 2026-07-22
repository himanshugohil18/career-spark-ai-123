import { useEffect, useState, type ReactNode } from "react";
import {
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
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
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
import { AgentStatusDot, type AgentState } from "@/components/ai/agent-status";
import { AIStatusBar } from "@/components/ai/ai-status-bar";
import { AmbientBackdrop } from "@/components/ui/ambient-backdrop";
import { globalSearch, type SearchHit } from "@/lib/search.functions";
import { Briefcase as BriefcaseIcon, FileText as FileTextIcon, Users as UsersIcon, GraduationCap as GraduationCapIcon, MessagesSquare as MessagesSquareIcon, Building2 as Building2Icon } from "lucide-react";

function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const HIT_ICONS: Record<SearchHit["kind"], typeof BriefcaseIcon> = {
  job: BriefcaseIcon,
  application: FileTextIcon,
  company: Building2Icon,
  skill: GraduationCapIcon,
  question: MessagesSquareIcon,
  resume: UsersIcon,
};

const NAV_PRIMARY = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Career Brain", to: "/profile", icon: Brain },
  { label: "Jobs", to: "/jobs", icon: Briefcase },
  { label: "Saved", to: "/jobs/saved", icon: FileText },
  { label: "Applications", to: "/applications", icon: CommandIcon },
  { label: "AI Agent", to: "/agent", icon: Bot },
  { label: "Interview", to: "/interview", icon: MessagesSquare },
  { label: "Coach", to: "/coach", icon: Users },
  { label: "Learning", to: "/learning", icon: GraduationCap },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
] as const;


const NAV_SECONDARY = [
  { label: "Billing", to: "/billing", icon: CreditCard },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const AGENT_MINI: { name: string; state: AgentState }[] = [
  { name: "Career", state: "ready" },
  { name: "Resume", state: "waiting" },
  { name: "Jobs", state: "idle" },
  { name: "Interview", state: "locked" },
];

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

  // Auto-close mobile drawer on route change
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

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <AmbientBackdrop />

      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
          <Logo size={26} />
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-tight">
              CareerOS
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_PRIMARY.map((item) => (
            <NavItem
              key={item.label}
              {...item}
              collapsed={collapsed}
              active={isRouteActive(item.to)}
            />
          ))}
          <div className="my-3 h-px bg-border" />
          {isAdmin && (
            <NavItem label="Admin" to="/admin" icon={Shield} collapsed={collapsed} active={isRouteActive("/admin")} />
          )}
          {NAV_SECONDARY.map((item) => (
            <NavItem key={item.label} {...item} collapsed={collapsed} active={isRouteActive(item.to)} />
          ))}
        </nav>

        {/* Agent status mini */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-lg border border-border bg-elevated/70 p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Agents
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">4</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {AGENT_MINI.map((a) => (
                <li key={a.name} className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground/80">{a.name}</span>
                  <AgentStatusDot state={a.state} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Career Health — reads live from Career Brain snapshot */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-lg border border-border bg-elevated p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Career Health
              </p>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                {brainReady ? "Active" : "Setup"}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold">
                {healthScore != null ? healthScore : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {healthScore != null ? "/100" : brainReady ? "Calibrating…" : "Awaiting resume"}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore ?? (brainReady ? 20 : 10)}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-[image:var(--gradient-primary)]"
              />
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="mx-3 mb-3 flex h-9 items-center justify-center rounded-md border border-border bg-elevated text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
          />
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-r border-border bg-sidebar p-0">
          <VisuallyHidden asChild>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden>
          <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
            <Logo size={26} />
            <span className="font-display text-[15px] font-semibold tracking-tight">CareerOS</span>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {NAV_PRIMARY.map((item) => (
              <NavItem key={item.label} {...item} collapsed={false} active={isRouteActive(item.to)} />
            ))}
            <div className="my-3 h-px bg-border" />
            {isAdmin && (
              <NavItem label="Admin" to="/admin" icon={Shield} collapsed={false} active={isRouteActive("/admin")} />
            )}
            {NAV_SECONDARY.map((item) => (
              <NavItem key={item.label} {...item} collapsed={false} active={isRouteActive(item.to)} />
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <button
              onClick={handleSignOut}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-elevated text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            "sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur-xl transition-all duration-300 md:px-8",
            scrolled
              ? "border-border/70 bg-background/70 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.6)]"
              : "border-border/40 bg-background/50",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground transition-colors hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCommandOpen(true)}
            className="group flex h-10 min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-lg border border-border bg-elevated/70 px-3 text-left text-sm text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-elevated hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
            <span className="flex-1 truncate">Search or ask CareerOS…</span>
            <kbd className="hidden items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary md:flex">
              <CommandIcon className="h-3 w-3" />K
            </kbd>
          </button>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationCenter />
            <Link
              to="/me"
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-elevated text-muted-foreground transition-all hover:-translate-y-[1px] hover:border-primary/40 hover:text-primary hover:shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
              aria-label="Open profile"
            >
              <User className="h-4 w-4" />
            </Link>
            <button
              onClick={handleSignOut}
              className="hidden h-10 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-sm text-muted-foreground transition-colors hover:text-foreground md:flex"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.998 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
                        <span className="ml-auto rounded-full border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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
              <Sparkles className="h-4 w-4 text-accent" />
              Open Career Brain
              <kbd className="ml-auto font-mono text-[10px] text-muted-foreground">⌘ ⏎</kbd>
            </CommandItem>
            <CommandItem onSelect={() => go("/jobs")}>
              <Radar className="h-4 w-4 text-primary" />
              Find matching jobs
            </CommandItem>
            <CommandItem onSelect={() => go("/applications")}>
              <Wand2 className="h-4 w-4 text-primary" />
              Prepare an application
            </CommandItem>
            <CommandItem onSelect={() => go("/applications")}>
              <Mail className="h-4 w-4 text-primary" />
              Draft a cover letter
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
            {NAV_PRIMARY.map((item) => (
              <CommandItem key={item.label} onSelect={() => go(item.to)}>
                <item.icon className="h-4 w-4" />
                Open {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Search">
            <CommandItem onSelect={() => go("/jobs")}>
              <Search className="h-4 w-4" />
              Search jobs
            </CommandItem>
            <CommandItem onSelect={() => go("/jobs/collections")}>
              <Building2 className="h-4 w-4" />
              Browse collections
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Account">
            <CommandItem onSelect={() => go("/profile")}>
              <User className="h-4 w-4" />
              Open profile
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
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-all duration-200",
        active
          ? "bg-[image:linear-gradient(90deg,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_20%,transparent)]"
          : "text-muted-foreground hover:bg-elevated/70 hover:text-foreground hover:translate-x-[1px]",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-[image:var(--gradient-primary)] shadow-[0_0_12px_2px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active && "text-primary")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
