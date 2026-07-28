import { createClient } from "@supabase/supabase-js";
import { runDiscovery } from "@/lib/jobs/discovery.server";
import { buildCandidateProfile } from "@/lib/jobs/role-synonyms";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const profile = buildCandidateProfile({
  preferredRole: "MERN Stack Developer",
  currentTitle: "Full Stack Developer",
  yearsOfExperience: 2,
  skills: ["React","Node.js","Express","MongoDB","JavaScript","TypeScript","Next.js","Redux","HTML","CSS","Tailwind"],
  preferredLocation: "Remote",
});
console.log("queries:", profile.roleQueries);
const stats = await runDiscovery(supabase as any, { candidateProfile: profile });
console.log(JSON.stringify({ fetched: stats.fetched, inserted: stats.inserted, dupes: stats.duplicatesMerged, excluded: stats.filteredExcluded, perProvider: stats.perProvider.map(p=>({p:p.provider,f:p.fetched,k:p.kept})), errors: stats.errors }, null, 2));
