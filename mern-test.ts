/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { buildCandidateProfile } from "@/lib/jobs/role-synonyms";
import { computeRelevance, jobDedupeKey } from "@/lib/jobs/relevance";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const profile = buildCandidateProfile({
  preferredRole: "MERN Stack Developer", currentTitle: "Full Stack Developer", yearsOfExperience: 2,
  skills: ["React","Node.js","Express.js","MongoDB","JavaScript","TypeScript","Redux","REST API","HTML","CSS","Tailwind CSS","Next.js","Git","JWT"],
  projectTechs: ["React","Node.js","MongoDB","Express","Socket.io"], preferredLocation: "Remote",
});
const techs = ["React","Node.js","Express","MongoDB","JavaScript","TypeScript","Next.js","Redux","HTML","CSS","Tailwind","REST","Git"];
let all: any[] = [];
for (let p = 0; p < 5; p++) {
  const { data } = await supabase.from("jobs")
    .select("id,title,description,required_skills,preferred_skills,company:companies(name)")
    .eq("is_active", true).range(p * 1000, p * 1000 + 999);
  if (!data?.length) break;
  all = all.concat(data);
}
const seen = new Set<string>();
const passed = all.map((j: any) => ({
  title: j.title, company: j.company?.name ?? "",
  ...computeRelevance({ title: j.title, description: j.description, requiredSkills: j.required_skills ?? [], preferredSkills: j.preferred_skills ?? [] }, profile, techs),
})).filter((s) => s.gate).sort((a, b) => b.relevance - a.relevance)
  .filter((s) => { const k = jobDedupeKey(s.title, s.company); if (seen.has(k)) return false; seen.add(k); return true; });
console.log(JSON.stringify({ pool: all.length, passedGate: passed.length,
  top20: passed.slice(0, 20).map((p) => ({ t: p.title, c: p.company, rel: +p.relevance.toFixed(2) })) }, null, 2));
