/**
 * Client-side subscription/feature-gating hook.
 * Server code should re-check via getMySubscription() before granting access.
 */
import { useQuery } from "@tanstack/react-query";
import { getMySubscription } from "@/lib/billing.functions";
import type { PlanId } from "@/lib/billing/plans";

export function useSubscription() {
  const q = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => getMySubscription(),
    staleTime: 60_000,
  });
  const plan = (q.data?.plan ?? "free") as PlanId;
  return {
    plan,
    isPremium: Boolean(q.data?.isPremium),
    isPro: plan === "pro",
    isEnterprise: plan === "enterprise",
    subscription: q.data?.subscription ?? null,
    loading: q.isLoading,
  };
}
