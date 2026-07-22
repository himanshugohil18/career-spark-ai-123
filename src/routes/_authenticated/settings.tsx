import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
  KeyRound,
  Monitor,
  Camera,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ThemePicker } from "@/components/settings/theme-picker";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · CareerOS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
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
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6 md:p-10">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Account & preferences
        </h1>
      </header>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account" className="gap-2">
            <UserIcon className="h-4 w-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Sparkles className="h-4 w-4" /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6 space-y-6">
          <AccountSection
            profile={workspace?.profile ?? null}
            onSignOut={signOut}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-6">
          <SecuritySection />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6 space-y-6">
          <PreferencesSection brain={brain} />
        </TabsContent>
      </Tabs>
    </div>
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
      <section className="surface-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Profile
          </p>
        </div>

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
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition hover:bg-accent"
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
      </section>

      <section className="surface-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Session
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign out of this device.
        </p>
        <Button variant="outline" size="sm" onClick={onSignOut} className="mt-3">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </section>
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
      <section className="surface-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Change password
          </p>
        </div>
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
      </section>

      <section className="surface-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Change email
        </p>
        <div className="mt-3 grid gap-3 sm:max-w-md">
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
          <p className="text-[11px] text-muted-foreground">
            You'll receive a confirmation link at the new address.
          </p>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Login activity
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Your last 25 sign-in events. If anything looks unfamiliar, sign out
          everywhere and change your password.
        </p>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(events ?? []).length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            (events ?? []).map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
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
      </section>
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
      <ThemePicker />

      <section className="surface-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Ranking preferences
          </p>
        </div>
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
      </section>

      <section className="surface-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Career Brain
        </p>
        <div className="mt-2 grid gap-1 text-sm">
          <p>
            <span className="text-muted-foreground">Brain version</span> · v
            {brain?.metadata.brainVersion ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Resume version</span> · v
            {brain?.metadata.resumeVersion ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Last analyzed</span> ·{" "}
            {brain?.metadata.lastGeneratedAt
              ? new Date(brain.metadata.lastGeneratedAt).toLocaleString()
              : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">AI model</span> ·{" "}
            {brain?.metadata.aiModel ?? "—"}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Manage Career Brain →
          </Link>
        </div>
      </section>
    </>
  );
}
