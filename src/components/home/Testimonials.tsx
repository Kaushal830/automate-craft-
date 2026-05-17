"use client";

/*
 * Testimonials — EMPTY UNTIL REAL USERS PROVIDE QUOTES.
 *
 * HOW TO ADD A REAL TESTIMONIAL:
 * 1. Get explicit permission from the user (email, DM screenshot, or written consent)
 * 2. Use their real first name and last initial (e.g., "Amit T.")
 * 3. Use their real job title
 * 4. Use their real company name (or "their company" if they prefer anonymity)
 * 5. Use their EXACT words — do NOT rewrite their quote
 * 6. If they gave a rating or metric, include it verbatim
 * 7. Set `verified: true` only if you have saved proof of permission
 *
 * Example of a GOOD entry:
 * {
 *   quote: "I set up a lead routing automation in 2 minutes. Genuinely surprised.",
 *   name: "Amit T.",
 *   role: "Founder",
 *   company: "BrightSync",
 *   verified: true,
 * }
 *
 * MINIMUM: Show this section only when you have 2+ real testimonials.
 * Until then, this component renders nothing.
 */

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  verified: boolean;
};

// Add real testimonials here when you have them:
const testimonials: Testimonial[] = [
  // EMPTY — no fabricated quotes. Populate with real user feedback.
];

export default function Testimonials() {
  // Don't render anything until we have at least 2 real testimonials
  if (testimonials.length < 2) {
    return null;
  }

  // When real testimonials exist, render them:
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            What our users say
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
            >
              <p className="text-[13px] leading-[1.7] text-white/45">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-[13px] font-semibold text-white/60">{testimonial.name}</p>
                <p className="text-[11px] text-white/25 mt-0.5">
                  {testimonial.role} · {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
