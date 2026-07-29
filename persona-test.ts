import { buildCandidateProfile } from "./src/lib/jobs/role-synonyms";
import { computeRelevance } from "./src/lib/jobs/relevance";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
const personas = [
  { name: "DevOps Engineer", role: "DevOps Engineer", skills: ["AWS","Kubernetes","Docker","Terraform","Jenkins","Linux","CI/CD","Ansible","Prometheus","Grafana","Python","Bash"], yrs: 3 },
  { name: "MERN Stack Developer", role: "MERN Stack Developer", skills: ["React","Node.js","Express","MongoDB","JavaScript","TypeScript","Next.js","Redux","REST API","HTML","CSS","Tailwind"], yrs: 2 },
  { name: "Data Analyst", role: "Data Analyst", skills: ["SQL","Excel","Power BI","Tableau","Python","Pandas","Statistics","Data Visualization","ETL","Dashboard","Reporting"], yrs: 2 },
  { name: "AI Engineer", role: "AI Engineer", skills: ["Python","PyTorch","TensorFlow","LLM","LangChain","RAG","NLP","Hugging Face","Vector DB","Machine Learning"], yrs: 3 },
  { name: "Business Analyst", role: "Business Analyst", skills: ["Requirement Gathering","SQL","Excel","JIRA","Stakeholder Management","Business Process","Agile","BRD","Gap Analysis","User Stories"], yrs: 3 },
  { name: "Accountant", role: "Accountant", skills: ["Tally","GST","Bookkeeping","Accounts Payable","Taxation","Financial Reporting","Excel","Bank Reconciliation","TDS"], yrs: 3 },
  { name: "Project Manager", role: "Project Manager", skills: ["Agile","Scrum","JIRA","Stakeholder Management","Roadmap","Budgeting","Risk Management","Sprint Planning","PMP"], yrs: 5 },
];
const { data: jobs, error } = await sb.from("jobs").select("id,title,location,remote_status,required_skills,preferred_skills,description,responsibilities,requirements,companies(name)").eq("is_active", true).limit(1000);
if (error) throw error;
console.log("Sample jobs:", jobs!.length);
for (const p of personas) {
  const profile = buildCandidateProfile({ preferredRole: p.role, currentTitle: p.role, skills: p.skills, yearsOfExperience: p.yrs, location: "Ahmedabad, India", preferredLocation: "India" });
  const techs = p.skills.map((s) => s.toLowerCase());
  const scored = jobs!.map((j: any) => ({ j, r: computeRelevance({ title: j.title, description: j.description, requiredSkills: j.required_skills, preferredSkills: j.preferred_skills, responsibilities: j.responsibilities, requirements: j.requirements } as any, profile, techs) }));
  const passed = scored.filter((s) => s.r.gate).sort((a, b) => b.r.relevance - a.r.relevance);
  console.log(`\n=== ${p.name} === primary=${profile.primaryLabel} families=[${profile.familyLabels.join(", ")}] passed=${passed.length} vetoed=${scored.filter(s=>s.r.vetoed).length}`);
  console.log("  queries:", profile.roleQueries.slice(0,6).join(" | "));
  passed.slice(0, 8).forEach((s, i) => console.log(`  ${i+1}. ${Math.round(s.r.relevance*100)}% | ${s.j.title} @ ${s.j.companies?.name ?? "?"}`));
}
