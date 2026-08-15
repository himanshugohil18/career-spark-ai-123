import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { RouteProgress } from "@/components/motion/route-progress";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The route you're looking for doesn't exist in this workspace.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Back to CareerOS
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-danger">
          Something interrupted
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          This page didn't load
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A workspace agent encountered an unexpected error. You can retry or
          return home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-elevated px-5 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CareerOS – AI Career Operating System" },
      {
        name: "description",
        content:
          "CareerOS is an AI-powered platform for resume optimization, job discovery, interview preparation, career planning, and application management.",
      },
      { name: "google-site-verification", content: "3VPdRr9PdIwDlfyWDzxPbM9sbgpJpiwTojUJe9yV75o" },
      { name: "author", content: "CareerOS" },
      { name: "application-name", content: "CareerOS" },
      { name: "apple-mobile-web-app-title", content: "CareerOS" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#1E1E1E" },

      { property: "og:site_name", content: "CareerOS" },
      { property: "og:title", content: "CareerOS – AI Career Operating System" },
      {
        property: "og:description",
        content:
          "CareerOS is an AI-powered platform for resume optimization, job discovery, interview preparation, career planning, and application management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CareerOS – AI Career Operating System" },
      {
        name: "twitter:description",
        content:
          "CareerOS is an AI-powered platform for resume optimization, job discovery, interview preparation, career planning, and application management.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/6c6f6991-7b80-435f-9448-458a3f3f8650" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/6c6f6991-7b80-435f-9448-458a3f3f8650" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico?v=3", sizes: "any" },
      { rel: "icon", type: "image/x-icon", sizes: "32x32", href: "/favicon.ico?v=3" },
      { rel: "icon", type: "image/x-icon", sizes: "16x16", href: "/favicon.ico?v=3" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=3" },

      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Google+Sans+Display:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event !== "SIGNED_IN" &&
        event !== "SIGNED_OUT" &&
        event !== "USER_UPDATED"
      )
        return;
      if (event === "SIGNED_IN" && session) {
        const key = `login-logged:${session.user.id}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          const provider = (session.user.app_metadata?.provider as string | undefined) ?? "email";
          void import("@/lib/account.functions").then(({ recordLoginEvent }) =>
            recordLoginEvent({
              data: {
                event_type: "sign_in",
                provider,
                user_agent: navigator.userAgent.slice(0, 500),
              },
            }).catch(() => {}),
          );
        }
      }
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);


  return (
    <QueryClientProvider client={queryClient}>
      <RouteProgress />
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
