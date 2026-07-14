import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "JobPilot — Your AI job-search copilot",
  description:
    "Upload your resume, get an ATS score, and let JobPilot surface the freshest matching jobs across the web — then apply, email recruiters, or auto-prep tailored applications. Built for Indian job seekers.",
  keywords: ["job search", "ATS score", "AI resume", "Naukri", "LinkedIn", "India jobs"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111018" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
