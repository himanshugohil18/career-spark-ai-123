import type { CareerBrainSnapshot } from "@/lib/career-brain.service";

export type NodeKind = "user" | "skill" | "role" | "gap";

export type GraphNode = {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel?: string;
  strength: number; // 0..1, drives size + glow
  hollow?: boolean; // dashed hollow (missing / gap)
  data: Record<string, unknown>;
};

export type EvidenceItem = { title: string; subtitle?: string };

const MAX_SKILLS = 26;
const MAX_ROLES = 6;
const MAX_GAPS = 10;

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Builds the capped node set for the Career Brain graph from the snapshot. */
export function buildGraphNodes(snapshot: CareerBrainSnapshot): GraphNode[] {
  const nodes: GraphNode[] = [];

  nodes.push({
    id: "user",
    kind: "user",
    label: snapshot.identity.fullName ?? "You",
    sublabel: snapshot.identity.currentTitle ?? undefined,
    strength: 1,
    data: { snapshot },
  });

  const skills = [...snapshot.skills]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, MAX_SKILLS);
  for (const s of skills) {
    nodes.push({
      id: `skill:${s.name}`,
      kind: "skill",
      label: s.name,
      sublabel: s.category,
      strength: clamp01((s.confidence ?? 50) / 100),
      data: { skill: s },
    });
  }

  const roles = (snapshot.brain?.preferred_roles as string[] | undefined) ?? [];
  const primaryRole = snapshot.identity.preferences.preferredRole;
  const roleSet = new Set<string>();
  if (primaryRole) roleSet.add(primaryRole);
  for (const r of roles) roleSet.add(r);
  [...roleSet].slice(0, MAX_ROLES).forEach((r, i) => {
    nodes.push({
      id: `role:${r}`,
      kind: "role",
      label: r,
      sublabel: r === primaryRole ? "Primary target" : "Target role",
      strength: r === primaryRole ? 1 : 0.7 - i * 0.05,
      data: { role: r, isPrimary: r === primaryRole },
    });
  });

  const gapSources: Array<{ name: string; source: string }> = [];
  const weaknesses = (snapshot.brain?.weaknesses as string[] | undefined) ?? [];
  const growth = (snapshot.brain?.growth_areas as string[] | undefined) ?? [];
  const learning = (snapshot.brain?.learning_priorities as string[] | undefined) ?? [];
  for (const w of weaknesses) gapSources.push({ name: w, source: "Weakness" });
  for (const g of growth) gapSources.push({ name: g, source: "Growth area" });
  for (const l of learning) gapSources.push({ name: l, source: "Learning priority" });

  const seenGap = new Set<string>();
  for (const g of gapSources) {
    const key = g.name.trim().toLowerCase();
    if (!key || seenGap.has(key)) continue;
    seenGap.add(key);
    if (seenGap.size > MAX_GAPS) break;
    nodes.push({
      id: `gap:${g.name}`,
      kind: "gap",
      label: g.name,
      sublabel: g.source,
      strength: 0.4,
      hollow: true,
      data: { gap: g },
    });
  }

  return nodes;
}

/** Honest, evidence-only lookups for the detail panel — no fabricated data. */
export function findSkillEvidence(
  snapshot: CareerBrainSnapshot,
  skillName: string,
): EvidenceItem[] {
  const needle = skillName.trim().toLowerCase();
  if (!needle) return [];
  const items: EvidenceItem[] = [];

  for (const exp of snapshot.experiences as Array<Record<string, unknown>>) {
    const tech = (exp.technologies as string[] | null) ?? [];
    if (tech.some((t) => String(t).toLowerCase() === needle)) {
      items.push({
        title: String(exp.role ?? "Experience"),
        subtitle: String(exp.company ?? ""),
      });
    }
  }

  for (const proj of snapshot.projects as Array<Record<string, unknown>>) {
    const tech = (proj.technologies as string[] | null) ?? [];
    if (tech.some((t) => String(t).toLowerCase() === needle)) {
      items.push({
        title: String(proj.name ?? "Project"),
        subtitle: "Project",
      });
    }
  }

  return items;
}
