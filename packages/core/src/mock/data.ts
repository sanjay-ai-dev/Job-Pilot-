import type { JobSourceId, NormalizedJob, SavedSearchQuery } from "../types";
import { dedupeHash } from "../util";

/** Deterministic-ish PRNG so seeds are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

export const COMPANIES = [
  "Razorpay", "CRED", "Zomato", "Swiggy", "PhonePe", "Meesho", "Groww",
  "Postman", "Freshworks", "Zoho", "InMobi", "Dream11", "Sarvam AI",
  "Krutrim", "Rapido", "Urban Company", "Navi", "Slice", "Jupiter",
  "Turing", "BrowserStack", "Hasura", "Chargebee", "Atlassian India",
];

const ROLE_TEMPLATES: Record<string, { titles: string[]; skills: string[]; salary: [number, number] }> = {
  "ai engineer": {
    titles: ["AI Engineer", "Senior AI Engineer", "ML Engineer", "GenAI Engineer", "Applied AI Engineer"],
    skills: ["Python", "PyTorch", "LLMs", "RAG", "LangChain", "Vector DBs", "Prompt Engineering", "FastAPI"],
    salary: [18, 55],
  },
  "full stack developer": {
    titles: ["Full Stack Engineer", "SDE II", "Senior Full Stack Developer", "Product Engineer"],
    skills: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "AWS", "GraphQL", "Tailwind"],
    salary: [12, 42],
  },
  "backend engineer": {
    titles: ["Backend Engineer", "SDE II — Backend", "Senior Backend Engineer", "Platform Engineer"],
    skills: ["Go", "Java", "Kubernetes", "PostgreSQL", "Kafka", "gRPC", "Redis", "System Design"],
    salary: [14, 48],
  },
  "data scientist": {
    titles: ["Data Scientist", "Senior Data Scientist", "Applied Scientist", "ML Scientist"],
    skills: ["Python", "SQL", "Statistics", "scikit-learn", "Experimentation", "Pandas", "Airflow"],
    salary: [16, 50],
  },
  "product manager": {
    titles: ["Product Manager", "Senior Product Manager", "Group PM", "Associate PM"],
    skills: ["Roadmapping", "Analytics", "SQL", "User Research", "A/B Testing", "Stakeholder Mgmt"],
    salary: [20, 60],
  },
  "frontend engineer": {
    titles: ["Frontend Engineer", "SDE II — Frontend", "Senior Frontend Engineer", "UI Engineer"],
    skills: ["React", "TypeScript", "Next.js", "CSS", "Accessibility", "Performance", "Redux"],
    salary: [12, 40],
  },
};

const CITIES = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Mumbai", "Chennai", "Noida", "Remote"];

function templateFor(roleQuery: string) {
  const q = roleQuery.toLowerCase();
  for (const key of Object.keys(ROLE_TEMPLATES)) {
    if (q.includes(key.split(" ")[0]!) || key.includes(q.split(" ")[0]!)) return ROLE_TEMPLATES[key]!;
  }
  return ROLE_TEMPLATES["full stack developer"]!;
}

function jd(title: string, company: string, skills: string[]): string {
  return [
    `${company} is hiring a ${title} to join a high-ownership team shipping to millions of users.`,
    `You'll work across the stack with ${skills.slice(0, 4).join(", ")} and partner closely with product & design.`,
    `Requirements: strong fundamentals, ${skills.slice(0, 3).join("/")} experience, and a bias for shipping.`,
    `Nice to have: ${skills.slice(4).join(", ")}. We offer competitive comp, ESOPs, and a fast growth path.`,
  ].join(" ");
}

/**
 * Generate normalized jobs for a query. `sourceMix` lets us simulate the same
 * job appearing from two sources to exercise dedupe.
 */
export function generateJobs(
  q: SavedSearchQuery,
  opts: { count?: number; source?: JobSourceId; seed?: number; withinHours?: number } = {},
): NormalizedJob[] {
  const { count = 18, source = "jsearch", seed = 42, withinHours = 24 * 21 } = opts;
  const rng = mulberry32(seed + q.roleQuery.length + count);
  const tpl = templateFor(q.roleQuery);
  const locations = q.locations.length ? q.locations : CITIES;
  const now = Date.now();
  const out: NormalizedJob[] = [];

  for (let i = 0; i < count; i++) {
    const title = pick(rng, tpl.titles);
    const company = pick(rng, COMPANIES);
    const city = q.remoteOk && rng() < 0.25 ? "Remote" : pick(rng, locations);
    const remote = city === "Remote" || rng() < 0.2;
    const skills = [...tpl.skills].sort(() => rng() - 0.5);
    const hasSalary = rng() < 0.7;
    const min = tpl.salary[0] + Math.floor(rng() * 6);
    const max = min + 6 + Math.floor(rng() * 14);
    // Spread posts across the window, weighted toward recent.
    const ageHours = Math.floor(Math.pow(rng(), 1.8) * withinHours);
    const postedAt = new Date(now - ageHours * 3.6e6).toISOString();

    out.push({
      dedupeHash: dedupeHash(company, title, city),
      source,
      sourceJobId: `${source}-${seed}-${i}`,
      title,
      company,
      locations: [city],
      remote,
      description: jd(title, company, skills),
      salaryMinLpa: hasSalary ? min : null,
      salaryMaxLpa: hasSalary ? max : null,
      applyUrl: `https://jobs.example.com/${source}/${company.toLowerCase().replace(/\s+/g, "-")}/${i}`,
      postedAt,
      meta: { postedAtEstimated: ageHours > withinHours * 0.9, skills },
    });
  }
  return out;
}

/** A realistic sample resume used for the demo ATS flow. */
export const SAMPLE_RESUME_TEXT = `PRIYA SHARMA
AI / Full Stack Engineer — Bengaluru
priya.sharma@email.com | +91 98xxxxxx10

SUMMARY
Full stack engineer with 4 years building AI-powered products. Shipped RAG
systems and Next.js apps serving 500k+ users.

EXPERIENCE
Senior Software Engineer, Fintech Startup (2022–Present)
- Built a RAG assistant on Claude + pgvector cutting support tickets 32%.
- Led migration to Next.js 14 App Router, improving LCP from 3.1s to 1.2s.
Software Engineer, SaaS Co (2020–2022)
- Owned billing service (Node/PostgreSQL) processing ₹4Cr/mo.

SKILLS
Python, TypeScript, React, Next.js, Node.js, PostgreSQL, pgvector, LLMs, RAG, AWS

EDUCATION
B.Tech Computer Science, VIT (2020)`;
