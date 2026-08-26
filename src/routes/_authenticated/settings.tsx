import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
  KeyRound,
  Monitor,
  Camera,
  Loader2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { getCareerBrainSnapshot } from "@/lib/career-brain.service";
import { regenerateCareerBrain } from "@/lib/resume.functions";
import { updateProfilePrefs } from "@/lib/career-intel.functions";
import { getWorkspace, updateProfile } from "@/lib/profile.functions";
import {
  listLoginEvents,
  signOutEverywhere,
  getAvatarUrl,
} from "@/lib/account.functions";
import { PageHeader, PageShell } from "@/components/product/page-header";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · CareerOS" }] }),
  component: SettingsPage,
});

type SettingsTab = "account" | "appearance" | "security" | "preferences";

const TABS: { key: SettingsTab; label: string; description: string; icon: typeof UserIcon }[] = [
  { key: "account", label: "Account", description: "Profile, avatar & session", icon: UserIcon },
  { key: "appearance", label: "Appearance", description: "Classic or Immersive experience", icon: Monitor },
  { key: "security", label: "Security", description: "Password, email & sign-ins", icon: ShieldCheck },
  { key: "preferences", label: "Preferences", description: "Job ranking & Career Brain", icon: Sparkles },
];

function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>("account");
  const { data: brain } = useQuery({
    queryKey: ["career-brain"],
    queryFn: () => getCareerBrainSnapshot(),
  });
  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => getWorkspace(),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <PageShell width="wide">
      <PageHeader
        eyebrow="Settings"
        title="Account & preferences"
        description="Manage your identity, security, and how CareerOS ranks opportunities for you."
      />

      <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Section nav */}
        <nav className="flex gap-1 overflow-x-auto md:sticky md:top-24 md:flex-col md:self-start">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors md:w-full",
                tab === t.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className={cn("h-4 w-4 shrink-0", tab === t.key && "text-primary")} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="hidden truncate text-[11px] text-muted-foreground md:block">{t.description}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "account" && (
            <AccountSection profile={workspace?.profile ?? null} onSignOut={signOut} />
          )}
          {tab === "appearance" && (
            <SettingsSection
              icon={Monitor}
              title="Appearance"
              description="Choose your CareerOS experience. This is a complete visual system — not just a color mode — and it applies across the homepage, dashboard, and every workspace page."
            >
              <ThemeSwitcher />
              <p className="meta-text mt-4 leading-relaxed">
                Your selection is saved on this device and restored automatically on your next visit.
              </p>
            </SettingsSection>
          )}
          {tab === "security" && <SecuritySection />}
          {tab === "preferences" && <PreferencesSection brain={brain} />}
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------ Shared section shell ------------------------ */

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  actions,
}: {
  icon?: typeof UserIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="surface-card p-6 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="section-title">{title}</h2>
            {description && <p className="meta-text mt-1 max-w-lg leading-relaxed">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/* ------------------------ Account ------------------------ */

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
} | null;

function AccountSection({
  profile,
  onSignOut,
}: {
  profile: ProfileRow;
  onSignOut: () => void;
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setLocation(profile?.location ?? "");
  }, [profile]);

  const { data: signed } = useQuery({
    queryKey: ["avatar-signed", profile?.avatar_url],
    queryFn: () => getAvatarUrl({ data: { path: profile!.avatar_url! } }),
    enabled: Boolean(profile?.avatar_url),
  });

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        data: {
          full_name: fullName || null,
          phone: phone || null,
          location: location || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      void qc.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${u.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      await updateProfile({ data: { avatar_url: path } });
      return path;
    },
    onSuccess: () => {
      toast.success("Avatar updated");
      setAvatarPreview(null);
      void qc.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3MB");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    uploadAvatar.mutate(file);
  }

  const initials = (fullName || profile?.email || "?")
    .split(/\s+|@/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <>
      <SettingsSection
        icon={UserIcon}
        title="Profile"
        description="Your name and contact details, used across applications and outreach."
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border border-border">
                <AvatarImage
                  src={avatarPreview ?? signed?.url ?? undefined}
                  alt={fullName || "avatar"}
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-colors hover:text-primary"
                aria-label="Upload avatar"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">JPG/PNG · max 3MB</p>
          </div>

          <div className="grid flex-1 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fn">Full name</Label>
              <Input
                id="fn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="em">Email</Label>
              <Input id="em" value={profile?.email ?? ""} disabled />
              <p className="text-[11px] text-muted-foreground">
                To change your email, use Security → Change email.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="ph">Phone</Label>
                <Input
                  id="ph"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lo">Location</Label>
                <Input
                  id="lo"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              variant="primary"
              className="w-fit"
            >
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={LogOut}
        title="Session"
        description="Sign out of CareerOS on this device. Your data stays saved."
      >
        <Button variant="outline" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </SettingsSection>
    </>
  );
}

/* ------------------------ Security ------------------------ */

function SecuritySection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const { data: events, refetch } = useQuery({
    queryKey: ["login-events"],
    queryFn: () => listLoginEvents(),
  });

  const changePw = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeEmail = useMutation({
    mutationFn: async () => {
      if (!newEmail.includes("@")) throw new Error("Invalid email");
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/settings` },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Confirmation link sent to your new email");
      setNewEmail("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signOutAll = useMutation({
    mutationFn: () => signOutEverywhere(),
    onSuccess: async () => {
      toast.success("Signed out everywhere");
      await supabase.auth.signOut();
      window.location.href = "/auth";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SettingsSection
        icon={KeyRound}
        title="Change password"
        description="Use at least 8 characters. You'll stay signed in on this device."
      >
        <div className="grid gap-3 sm:max-w-md">
          <div className="grid gap-1.5">
            <Label htmlFor="np">New password</Label>
            <Input
              id="np"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp">Confirm password</Label>
            <Input
              id="cp"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={() => changePw.mutate()}
            disabled={changePw.isPending || !newPassword}
            variant="primary"
            className="w-fit"
          >
            {changePw.isPending ? "Updating…" : "Update password"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={ShieldCheck}
        title="Change email"
        description="We'll send a confirmation link to the new address before switching."
      >
        <div className="grid gap-3 sm:max-w-md">
          <div className="grid gap-1.5">
            <Label htmlFor="ne">New email address</Label>
            <Input
              id="ne"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button
            onClick={() => changeEmail.mutate()}
            disabled={changeEmail.isPending || !newEmail}
            variant="outline"
            className="w-fit"
          >
            {changeEmail.isPending ? "Sending…" : "Send confirmation"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Monitor}
        title="Login activity"
        description="Your last 25 sign-in events. If anything looks unfamiliar, sign out everywhere and change your password."
      >
        <div className="divide-y divide-border rounded-xl border border-border">
          {(events ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            (events ?? []).map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col gap-1 p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium capitalize">
                    {ev.event_type.replace(/_/g, " ")}
                    {ev.provider ? (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {ev.provider}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {truncateUA(ev.user_agent)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => signOutAll.mutate()}
            disabled={signOutAll.isPending}
          >
            {signOutAll.isPending ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </div>
      </SettingsSection>
    </>
  );
}

function truncateUA(ua: string | null): string {
  if (!ua) return "Unknown device";
  const m = ua.match(/\((?<os>[^)]+)\).*?(?<br>(Chrome|Safari|Firefox|Edg)\/[\d.]+)/);
  if (m?.groups?.os && m.groups.br) return `${m.groups.br} · ${m.groups.os}`;
  return ua.slice(0, 80);
}

/* ------------------------ Preferences ------------------------ */

function PreferencesSection({
  brain,
}: {
  brain: Awaited<ReturnType<typeof getCareerBrainSnapshot>> | undefined;
}) {
  const qc = useQueryClient();
  const [preferredRole, setPreferredRole] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");

  useEffect(() => {
    if (!brain) return;
    setPreferredRole(brain.identity.preferences.preferredRole ?? "");
    setPreferredLocation(brain.identity.preferences.preferredLocation ?? "");
    setExpectedSalary(brain.identity.preferences.expectedSalary ?? "");
  }, [brain]);

  const save = useMutation({
    mutationFn: () =>
      updateProfilePrefs({
        data: {
          preferred_role: preferredRole || null,
          preferred_location: preferredLocation || null,
          expected_salary: expectedSalary || null,
        },
      }),
    onSuccess: () => {
      toast.success("Preferences saved. Feed re-ranking on your next visit.");
      void qc.invalidateQueries({ queryKey: ["career-brain"] });
      void qc.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const regen = useMutation({
    mutationFn: () => regenerateCareerBrain(),
    onSuccess: () => {
      toast.success("Career Brain regenerated from your active resume.");
      void qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SettingsSection
        icon={Sparkles}
        title="Ranking preferences"
        description="These steer how the matching engine scores and orders jobs in your feed."
      >
        <div className="grid gap-4 sm:max-w-lg">
          <div className="grid gap-1.5">
            <Label htmlFor="pr">Preferred role</Label>
            <Input
              id="pr"
              value={preferredRole}
              onChange={(e) => setPreferredRole(e.target.value)}
              placeholder="e.g. Senior DevOps Engineer"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pl">Preferred location</Label>
            <Input
              id="pl"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="e.g. Remote (US), Berlin"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="es">Expected salary</Label>
            <Input
              id="es"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value)}
              placeholder="e.g. 180000"
            />
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-fit"
            variant="primary"
          >
            {save.isPending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Brain}
        title="Career Brain"
        description="The AI model of your career that powers matching, applications and coaching."
      >
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Brain version</dt>
            <dd className="font-semibold">v{brain?.metadata.brainVersion ?? "—"}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Resume version</dt>
            <dd className="font-semibold">v{brain?.metadata.resumeVersion ?? "—"}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">Last analyzed</dt>
            <dd className="font-semibold">
              {brain?.metadata.lastGeneratedAt
                ? new Date(brain.metadata.lastGeneratedAt).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-muted-foreground">AI model</dt>
            <dd className="font-semibold">{brain?.metadata.aiModel ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={regen.isPending}
            onClick={() => regen.mutate()}
          >
            {regen.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Regenerating…
              </>
            ) : (
              "Regenerate from active resume"
            )}
          </Button>
          <Link
            to="/profile"
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Manage Career Brain →
          </Link>
        </div>
      </SettingsSection>
    </>
  );
}
