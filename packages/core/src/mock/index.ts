import { ResumeProfileSchema, type ResumeProfile } from "../types";
export { generateJobs, SAMPLE_RESUME_TEXT, COMPANIES } from "./data";

/** The parsed profile behind the demo resume (offline stand-in for §6.2). */
export const SAMPLE_PROFILE: ResumeProfile = ResumeProfileSchema.parse({
  name: "Priya Sharma",
  email: "priya.sharma@email.com",
  phone: "+91 98xxxxxx10",
  headline: "AI / Full Stack Engineer",
  total_experience_years: 4,
  skills: ["Python", "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "pgvector", "LLMs", "RAG", "AWS"],
  tools: ["Docker", "GitHub Actions", "Vercel"],
  roles: [
    {
      title: "Senior Software Engineer",
      company: "Fintech Startup",
      start: "2022",
      end: "Present",
      achievements: [
        "Built a RAG assistant on Claude + pgvector cutting support tickets 32%.",
        "Led migration to Next.js 14 App Router, improving LCP from 3.1s to 1.2s.",
      ],
    },
    {
      title: "Software Engineer",
      company: "SaaS Co",
      start: "2020",
      end: "2022",
      achievements: ["Owned billing service (Node/PostgreSQL) processing ₹4Cr/mo."],
    },
  ],
  education: ["B.Tech Computer Science, VIT (2020)"],
  certifications: [],
  projects: [],
});
