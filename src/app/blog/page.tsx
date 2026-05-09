import type { Metadata } from "next";
import PageIntro from "@/components/PageIntro";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — AutomateCraft",
  description: "Tutorials, guides, and updates from the AutomateCraft team.",
};

const posts = [
  {
    slug: "how-to-automate-lead-routing",
    title: "How to automate lead routing in 90 seconds",
    excerpt: "Leads from forms go cold waiting for manual assignment. Here's how to fix that with a single automation.",
    date: "May 6, 2026",
    tag: "Tutorial",
  },
  {
    slug: "five-automations-every-startup-needs",
    title: "5 automations every startup should set up on day one",
    excerpt: "Invoice sync, lead routing, customer welcome emails, Slack alerts, and weekly reports — all in under 15 minutes.",
    date: "May 2, 2026",
    tag: "Guide",
  },
  {
    slug: "what-are-logs",
    title: "What are automation logs and why they matter",
    excerpt: "Understanding how logs help you debug, monitor, and trust your automated workflows.",
    date: "April 28, 2026",
    tag: "Product",
  },
];

export default function BlogIndex() {
  return (
    <>
      <PageIntro eyebrow="Blog" title="Tutorials, guides & updates" description="Learn how to build better automations, faster." />
      <section className="site-container pb-28">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.04]">
              <span className="inline-flex w-fit rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-accent">{post.tag}</span>
              <h3 className="mt-4 text-[16px] font-semibold leading-snug text-white/80 group-hover:text-white transition-colors">{post.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-white/35">{post.excerpt}</p>
              <div className="mt-auto pt-5 flex items-center justify-between">
                <span className="text-[11px] text-white/20">{post.date}</span>
                <span className="text-[12px] font-semibold text-accent/60 group-hover:text-accent transition-colors flex items-center gap-1">
                  Read <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
